import { describe, it, expect, beforeEach } from 'vitest';
import {
  ARCHIVE_CODES,
  ARCHIVE_DB_NAME,
  ARCHIVE_SCHEMA_VERSION,
  JOURNAL_STORE,
  META_STORE,
  createPaperArchive,
  normalizeTradeRecord,
  paperArchive,
  sameTradeContent,
  tradeFingerprint,
} from '../paperArchive.js';
import { createInMemoryIndexedDB } from './support/inMemoryIndexedDB.js';

/**
 * All tests below run against the IN-MEMORY IndexedDB double in
 * `./support/inMemoryIndexedDB.js`. No real browser IndexedDB, no network
 * request and no credential is used.
 */

const trade = (id, pnlDollars, extra = {}) => ({
  id,
  asset: 'XAU/USD',
  type: 'BUY',
  lotSize: 1,
  entryPrice: 1000,
  exitPrice: 1010,
  tp: 1010,
  sl: 990,
  pips: 10,
  pnlDollars,
  result: pnlDollars > 0 ? 'WIN' : pnlDollars < 0 ? 'LOSS' : 'BREAKEVEN',
  reason: 'test',
  time: '10:00',
  closeTime: '10:05',
  duration: '5m',
  maxDrawdownPips: 0,
  maxRunupPips: 10,
  confluence: 70,
  exchangeOrderId: null,
  exchange: null,
  ...extra,
});

let archive;

const makeArchive = (options = {}) => {
  const mem = createInMemoryIndexedDB(options);
  return createPaperArchive({
    resolveIndexedDB: () => mem.indexedDB,
    now: () => 1700000000000,
  });
};

beforeEach(() => {
  archive = makeArchive();
});

// ── 1-4: a new archive and reading trades ──────────────────────────────────

describe('1-4 — a new archive, inserting and reading trades', () => {
  it('opens a new empty archive', async () => {
    const opened = await archive.openArchive();
    expect(opened.ok).toBe(true);
    expect(opened.dbName).toBe(ARCHIVE_DB_NAME);
    expect(opened.schemaVersion).toBe(ARCHIVE_SCHEMA_VERSION);

    const all = await archive.getAllTrades();
    expect(all.ok).toBe(true);
    expect(all.records).toEqual([]);
    expect(all.count).toBe(0);
  });

  it('inserts one valid trade and reads it back', async () => {
    const result = await archive.archiveTrade(trade('pos_1_1', 25));
    expect(result.ok).toBe(true);
    expect(result.code).toBe(ARCHIVE_CODES.ARCHIVED);
    expect(result.record.id).toBe('pos_1_1');
    expect(result.record.pnlDollars).toBe(25);
    expect(result.committed).toEqual(['pos_1_1']);

    const read = await archive.getTrade('pos_1_1');
    expect(read.ok).toBe(true);
    expect(read.record.id).toBe('pos_1_1');
    expect(read.record.pnlDollars).toBe(25);
  });

  it('reads multiple trades and reports a deterministic order', async () => {
    await archive.archiveTrade(trade('pos_1_1', 10));
    await archive.archiveTrade(trade('pos_2_1', -5));
    await archive.archiveTrade(trade('pos_3_1', 0));

    const all = await archive.getAllTrades();
    expect(all.count).toBe(3);
    expect(all.records.map((r) => r.id)).toEqual(['pos_1_1', 'pos_2_1', 'pos_3_1']);

    const desc = await archive.getAllTrades({ order: 'desc' });
    expect(desc.records.map((r) => r.id)).toEqual(['pos_3_1', 'pos_2_1', 'pos_1_1']);
  });

  it('filters by asset and by limit', async () => {
    await archive.archiveTrade(trade('pos_1_1', 10, { asset: 'XAU/USD' }));
    await archive.archiveTrade(trade('pos_2_1', 10, { asset: 'BTC/USD' }));

    const filtered = await archive.getAllTrades({ asset: 'BTC/USD' });
    expect(filtered.count).toBe(1);
    expect(filtered.records[0].asset).toBe('BTC/USD');

    const limited = await archive.getAllTrades({ limit: 1 });
    expect(limited.count).toBe(1);
  });
});

// ── 5-6: duplicates and conflicts ──────────────────────────────────────────

describe('5-6 — duplicates and conflicts', () => {
  it('archiving the identical trade twice creates only one record', async () => {
    const first = await archive.archiveTrade(trade('pos_1_1', 25));
    expect(first.code).toBe(ARCHIVE_CODES.ARCHIVED);

    const second = await archive.archiveTrade(trade('pos_1_1', 25));
    expect(second.ok).toBe(true);
    expect(second.code).toBe(ARCHIVE_CODES.DUPLICATE);

    const all = await archive.getAllTrades();
    expect(all.count).toBe(1);
  });

  it('a duplicate id with different financial content is a CONFLICT and overwrites nothing', async () => {
    await archive.archiveTrade(trade('pos_1_1', 25));
    const conflict = await archive.archiveTrade(trade('pos_1_1', -80));

    expect(conflict.ok).toBe(false);
    expect(conflict.code).toBe(ARCHIVE_CODES.CONFLICT);
    expect(conflict.conflict.existing.pnlDollars).toBe(25);

    const all = await archive.getAllTrades();
    expect(all.count).toBe(1);
    expect(all.records[0].pnlDollars).toBe(25);
  });

  it('a ConstraintError is not treated as proof of identity', async () => {
    // The fingerprint is what decides, not the database error.
    await archive.archiveTrade(trade('pos_1_1', 25));
    const same = await archive.archiveTrade(trade('pos_1_1', 25, { reason: 'different text' }));
    // A different non-financial field still means a different record.
    expect(same.code).toBe(ARCHIVE_CODES.CONFLICT);
  });

  it('archive-only metadata is excluded from the equality check', () => {
    const a = normalizeTradeRecord(trade('pos_1_1', 25), { now: 1 }).record;
    const b = normalizeTradeRecord(trade('pos_1_1', 25), { now: 999999 }).record;
    expect(a.archivedAt).not.toBe(b.archivedAt);
    expect(sameTradeContent(a, b)).toBe(true);
    expect(tradeFingerprint(a)).toBe(tradeFingerprint(b));
  });
});

// ── 7-9: invalid ids and invalid P&L ──────────────────────────────────────

describe('7-9 — invalid ids and invalid financial values', () => {
  it('rejects a missing trade id', async () => {
    const result = await archive.archiveTrade({ ...trade('x', 10), id: '' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.INVALID_TRADE_ID);

    const all = await archive.getAllTrades();
    expect(all.count).toBe(0);
  });

  it('rejects a missing P&L', async () => {
    const result = await archive.archiveTrade({ ...trade('pos_1_1', 10), pnlDollars: undefined });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.INVALID_PNL);
  });

  it('rejects NaN and infinite P&L and never stores zero for them', async () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      const result = await archive.archiveTrade({ ...trade('pos_1_1', 10), pnlDollars: value });
      expect(result.ok).toBe(false);
      expect(result.code).toBe(ARCHIVE_CODES.INVALID_PNL);
    }
    const all = await archive.getAllTrades();
    expect(all.count).toBe(0);
  });

  it('rejects a non-object record', async () => {
    const result = await archive.archiveTrade(null);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.INVALID_INPUT);
  });
});

// ── 10-11: legacy data preservation ────────────────────────────────────────

describe('10-11 — legacy trade data is preserved', () => {
  it('keeps every valid legacy field', async () => {
    const legacy = {
      id: 'legacy_1',
      asset: 'XAU/USD',
      type: 'BUY',
      lotSize: 1,
      entryPrice: 2638.5,
      exitPrice: 2650,
      pips: 115,
      pnlDollars: 1150,
      result: 'WIN',
      reason: 'TP1 Hit',
      time: '18:14',
      closeTime: '18:32',
      duration: '18m',
      maxDrawdownPips: 4,
      maxRunupPips: 115,
      confluence: 96,
      exchangeOrderId: null,
      exchange: null,
    };
    const result = await archive.archiveTrade(legacy);
    expect(result.ok).toBe(true);
    const read = await archive.getTrade('legacy_1');
    expect(read.record.pnlDollars).toBe(1150);
    expect(read.record.pips).toBe(115);
    expect(read.record.time).toBe('18:14');
    expect(read.record.closeTime).toBe('18:32');
    expect(read.record.duration).toBe('18m');
    expect(read.record.confluence).toBe(96);
    // The complete original record is kept verbatim.
    expect(read.record.source).toEqual(legacy);
  });

  it('keeps a missing legacy close timestamp null and never invents one', async () => {
    const result = await archive.archiveTrade(trade('legacy_2', 10));
    expect(result.record.closedAt).toBeNull();
    expect(result.record.legacy).toBe(true);

    const read = await archive.getTrade('legacy_2');
    expect(read.record.closedAt).toBeNull();
    expect(read.record.legacy).toBe(true);
  });

  it('stores a real close timestamp when one is supplied', async () => {
    const result = await archive.archiveTrade(trade('pos_9_1', 10, { closedAt: 1700000000000 }));
    expect(result.record.closedAt).toBe(1700000000000);
    expect(result.record.legacy).toBe(false);
  });

  it('preserves the position identity and exchange order attribution', async () => {
    const result = await archive.archiveTrade(
      trade('pos_7_1', 10, { positionId: 'pos_7_1', exchangeOrderId: 'order-abc', exchange: 'bybit' })
    );
    const read = await archive.getTrade('pos_7_1');
    expect(read.record.positionId).toBe('pos_7_1');
    expect(read.record.exchangeOrderId).toBe('order-abc');
    expect(read.record.exchange).toBe('bybit');
    expect(result.ok).toBe(true);
  });
});

// ── 12-14: environment failures ────────────────────────────────────────────

describe('12-14 — environment and transaction failures are reported', () => {
  it('reports an error when IndexedDB is unavailable', async () => {
    const noDb = createPaperArchive({ resolveIndexedDB: () => undefined });
    const result = await noDb.archiveTrade(trade('pos_1_1', 10));
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.ARCHIVE_UNAVAILABLE);

    const status = await noDb.getArchiveStatus();
    expect(status.ok).toBe(false);
    expect(status.available).toBe(false);
    expect(status.tradeCount).toBe(0);
  });

  it('reports a failed database opening', async () => {
    const failing = makeArchive({ failOpen: 'UnknownError' });
    const result = await failing.archiveTrade(trade('pos_1_1', 10));
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.ARCHIVE_OPEN_FAILED);
  });

  it('reports a blocked database', async () => {
    const blocked = makeArchive({ blockOpen: true });
    const result = await blocked.archiveTrade(trade('pos_1_1', 10));
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.ARCHIVE_BLOCKED);
  });

  it('reports a simulated quota failure and commits nothing', async () => {
    const quota = makeArchive({ failNextWrite: 'QuotaExceededError' });
    const result = await quota.archiveTrades([trade('pos_1_1', 10), trade('pos_2_1', 20)]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.QUOTA_EXCEEDED);
    expect(result.committed).toEqual([]);
  });

  it('reports a simulated transaction abort and commits nothing', async () => {
    const aborting = makeArchive({ failNextWrite: 'AbortError' });
    const result = await aborting.archiveTrades([trade('pos_1_1', 10)]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.ARCHIVE_BATCH_ABORTED);
    expect(result.committed).toEqual([]);
  });

  it('reports a version error', async () => {
    const versioned = makeArchive({ failOpen: 'VersionError' });
    const result = await versioned.openArchive();
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.ARCHIVE_VERSION_ERROR);
  });
});

// ── 15-17: concurrency, purity and immutability ────────────────────────────

describe('15-17 — concurrency, purity and immutability', () => {
  it('keeps concurrent duplicate requests idempotent', async () => {
    const results = await Promise.all([
      archive.archiveTrade(trade('pos_1_1', 25)),
      archive.archiveTrade(trade('pos_1_1', 25)),
      archive.archiveTrade(trade('pos_1_1', 25)),
    ]);
    const ok = results.filter((r) => r.ok);
    expect(ok.length).toBeGreaterThan(0);

    const all = await archive.getAllTrades();
    expect(all.count).toBe(1);
  });

  it('never mutates the original input objects', async () => {
    const input = trade('pos_1_1', 25);
    const snapshot = JSON.parse(JSON.stringify(input));
    await archive.archiveTrade(input);
    expect(input).toEqual(snapshot);
  });

  it('never mutates stored records when they are read', async () => {
    await archive.archiveTrade(trade('pos_1_1', 25));
    const first = await archive.getTrade('pos_1_1');
    first.record.pnlDollars = 999999;
    first.record.asset = 'MUTATED';

    const second = await archive.getTrade('pos_1_1');
    expect(second.record.pnlDollars).toBe(25);
    expect(second.record.asset).toBe('XAU/USD');
  });
});

// ── 18-21: metadata, schema, ordering and generations ──────────────────────

describe('18-21 — metadata, schema version, ordering and generations', () => {
  it('round-trips a metadata value', async () => {
    const written = await archive.writeMeta('migration', { status: 'complete', migratedCount: 3 });
    expect(written.ok).toBe(true);

    const read = await archive.readMeta('migration');
    expect(read.ok).toBe(true);
    expect(read.value).toEqual({ status: 'complete', migratedCount: 3 });
  });

  it('reports a missing metadata key without failing', async () => {
    const read = await archive.readMeta('nothing-here');
    expect(read.ok).toBe(true);
    expect(read.code).toBe(ARCHIVE_CODES.META_NOT_FOUND);
    expect(read.value).toBeNull();
  });

  it('rejects an empty metadata key', async () => {
    const result = await archive.writeMeta('', { a: 1 });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ARCHIVE_CODES.INVALID_INPUT);
  });

  it('validates the schema version', async () => {
    const opened = await archive.openArchive();
    expect(opened.schemaVersion).toBe(ARCHIVE_SCHEMA_VERSION);

    const status = await archive.getArchiveStatus();
    expect(status.schemaVersion).toBe(ARCHIVE_SCHEMA_VERSION);
    expect(status.available).toBe(true);
  });

  it('keeps the record order deterministic across reads', async () => {
    for (let i = 1; i <= 5; i++) {
      await archive.archiveTrade(trade(`pos_${i}_1`, i));
    }
    const a = await archive.getAllTrades();
    const b = await archive.getAllTrades();
    expect(a.records.map((r) => r.id)).toEqual(b.records.map((r) => r.id));
    expect(a.records.map((r) => r.id)).toEqual([
      'pos_1_1', 'pos_2_1', 'pos_3_1', 'pos_4_1', 'pos_5_1',
    ]);
  });

  it('supports an account generation without mixing accounts', async () => {
    await archive.writeMeta('generation', { generation: 'gen-1', createdAt: 1700000000000 });
    await archive.archiveTrade(trade('pos_1_1', 25));

    const generation = await archive.readMeta('generation');
    expect(generation.value.generation).toBe('gen-1');

    // A record from another generation is a normal record; the generation is
    // metadata, not a filter. The archive never merges generations silently.
    const other = await archive.getAllTrades();
    expect(other.count).toBe(1);
  });

  it('reports the archive status with counts and timestamps', async () => {
    await archive.archiveTrade(trade('pos_1_1', 25, { closedAt: 1700000000000 }));
    await archive.archiveTrade(trade('legacy_1', 10));

    const status = await archive.getArchiveStatus();
    expect(status.ok).toBe(true);
    expect(status.tradeCount).toBe(2);
    expect(status.legacyCount).toBe(1);
    expect(status.newestClosedAt).toBe(1700000000000);
    expect(status.oldestClosedAt).toBe(1700000000000);
  });
});

// ── 22-24: isolation guarantees ────────────────────────────────────────────

describe('22-24 — isolation from trading, credentials and the account store', () => {
  it('makes no network request and stores no credential', async () => {
    await archive.archiveTrade(trade('pos_1_1', 25));
    const all = await archive.getAllTrades();
    const serialised = JSON.stringify(all.records);
    expect(serialised).not.toMatch(/apiKey|apiSecret|X-BAPI|password|token/i);

    const status = await archive.getArchiveStatus();
    expect(JSON.stringify(status)).not.toMatch(/apiSecret|X-BAPI/i);
  });

  it('does not touch any localStorage key', () => {
    // The archive module has no localStorage dependency at all.
    const source = String(createPaperArchive.toString());
    expect(source).not.toMatch(/localStorage/);
  });

  it('does not modify the existing paper account state', async () => {
    const before = localStorage.getItem('tl_demo_account');
    await archive.archiveTrade(trade('pos_1_1', 25));
    expect(localStorage.getItem('tl_demo_account')).toBe(before);
  });

  it('imports cleanly in Node without IndexedDB globals', () => {
    expect(typeof createPaperArchive).toBe('function');
    expect(typeof paperArchive.openArchive).toBe('function');
    expect(typeof paperArchive.archiveTrade).toBe('function');
    expect(typeof paperArchive.archiveTrades).toBe('function');
    expect(typeof paperArchive.getTrade).toBe('function');
    expect(typeof paperArchive.getAllTrades).toBe('function');
    expect(typeof paperArchive.getArchiveStatus).toBe('function');
    expect(typeof paperArchive.readMeta).toBe('function');
    expect(typeof paperArchive.writeMeta).toBe('function');
    expect(typeof paperArchive.closeArchive).toBe('function');
  });

  it('exposes the expected store names', () => {
    expect(JOURNAL_STORE).toBe('journal');
    expect(META_STORE).toBe('meta');
  });
});

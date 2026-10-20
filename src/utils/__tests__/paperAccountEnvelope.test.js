import { describe, it, expect } from 'vitest';
import {
  CONCURRENCY_POLICY,
  ENVELOPE_ACCOUNT_KEY,
  ENVELOPE_CODES,
  ENVELOPE_SCHEMA_VERSION,
  LEGACY_ACCOUNT_KEY,
  MAX_PENDING_ARCHIVE_RECORDS,
  appendPendingTrade,
  assertFinancialCommitPermitted,
  describeConcurrencyCapability,
  buildNextEnvelope,
  classifyEnvelope,
  confirmArchivedTrades,
  createGenerationId,
  createInitialEnvelope,
  detectConcurrentWrite,
  migrateLegacyAccount,
  reconcilePendingArchive,
  selectSourceOfTruth,
  tradeContentFingerprint,
} from '../paperAccountEnvelope.js';

const account = () => ({
  initialBalance: 10000,
  balance: 10000,
  equity: 10000,
  realizedPnL: 0,
  unrealizedPnL: 0,
  winCount: 0,
  lossCount: 0,
  breakevenCount: 0,
  trades: [],
  simulatedTrades: [],
  openPosition: null,
  isAutoBotActive: false,
});

const trade = (id, pnlDollars, extra = {}) => ({
  id,
  asset: 'XAU/USD',
  type: 'BUY',
  entryPrice: 1000,
  exitPrice: 1010,
  pips: 10,
  pnlDollars,
  result: pnlDollars > 0 ? 'WIN' : pnlDollars < 0 ? 'LOSS' : 'BREAKEVEN',
  time: '10:00',
  closeTime: '10:05',
  ...extra,
});

const NOW = Date.UTC(2026, 9, 20, 15, 0, 0);

// ── Envelope structure and versioning ───────────────────────────────────────

describe('envelope structure and versioning', () => {
  it('creates an initial envelope', () => {
    const result = createInitialEnvelope({ account: account(), generation: 'gen_1', now: NOW });
    expect(result.ok).toBe(true);
    expect(result.envelope.schemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
    expect(result.envelope.generation).toBe('gen_1');
    expect(result.envelope.revision).toBe(0);
    expect(result.envelope.pendingArchive).toEqual([]);
    expect(result.envelope.account.balance).toBe(10000);
  });

  it('rejects an unknown schema version', () => {
    const result = classifyEnvelope(
      JSON.stringify({ ...createInitialEnvelope({ account: account(), now: NOW }).envelope, schemaVersion: 99 })
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.UNSUPPORTED_VERSION);
  });

  it('rejects a corrupt envelope', () => {
    expect(classifyEnvelope('{not json').ok).toBe(false);
    expect(classifyEnvelope('null').ok).toBe(false);
  });

  it('rejects an envelope without a generation, revision, account or pending list', () => {
    const base = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    for (const patch of [
      { generation: '' },
      { revision: -1 },
      { account: null },
      { pendingArchive: 'nope' },
    ]) {
      const result = classifyEnvelope({ ...base, ...patch });
      expect(result.ok).toBe(false);
    }
  });

  it('generates a deterministic generation id', () => {
    expect(createGenerationId({ now: NOW, suffix: 'a' })).toBe(`gen_${NOW}_a`);
  });
});

// ── Committing ─────────────────────────────────────────────────────────────

describe('committing an account transition with its pending archive record', () => {
  it('commits the account and the trade together and bumps the revision', () => {
    const initial = createInitialEnvelope({ account: account(), generation: 'gen_1', now: NOW }).envelope;
    const nextAccount = { ...account(), balance: 10025, winCount: 1, realizedPnL: 25 };

    const result = buildNextEnvelope({
      current: initial,
      account: nextAccount,
      pendingTrade: trade('pos_1_1', 25),
      now: NOW + 1000,
    });

    expect(result.ok).toBe(true);
    expect(result.envelope.revision).toBe(1);
    expect(result.envelope.account.balance).toBe(10025);
    expect(result.envelope.account.winCount).toBe(1);
    expect(result.envelope.pendingArchive).toHaveLength(1);
    expect(result.envelope.pendingArchive[0].id).toBe('pos_1_1');
    expect(result.envelope.pendingArchive[0].generation).toBe('gen_1');
    expect(result.envelope.pendingArchive[0].trade.pnlDollars).toBe(25);
  });

  it('never recalculates or alters the supplied account state', () => {
    const initial = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    const oddAccount = { ...account(), balance: 12345.67, weirdField: 'keep me' };
    const result = buildNextEnvelope({ current: initial, account: oddAccount, now: NOW });
    expect(result.envelope.account.balance).toBe(12345.67);
    expect(result.envelope.account.weirdField).toBe('keep me');
  });

  it('does not mutate the inputs', () => {
    const initial = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    const snapshot = JSON.parse(JSON.stringify(initial));
    const nextAccount = { ...account(), balance: 999 };
    buildNextEnvelope({ current: initial, account: nextAccount, pendingTrade: trade('pos_1_1', 25), now: NOW });
    expect(initial).toEqual(snapshot);
    expect(nextAccount.balance).toBe(999);
  });

  it('rejects a pending trade without a stable id', () => {
    const initial = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    const result = buildNextEnvelope({
      current: initial,
      account: account(),
      pendingTrade: { ...trade('pos_1_1', 25), id: '' },
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.INVALID_TRADE_ID);
  });

  it('rejects a pending trade with an invalid P&L and never coerces it to zero', () => {
    const initial = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    for (const value of [undefined, NaN, Infinity, -Infinity]) {
      const result = buildNextEnvelope({
        current: initial,
        account: account(),
        pendingTrade: { ...trade('pos_1_1', 25), pnlDollars: value },
        now: NOW,
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe(ENVELOPE_CODES.INVALID_PNL);
    }
  });

  it('never invents a missing close timestamp', () => {
    const initial = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    const result = buildNextEnvelope({
      current: initial,
      account: account(),
      pendingTrade: trade('pos_1_1', 25),
      now: NOW,
    });
    const stored = result.envelope.pendingArchive[0].trade;
    expect(stored.closedAt === undefined || stored.closedAt === null).toBe(true);
  });
});

// ── Duplicates and conflicts in the pending queue ──────────────────────────

describe('pending queue duplicate and conflict handling', () => {
  const withPending = () => {
    const initial = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    return buildNextEnvelope({
      current: initial,
      account: account(),
      pendingTrade: trade('pos_1_1', 25),
      now: NOW,
    }).envelope;
  };

  it('an identical duplicate is a no-op', () => {
    const envelope = withPending();
    const result = appendPendingTrade(envelope, trade('pos_1_1', 25), { now: NOW });
    expect(result.ok).toBe(true);
    expect(result.code).toBe(ENVELOPE_CODES.DUPLICATE_PENDING);
    expect(result.envelope.pendingArchive).toHaveLength(1);
  });

  it('a different trade with the same id is a conflict and is not merged', () => {
    const envelope = withPending();
    const result = appendPendingTrade(envelope, trade('pos_1_1', -80), { now: NOW });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.CONFLICTING_PENDING);
    expect(result.envelope.pendingArchive).toHaveLength(1);
    expect(result.envelope.pendingArchive[0].trade.pnlDollars).toBe(25);
  });

  it('refuses a new commit when the pending queue is full and drops nothing', () => {
    let envelope = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    for (let i = 0; i < MAX_PENDING_ARCHIVE_RECORDS; i++) {
      const result = appendPendingTrade(envelope, trade(`pos_${i}_1`, 1), { now: NOW });
      expect(result.ok).toBe(true);
      envelope = result.envelope;
    }
    expect(envelope.pendingArchive).toHaveLength(MAX_PENDING_ARCHIVE_RECORDS);

    const overflow = appendPendingTrade(envelope, trade('one_too_many', 1), { now: NOW });
    expect(overflow.ok).toBe(false);
    expect(overflow.code).toBe(ENVELOPE_CODES.PENDING_QUEUE_FULL);
    expect(overflow.envelope.pendingArchive).toHaveLength(MAX_PENDING_ARCHIVE_RECORDS);
  });
});

// ── Archive confirmation ───────────────────────────────────────────────────

describe('pending records are removed only after an archive confirmation', () => {
  const envelopeWith = (ids) => {
    let envelope = createInitialEnvelope({ account: account(), now: NOW }).envelope;
    for (const id of ids) {
      envelope = appendPendingTrade(envelope, trade(id, 10), { now: NOW }).envelope;
    }
    return envelope;
  };

  it('removes a confirmed record', () => {
    const envelope = envelopeWith(['pos_1_1', 'pos_2_1']);
    const result = confirmArchivedTrades(envelope, ['pos_1_1']);
    expect(result.ok).toBe(true);
    expect(result.removed).toEqual(['pos_1_1']);
    expect(result.stillPending).toEqual(['pos_2_1']);
    expect(result.envelope.pendingArchive.map((e) => e.id)).toEqual(['pos_2_1']);
  });

  it('never removes a record that was not confirmed', () => {
    const envelope = envelopeWith(['pos_1_1']);
    const result = confirmArchivedTrades(envelope, []);
    expect(result.envelope.pendingArchive).toHaveLength(1);
    expect(result.removed).toEqual([]);
  });

  it('ignores an id that is not pending', () => {
    const envelope = envelopeWith(['pos_1_1']);
    const result = confirmArchivedTrades(envelope, ['pos_unknown']);
    expect(result.notPending).toEqual(['pos_unknown']);
    expect(result.envelope.pendingArchive).toHaveLength(1);
  });

  it('reconciles pending against the archive', () => {
    const envelope = envelopeWith(['pos_1_1', 'pos_2_1']);
    const report = reconcilePendingArchive(envelope, {
      archivedIds: ['pos_1_1'],
      fingerprints: { pos_1_1: tradeContentFingerprint(trade('pos_1_1', 10)) },
    });
    expect(report.archived).toEqual(['pos_1_1']);
    expect(report.pending).toEqual(['pos_2_1']);
    expect(report.conflicts).toEqual([]);
  });

  it('flags a conflict when the archived content differs', () => {
    const envelope = envelopeWith(['pos_1_1']);
    const report = reconcilePendingArchive(envelope, {
      archivedIds: ['pos_1_1'],
      fingerprints: { pos_1_1: 'different-content' },
    });
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0].id).toBe('pos_1_1');
  });
});

// ── Legacy hydration ───────────────────────────────────────────────────────

describe('legacy hydration and source-of-truth selection', () => {
  const legacyRaw = JSON.stringify({ ...account(), balance: 10500, winCount: 4, trades: [trade('t_1', 100)] });

  it('prefers a valid versioned envelope', () => {
    const envelope = createInitialEnvelope({ account: account(), generation: 'gen_1', now: NOW }).envelope;
    const result = selectSourceOfTruth({
      versionedRaw: JSON.stringify(envelope),
      legacyRaw,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.source).toBe('versioned');
    expect(result.envelope.generation).toBe('gen_1');
    expect(result.quarantine).toEqual([]);
  });

  it('migrates a valid legacy account when there is no versioned envelope', () => {
    const result = selectSourceOfTruth({ legacyRaw, defaultAccount: account(), now: NOW });
    expect(result.source).toBe('legacy-migrated');
    expect(result.envelope.account.balance).toBe(10500);
    expect(result.envelope.account.winCount).toBe(4);
    expect(result.envelope.account.trades).toHaveLength(1);
    expect(result.envelope.pendingArchive).toEqual([]);
  });

  it('is idempotent: migrating twice produces the same account state', () => {
    const first = selectSourceOfTruth({ legacyRaw, defaultAccount: account(), now: NOW });
    const second = selectSourceOfTruth({
      versionedRaw: JSON.stringify(first.envelope),
      defaultAccount: account(),
      now: NOW,
    });
    expect(second.source).toBe('versioned');
    expect(second.envelope.account).toEqual(first.envelope.account);
  });

  it('quarantines a corrupted versioned envelope and refuses to fall back to the legacy account', () => {
    const result = selectSourceOfTruth({
      versionedRaw: '{corrupt',
      legacyRaw,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.RECOVERY_REQUIRED);
    expect(result.source).toBe('recovery-required');
    expect(result.envelope).toBeNull();
    expect(result.quarantine).toHaveLength(2);
    expect(result.quarantine.find((q) => q.key === ENVELOPE_ACCOUNT_KEY).raw).toBe('{corrupt');
    expect(result.quarantine.find((q) => q.key === LEGACY_ACCOUNT_KEY).raw).toBe(legacyRaw);
    expect(result.notices.length).toBeGreaterThan(0);
  });

  it('quarantines a corrupted legacy account and refuses to install a default', () => {
    const result = selectSourceOfTruth({
      legacyRaw: '{also corrupt',
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.RECOVERY_REQUIRED);
    expect(result.source).toBe('recovery-required');
    expect(result.envelope).toBeNull();
    expect(result.quarantine).toHaveLength(1);
    expect(result.quarantine[0].key).toBe(LEGACY_ACCOUNT_KEY);
    expect(result.notices.some((n) => n.code === ENVELOPE_CODES.RECOVERY_REQUIRED)).toBe(true);
  });

  it('never deletes the legacy payload on its own', () => {
    // selectSourceOfTruth only REPORTS a quarantine; removing the key is an
    // explicit, separate action by the storage layer.
    const result = selectSourceOfTruth({ legacyRaw, defaultAccount: account(), now: NOW });
    expect(result.quarantine).toEqual([]);
    expect(typeof result.envelope).toBe('object');
  });

  it('migrates a legacy account without changing any financial value', () => {
    const legacy = {
      ...account(),
      balance: 12345.67,
      equity: 12345.67,
      realizedPnL: 2345.67,
      winCount: 7,
      lossCount: 3,
      breakevenCount: 1,
      openPosition: { id: 'pos_9_1', asset: 'BTC/USD', entryPrice: 80000 },
      trades: [trade('t_1', 100), trade('t_2', -50)],
    };
    const result = migrateLegacyAccount(legacy, { generation: 'gen_2', now: NOW });
    expect(result.ok).toBe(true);
    expect(result.envelope.account.balance).toBe(12345.67);
    expect(result.envelope.account.realizedPnL).toBe(2345.67);
    expect(result.envelope.account.winCount).toBe(7);
    expect(result.envelope.account.lossCount).toBe(3);
    expect(result.envelope.account.breakevenCount).toBe(1);
    expect(result.envelope.account.openPosition).toEqual(legacy.openPosition);
    expect(result.envelope.account.trades).toHaveLength(2);
  });
});

// ── Generation handling ───────────────────────────────────────────────────

describe('ledger generations', () => {
  it('a reset produces a new generation without touching archived history', () => {
    const first = createInitialEnvelope({ account: account(), generation: 'gen_1', now: NOW }).envelope;
    const second = createInitialEnvelope({ account: account(), generation: 'gen_2', now: NOW + 1000 }).envelope;
    expect(first.generation).not.toBe(second.generation);
    expect(second.pendingArchive).toEqual([]);
  });

  it('a pending record carries the generation it was committed under', () => {
    const initial = createInitialEnvelope({ account: account(), generation: 'gen_7', now: NOW }).envelope;
    const result = buildNextEnvelope({
      current: initial,
      account: account(),
      pendingTrade: trade('pos_1_1', 5),
      now: NOW,
    });
    expect(result.envelope.pendingArchive[0].generation).toBe('gen_7');
  });
});

// ── Concurrency detection ──────────────────────────────────────────────────

describe('competing write detection', () => {
  it('accepts a write when the revision and generation match', () => {
    const result = detectConcurrentWrite({
      observedRevision: 3,
      observedGeneration: 'gen_1',
      currentRevision: 3,
      currentGeneration: 'gen_1',
    });
    expect(result.ok).toBe(true);
  });

  it('refuses a write when the revision moved', () => {
    const result = detectConcurrentWrite({
      observedRevision: 3,
      observedGeneration: 'gen_1',
      currentRevision: 4,
      currentGeneration: 'gen_1',
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.CONCURRENT_MODIFICATION);
  });

  it('refuses a write when the generation changed', () => {
    const result = detectConcurrentWrite({
      observedRevision: 3,
      observedGeneration: 'gen_1',
      currentRevision: 3,
      currentGeneration: 'gen_2',
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.GENERATION_MISMATCH);
  });

  it('does not use a timestamp to resolve a competing write', () => {
    const result = detectConcurrentWrite({
      observedRevision: 3,
      observedGeneration: 'gen_1',
      currentRevision: 3,
      currentGeneration: 'gen_1',
      observedCommittedAt: '2026-10-20T15:00:00.000Z',
      currentCommittedAt: '2020-01-01T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
  });
});

// ── Purity ─────────────────────────────────────────────────────────────────

describe('the module is pure', () => {
  it('does not touch browser storage, IndexedDB, the network or React', () => {
    const source = String(createInitialEnvelope.toString());
    expect(source).not.toMatch(/localStorage|indexedDB|fetch\(|document\.|window\./);
  });

  it('exposes no account-store or trading dependency', () => {
    const source = String(buildNextEnvelope.toString()) + String(confirmArchivedTrades.toString());
    expect(source).not.toMatch(/useDemoAccountStore|openDemoTrade|closeDemoTrade|placeBybit/);
  });
});

describe('CORRECTION 1 — a corrupted V2 account never falls back to the legacy account', () => {
  const legacyRaw = JSON.stringify({ ...account(), balance: 10500, winCount: 4 });

  it('returns RECOVERY_REQUIRED when a V2 envelope exists but cannot be read', () => {
    const result = selectSourceOfTruth({
      versionedRaw: '{corrupt',
      legacyRaw,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.RECOVERY_REQUIRED);
    expect(result.source).toBe('recovery-required');
  });

  it('does NOT install the legacy account as the active writable account', () => {
    const result = selectSourceOfTruth({
      versionedRaw: '{corrupt',
      legacyRaw,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.envelope).toBeNull();
    // The legacy account is preserved for manual recovery, not adopted.
    expect(result.quarantine.some((q) => q.key === LEGACY_ACCOUNT_KEY)).toBe(true);
    expect(result.quarantine.find((q) => q.key === LEGACY_ACCOUNT_KEY).raw).toBe(legacyRaw);
    expect(result.notices.some((n) => n.code === ENVELOPE_CODES.LEGACY_CORRUPT)).toBe(true);
  });

  it('preserves the raw V2 payload', () => {
    const result = selectSourceOfTruth({
      versionedRaw: '{corrupt',
      legacyRaw,
      defaultAccount: account(),
      now: NOW,
    });
    const quarantined = result.quarantine.find((q) => q.key === ENVELOPE_ACCOUNT_KEY);
    expect(quarantined).toBeTruthy();
    expect(quarantined.raw).toBe('{corrupt');
  });

  it('does not silently reset to a default account either', () => {
    const result = selectSourceOfTruth({
      versionedRaw: '{corrupt',
      legacyRaw: null,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.envelope).toBeNull();
    expect(result.notices.some((n) => n.code === ENVELOPE_CODES.RECOVERY_REQUIRED)).toBe(true);
  });

  it('still migrates a valid legacy account when NO V2 envelope exists', () => {
    const result = selectSourceOfTruth({ legacyRaw, defaultAccount: account(), now: NOW });
    expect(result.ok).toBe(true);
    expect(result.source).toBe('legacy-migrated');
    expect(result.envelope.account.balance).toBe(10500);
  });

  it('prefers a valid V2 envelope when both keys exist', () => {
    const envelope = createInitialEnvelope({ account: account(), generation: 'gen_v2', now: NOW }).envelope;
    const result = selectSourceOfTruth({
      versionedRaw: JSON.stringify(envelope),
      legacyRaw,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.source).toBe('versioned');
    expect(result.envelope.generation).toBe('gen_v2');
  });

  it('returns RECOVERY_REQUIRED when neither payload can be read', () => {
    const result = selectSourceOfTruth({
      versionedRaw: null,
      legacyRaw: '{also corrupt',
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.RECOVERY_REQUIRED);
    expect(result.envelope).toBeNull();
  });
});

describe('CORRECTION 2 — concurrency limitations are explicit and writes fail closed', () => {
  it('the policy names the Web Locks API as the preferred mechanism', () => {
    expect(CONCURRENCY_POLICY.preferredMechanism).toBe('web-locks');
    expect(CONCURRENCY_POLICY.preferredApi).toContain('navigator.locks.request');
  });

  it('the policy requires every persisted writer to be serialized, price ticks included', () => {
    expect(CONCURRENCY_POLICY.serializedWriters).toContain('closeDemoTrade');
    expect(CONCURRENCY_POLICY.serializedWriters).toContain('updateTickPnL');
    expect(CONCURRENCY_POLICY.serializedWriters).toContain('openDemoTrade');
    expect(CONCURRENCY_POLICY.failClosedWhenUnavailable).toBe(true);
  });

  it('a write is refused when no single-writer mechanism is available', () => {
    const result = assertFinancialCommitPermitted({});
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.NO_SINGLE_WRITER);
    expect(result.message).toMatch(/fail closed/i);
  });

  it('a supported lock API alone does NOT authorize a commit', () => {
    const result = assertFinancialCommitPermitted({ webLocksSupported: true });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.LOCK_NOT_HELD);
    expect(result.message).toMatch(/does not hold the exclusive lock/i);
  });

  it('a held lock without a fresh revision read is refused', () => {
    const result = assertFinancialCommitPermitted({ webLocksSupported: true, lockHeld: true });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.REVISION_NOT_REVALIDATED);
  });

  it('a commit is permitted only with support + lock + re-read, and no competing write', () => {
    const result = assertFinancialCommitPermitted({
      webLocksSupported: true,
      lockHeld: true,
      revisionReRead: true,
      observedRevision: 4,
      observedGeneration: 'gen_1',
      currentRevision: 4,
      currentGeneration: 'gen_1',
    });
    expect(result.ok).toBe(true);
    expect(result.mechanism).toBe('web-locks');
    expect(result.lockHeld).toBe(true);
    expect(result.revisionReRead).toBe(true);
  });

  it('a competing write under the lock is still refused', () => {
    const result = assertFinancialCommitPermitted({
      webLocksSupported: true,
      lockHeld: true,
      revisionReRead: true,
      observedRevision: 4,
      observedGeneration: 'gen_1',
      currentRevision: 5,
      currentGeneration: 'gen_1',
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.CONCURRENT_MODIFICATION);
  });

  it('a localStorage lease can NEVER authorize a financial write', () => {
    // The helper must not even accept a lease as a precondition.
    const source = String(assertFinancialCommitPermitted);
    expect(source).not.toMatch(/\blease[A-Z]\w*\s*[,}=]/);
    expect(source).not.toMatch(/options\.lease/);

    // Passing a lease-shaped option has no effect: the write is still refused.
    const withLease = assertFinancialCommitPermitted({ leaseHeld: true, lease: 'writer-1' });
    expect(withLease.ok).toBe(false);
    expect(withLease.code).toBe(ENVELOPE_CODES.NO_SINGLE_WRITER);

    // A lease cannot stand in for the lock either.
    const leaseInsteadOfLock = assertFinancialCommitPermitted({
      webLocksSupported: true,
      leaseHeld: true,
      revisionReRead: true,
    });
    expect(leaseInsteadOfLock.ok).toBe(false);
    expect(leaseInsteadOfLock.code).toBe(ENVELOPE_CODES.LOCK_NOT_HELD);

    expect(CONCURRENCY_POLICY.leaseIsAuthoritative).toBe(false);
    expect(CONCURRENCY_POLICY.fallbackMechanism).toBe('none');
    expect(CONCURRENCY_POLICY.leaseNote).toMatch(/never to authorize a financial write/i);
  });

  it('the capability probe says nothing about permission', () => {
    const supported = describeConcurrencyCapability({ webLocksSupported: true });
    expect(supported.ok).toBe(true);
    expect(supported.canAttemptLock).toBe(true);
    expect(supported.message).toMatch(/does not authorize a financial write/i);

    const unsupported = describeConcurrencyCapability({});
    expect(unsupported.ok).toBe(false);
    expect(unsupported.canAttemptLock).toBe(false);
    expect(unsupported.message).toMatch(/fail closed/i);
  });

  it('a revision check is documented as detection, not exclusion', () => {
    const result = detectConcurrentWrite({
      observedRevision: 1,
      observedGeneration: 'gen_1',
      currentRevision: 2,
      currentGeneration: 'gen_1',
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.CONCURRENT_MODIFICATION);
  });
});
describe('FIX 2 — a fresh installation is distinguished from corruption', () => {
  it('initialises a new account when NO stored data exists at all', () => {
    const result = selectSourceOfTruth({
      versionedRaw: null,
      legacyRaw: null,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.source).toBe('fresh');
    expect(result.envelope).toBeTruthy();
    expect(result.envelope.account.balance).toBe(10000);
    expect(result.envelope.account.trades).toEqual([]);
    expect(result.envelope.pendingArchive).toEqual([]);
    expect(result.quarantine).toEqual([]);
    expect(result.notices).toEqual([]);
  });

  it('a fresh installation never reports RECOVERY_REQUIRED', () => {
    const result = selectSourceOfTruth({
      versionedRaw: undefined,
      legacyRaw: undefined,
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.code).not.toBe(ENVELOPE_CODES.RECOVERY_REQUIRED);
  });

  it('the four account states are distinguishable', () => {
    const fresh = selectSourceOfTruth({ versionedRaw: null, legacyRaw: null, defaultAccount: account(), now: NOW });
    const legacy = selectSourceOfTruth({ legacyRaw: JSON.stringify(account()), defaultAccount: account(), now: NOW });
    const v2 = createInitialEnvelope({ account: account(), generation: 'gen_1', now: NOW }).envelope;
    const versioned = selectSourceOfTruth({ versionedRaw: JSON.stringify(v2), defaultAccount: account(), now: NOW });
    const corrupted = selectSourceOfTruth({ versionedRaw: '{broken', defaultAccount: account(), now: NOW });

    expect(fresh.source).toBe('fresh');
    expect(legacy.source).toBe('legacy-migrated');
    expect(versioned.source).toBe('versioned');
    expect(corrupted.source).toBe('recovery-required');
    expect(corrupted.ok).toBe(false);
  });

  it('a fresh installation still requires a default account', () => {
    const result = selectSourceOfTruth({ versionedRaw: null, legacyRaw: null, defaultAccount: null, now: NOW });
    expect(result.ok).toBe(false);
    expect(result.envelope).toBeNull();
  });

  it('a corrupt legacy account with NO v2 account is corruption, not a fresh install', () => {
    const result = selectSourceOfTruth({
      versionedRaw: null,
      legacyRaw: '{broken',
      defaultAccount: account(),
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ENVELOPE_CODES.RECOVERY_REQUIRED);
    expect(result.source).toBe('recovery-required');
    expect(result.quarantine).toHaveLength(1);
  });
});
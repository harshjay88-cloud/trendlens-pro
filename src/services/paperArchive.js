/**
 * TrendLens Pro — standalone paper-trade journal archive.
 *
 * A durable, versioned archive of closed paper-trading records, stored in the
 * browser's IndexedDB. This module is INDEPENDENT: it does not import React,
 * Zustand, the account store, the trading engine or any exchange client, and
 * it never writes to any existing localStorage key.
 *
 * DESIGN
 * ------
 * - Database `trendlens_paper`, schema version 1.
 * - Object store `journal`: a durable record of closed trades.
 *     key path   : `seq` (auto-increment) — gives a stable insertion order
 *     unique idx : `by_id` on `id` — the trade id is the stable identity
 *     index      : `by_closedAt` on `closedAt` (nullable for legacy rows)
 *     index      : `by_asset` on `asset`
 * - Object store `meta`: schema version, migration status, last operation,
 *   last failure and account/ledger generation information.
 *
 * IDEMPOTENCY AND CONFLICTS
 * --------------------------
 * A `ConstraintError` is NEVER treated as proof that two records are equal.
 * The existing row is re-read and its NORMALISED financial content is
 * compared with the incoming record:
 *   - identical  -> `DUPLICATE`  (the stored row is kept, nothing is written)
 *   - different  -> `CONFLICT`   (nothing is written, the caller is told)
 * An existing trade is NEVER silently overwritten.
 *
 * TRANSACTION COMPLETION
 * ----------------------
 * A success result means the DATABASE TRANSACTION COMPLETED, not merely that
 * a request was queued. Every write awaits the transaction's `complete` event.
 * A batch uses ONE transaction, so it is atomic: it either commits entirely or
 * it aborts entirely, and an abort reports an empty committed list.
 *
 * CROSS-STORE DURABILITY
 * ---------------------
 * This module cannot make a localStorage write and an IndexedDB write atomic
 * together — they are separate storage systems with no shared transaction. The
 * account-to-archive commit protocol is therefore designed around a SINGLE
 * localStorage key that carries both the committed account state and the
 * pending archive records (see the design notes in the S03-B2C-1 report).
 * This module only guarantees durability INSIDE IndexedDB.
 *
 * TESTABILITY
 * -----------
 * The IndexedDB implementation is injected through `resolveIndexedDB`, so the
 * module can be imported and exercised in Node without any IndexedDB global.
 * Every operation resolves to an explicit `{ ok, code, message, ... }` result;
 * IndexedDB errors are never swallowed.
 */

export const ARCHIVE_DB_NAME = 'trendlens_paper';
export const ARCHIVE_SCHEMA_VERSION = 1;
export const JOURNAL_STORE = 'journal';
export const META_STORE = 'meta';

/** Result codes. Every operation reports one of these. */
export const ARCHIVE_CODES = Object.freeze({
  OK: 'OK',
  ARCHIVED: 'ARCHIVED',
  DUPLICATE: 'DUPLICATE',
  CONFLICT: 'CONFLICT',
  INVALID_TRADE_ID: 'INVALID_TRADE_ID',
  INVALID_PNL: 'INVALID_PNL',
  INVALID_INPUT: 'INVALID_INPUT',
  ARCHIVE_UNAVAILABLE: 'ARCHIVE_UNAVAILABLE',
  ARCHIVE_OPEN_FAILED: 'ARCHIVE_OPEN_FAILED',
  ARCHIVE_BLOCKED: 'ARCHIVE_BLOCKED',
  ARCHIVE_VERSION_ERROR: 'ARCHIVE_VERSION_ERROR',
  ARCHIVE_WRITE_FAILED: 'ARCHIVE_WRITE_FAILED',
  ARCHIVE_BATCH_ABORTED: 'ARCHIVE_BATCH_ABORTED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  ARCHIVE_CLOSED: 'ARCHIVE_CLOSED',
  NOT_FOUND: 'NOT_FOUND',
  META_NOT_FOUND: 'META_NOT_FOUND',
});

/**
 * The semantic fields of a journal record. Archive-only metadata (`seq`,
 * `archivedAt`, `schemaVersion`) is deliberately NOT part of this list, so it
 * can never influence duplicate detection.
 */
export const SEMANTIC_FIELDS = Object.freeze([
  'id',
  'asset',
  'type',
  'lotSize',
  'entryPrice',
  'exitPrice',
  'tp',
  'sl',
  'pips',
  'pnlDollars',
  'result',
  'reason',
  'time',
  'closeTime',
  'duration',
  'maxDrawdownPips',
  'maxRunupPips',
  'confluence',
  'exchangeOrderId',
  'exchange',
  'positionId',
  'openedAt',
  'closedAt',
  'legacy',
]);

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Deep copy that keeps `undefined` out and never throws on exotic values. */
function deepCopy(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepCopy);
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* fall through to the JSON copy */
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

/** A finite number, or null. Never zero for an invalid value. */
function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Validate a candidate trade and build its archive record.
 * @returns {{ ok: boolean, code?: string, message?: string, record?: object }}
 */
export function normalizeTradeRecord(input, { now = Date.now() } = {}) {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      code: ARCHIVE_CODES.INVALID_INPUT,
      message: 'A journal record must be an object.',
    };
  }

  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!id) {
    return {
      ok: false,
      code: ARCHIVE_CODES.INVALID_TRADE_ID,
      message: 'A journal record must carry a non-empty trade id.',
    };
  }

  // The booked P&L must be a real, finite number. A missing, NaN or infinite
  // value is REJECTED — it is never coerced to zero, which would turn an
  // unknown outcome into a fabricated break-even.
  const pnlDollars = input.pnlDollars;
  if (typeof pnlDollars !== 'number' || !Number.isFinite(pnlDollars)) {
    return {
      ok: false,
      code: ARCHIVE_CODES.INVALID_PNL,
      message:
        'A journal record must carry a finite numeric pnlDollars. Missing, NaN and infinite values are rejected.',
    };
  }

  const closedAt = finiteOrNull(input.closedAt);
  const openedAt = finiteOrNull(input.openedAt);

  const record = {
    id,
    // A missing close timestamp stays null. It is NEVER invented.
    closedAt,
    legacy: closedAt === null,
    asset: typeof input.asset === 'string' ? input.asset : null,
    type: typeof input.type === 'string' ? input.type : null,
    lotSize: finiteOrNull(input.lotSize),
    entryPrice: finiteOrNull(input.entryPrice),
    exitPrice: finiteOrNull(input.exitPrice),
    tp: finiteOrNull(input.tp),
    sl: finiteOrNull(input.sl),
    pips: finiteOrNull(input.pips),
    pnlDollars,
    result: typeof input.result === 'string' ? input.result : null,
    reason: typeof input.reason === 'string' ? input.reason : null,
    time: typeof input.time === 'string' ? input.time : null,
    closeTime: typeof input.closeTime === 'string' ? input.closeTime : null,
    duration: typeof input.duration === 'string' ? input.duration : null,
    maxDrawdownPips: finiteOrNull(input.maxDrawdownPips),
    maxRunupPips: finiteOrNull(input.maxRunupPips),
    confluence: finiteOrNull(input.confluence),
    exchangeOrderId:
      typeof input.exchangeOrderId === 'string' && input.exchangeOrderId.trim() !== ''
        ? input.exchangeOrderId
        : null,
    exchange: typeof input.exchange === 'string' ? input.exchange : null,
    positionId:
      typeof input.positionId === 'string' && input.positionId.trim() !== ''
        ? input.positionId
        : null,
    openedAt,
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    archivedAt: now,
    // The complete original record is preserved verbatim so that no field is
    // lost, including fields this module does not know about.
    source: deepCopy(input),
  };

  return { ok: true, code: ARCHIVE_CODES.OK, record };
}

/**
 * A deterministic fingerprint of the SEMANTIC content of a record.
 * Archive-only metadata (seq, archivedAt, schemaVersion) is excluded, so an
 * identical trade re-archived later is recognised as the same trade.
 */
export function tradeFingerprint(record) {
  if (!isPlainObject(record)) return 'invalid';
  const semantic = {};
  for (const field of SEMANTIC_FIELDS) {
    if (field === 'closedAt' && record.closedAt === null && record.legacy === true) {
      // A legacy row without a close timestamp compares on the remaining
      // fields only.
      semantic.closedAt = null;
      continue;
    }
    semantic[field] = record[field] === undefined ? null : record[field];
  }
  const keys = Object.keys(semantic).sort();
  return JSON.stringify(keys.map((k) => [k, semantic[k]]));
}

/** True when two archive records carry the same financial content. */
export function sameTradeContent(a, b) {
  return tradeFingerprint(a) === tradeFingerprint(b);
}

/**
 * Create an archive instance.
 *
 * @param {object} [options]
 * @param {Function} [options.resolveIndexedDB] returns the IndexedDB factory
 * @param {string} [options.dbName]
 * @param {number} [options.schemaVersion]
 * @param {Function} [options.now] injectable clock
 */
export function createPaperArchive(options = {}) {
  const {
    dbName = ARCHIVE_DB_NAME,
    schemaVersion = ARCHIVE_SCHEMA_VERSION,
    resolveIndexedDB = () =>
      typeof globalThis !== 'undefined' ? globalThis.indexedDB : undefined,
    now = () => Date.now(),
  } = options;

  let dbHandle = null;
  let opening = null;

  const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

  const openRequest = (idb) =>
    new Promise((resolve, reject) => {
      let request;
      try {
        request = idb.open(dbName, schemaVersion);
      } catch (err) {
        reject(err);
        return;
      }
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(JOURNAL_STORE)) {
          const store = db.createObjectStore(JOURNAL_STORE, {
            keyPath: 'seq',
            autoIncrement: true,
          });
          store.createIndex('by_id', 'id', { unique: true });
          store.createIndex('by_closedAt', 'closedAt', { unique: false });
          store.createIndex('by_asset', 'asset', { unique: false });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
      request.onblocked = () => {
        reject(Object.assign(new Error('The archive database is blocked by another connection.'), {
          name: 'BlockedError',
        }));
      };
      request.onerror = () => {
        reject(request.error || new Error('The archive database could not be opened.'));
      };
      request.onsuccess = () => resolve(request.result);
    });

  const ensureOpen = async () => {
    if (dbHandle) return { ok: true, db: dbHandle };
    if (opening) return opening;

    const idb = resolveIndexedDB();
    if (!idb || typeof idb.open !== 'function') {
      return fail(
        ARCHIVE_CODES.ARCHIVE_UNAVAILABLE,
        'IndexedDB is not available in this environment, so the journal archive is disabled.'
      );
    }

    opening = openRequest(idb)
      .then((db) => {
        dbHandle = db;
        opening = null;
        return { ok: true, db };
      })
      .catch((err) => {
        opening = null;
        const name = err && err.name;
        if (name === 'BlockedError') {
          return fail(ARCHIVE_CODES.ARCHIVE_BLOCKED, err.message);
        }
        if (name === 'VersionError') {
          return fail(ARCHIVE_CODES.ARCHIVE_VERSION_ERROR, err.message);
        }
        return fail(ARCHIVE_CODES.ARCHIVE_OPEN_FAILED, err.message || 'The archive database could not be opened.');
      });

    return opening;
  };

  const awaitTransaction = (tx) =>
    new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('The archive transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('The archive transaction was aborted.'));
    });

  const readById = (store, id) =>
    new Promise((resolve, reject) => {
      const request = store.index('by_id').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('The archive lookup failed.'));
    });

  const archiveBatch = async (records) => {
    const list = Array.isArray(records) ? records : [];
    if (list.length === 0) {
      return {
        ok: true,
        code: ARCHIVE_CODES.OK,
        archived: [],
        duplicates: [],
        conflicts: [],
        rejected: [],
        committed: [],
      };
    }

    const opened = await ensureOpen();
    if (!opened.ok) return opened;

    const prepared = [];
    for (const input of list) {
      const normalized = normalizeTradeRecord(input, { now: now() });
      if (!normalized.ok) {
        prepared.push({ ok: false, input, code: normalized.code, message: normalized.message });
        continue;
      }
      prepared.push({ ok: true, input, record: normalized.record });
    }

    const summary = {
      ok: true,
      code: ARCHIVE_CODES.OK,
      archived: [],
      duplicates: [],
      conflicts: [],
      rejected: [],
      committed: [],
    };

    let tx;
    try {
      tx = opened.db.transaction(JOURNAL_STORE, 'readwrite');
    } catch (err) {
      return fail(ARCHIVE_CODES.ARCHIVE_WRITE_FAILED, err.message || 'The archive transaction could not be started.');
    }

    const store = tx.objectStore(JOURNAL_STORE);
    let writeError = null;

    // Issue the write requests. A record is only reported as archived when its
    // OWN request succeeded — a completed transaction alone is not proof that
    // this record was written.
    for (const item of prepared) {
      if (!item.ok) continue;

      const request = store.add(item.record);

      request.onsuccess = () => {
        summary.archived.push(item.record);
      };

      request.onerror = (event) => {
        const error = event && event.target ? event.target.error : null;
        const name = error && error.name;

        if (name === 'ConstraintError') {
          // A unique-index violation is NOT proof that the stored trade is the
          // same trade. Keep the transaction alive, re-read the stored row and
          // compare the normalised financial content.
          if (event && typeof event.preventDefault === 'function') event.preventDefault();

          const lookup = store.index('by_id').get(item.record.id);
          lookup.onsuccess = () => {
            const existing = lookup.result || null;
            if (existing && sameTradeContent(existing, item.record)) {
              summary.duplicates.push({ id: item.record.id, record: existing });
            } else {
              summary.conflicts.push({ id: item.record.id, existing, incoming: item.record });
            }
          };
          lookup.onerror = () => {
            summary.conflicts.push({ id: item.record.id, existing: null, incoming: item.record });
          };
          return;
        }

        writeError = error || new Error('The archive write failed.');
      };
    }

    try {
      await awaitTransaction(tx);
    } catch (err) {
      // The transaction did not complete: NOTHING is reported as committed.
      const name = err && err.name;
      if (name === 'QuotaExceededError') {
        return fail(ARCHIVE_CODES.QUOTA_EXCEEDED, err.message || 'The archive storage quota was exceeded.', {
          committed: [],
          archived: [],
          duplicates: [],
          conflicts: [],
          rejected: summary.rejected,
        });
      }
      return fail(ARCHIVE_CODES.ARCHIVE_BATCH_ABORTED, err.message || 'The archive transaction was aborted.', {
        committed: [],
        archived: [],
        duplicates: [],
        conflicts: [],
        rejected: summary.rejected,
      });
    }

    // The transaction completed. Only records whose own request succeeded are
    // reported as archived; duplicates and conflicts are reported separately.
    for (const item of prepared) {
      if (!item.ok) {
        summary.rejected.push({ code: item.code, message: item.message, id: item.input && item.input.id });
      }
    }
    summary.committed = summary.archived.map((r) => r.id);
    if (writeError) {
      summary.ok = false;
      summary.code = ARCHIVE_CODES.ARCHIVE_WRITE_FAILED;
      summary.message = writeError.message || 'An archive write failed.';
    }
    return summary;
  };

  return {
    dbName,
    schemaVersion,

    /** Open the archive (idempotent). */
    async openArchive() {
      const opened = await ensureOpen();
      if (!opened.ok) return opened;
      return {
        ok: true,
        code: ARCHIVE_CODES.OK,
        dbName,
        schemaVersion,
        message: 'The journal archive is open.',
      };
    },

    /** Archive one trade. */
    async archiveTrade(record) {
      const result = await archiveBatch([record]);
      if (!result.ok) return result;
      if (result.conflicts.length > 0) {
        return {
          ok: false,
          code: ARCHIVE_CODES.CONFLICT,
          message:
            'A trade with this id already exists in the archive with different content. Nothing was overwritten.',
          conflict: result.conflicts[0],
          committed: result.committed,
        };
      }
      if (result.duplicates.length > 0) {
        return {
          ok: true,
          code: ARCHIVE_CODES.DUPLICATE,
          message: 'This trade is already archived. Nothing was written.',
          record: result.duplicates[0].record,
          committed: result.committed,
        };
      }
      if (result.rejected.length > 0) {
        return {
          ok: false,
          code: result.rejected[0].code,
          message: result.rejected[0].message,
          committed: result.committed,
        };
      }
      return {
        ok: true,
        code: ARCHIVE_CODES.ARCHIVED,
        message: 'The trade was archived.',
        record: result.archived[0] || null,
        committed: result.committed,
      };
    },

    /** Archive a batch atomically. */
    async archiveTrades(records) {
      const result = await archiveBatch(records);
      if (!result.ok) return result;
      const ok = result.conflicts.length === 0 && result.rejected.length === 0;
      return {
        ...result,
        ok,
        code: ok
          ? result.archived.length > 0
            ? ARCHIVE_CODES.ARCHIVED
            : ARCHIVE_CODES.OK
          : result.conflicts.length > 0
            ? ARCHIVE_CODES.CONFLICT
            : ARCHIVE_CODES.INVALID_INPUT,
        message: ok
          ? 'The batch was archived.'
          : 'The batch was not fully accepted. See conflicts and rejected.',
      };
    },

    /** Read one trade by its id. */
    async getTrade(id) {
      if (typeof id !== 'string' || !id.trim()) {
        return fail(ARCHIVE_CODES.INVALID_TRADE_ID, 'A trade id is required.');
      }
      const opened = await ensureOpen();
      if (!opened.ok) return opened;
      try {
        const tx = opened.db.transaction(JOURNAL_STORE, 'readonly');
        const record = await readById(tx.objectStore(JOURNAL_STORE), id.trim());
        if (!record) {
          return fail(ARCHIVE_CODES.NOT_FOUND, `No archived trade with id ${id}.`);
        }
        return { ok: true, code: ARCHIVE_CODES.OK, record, message: 'Trade found.' };
      } catch (err) {
        return fail(ARCHIVE_CODES.ARCHIVE_WRITE_FAILED, err.message || 'The archive lookup failed.');
      }
    },

    /**
     * Read archived trades.
     * @param {object} [opts]
     * @param {number} [opts.limit]
     * @param {number} [opts.offset]
     * @param {'asc'|'desc'} [opts.order] ordering by the insertion sequence
     * @param {string} [opts.asset]
     * @param {boolean} [opts.includeLegacy]
     */
    async getAllTrades(opts = {}) {
      const { limit, offset = 0, order = 'asc', asset = null, includeLegacy = true } = opts || {};
      const opened = await ensureOpen();
      if (!opened.ok) return opened;
      try {
        const tx = opened.db.transaction(JOURNAL_STORE, 'readonly');
        const all = await new Promise((resolve, reject) => {
          const request = tx.objectStore(JOURNAL_STORE).getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error || new Error('The archive read failed.'));
        });

        let records = all.slice().sort((a, b) => (a.seq || 0) - (b.seq || 0));
        if (asset) records = records.filter((r) => r.asset === asset);
        if (!includeLegacy) records = records.filter((r) => r.legacy !== true);
        if (offset) records = records.slice(offset);
        if (typeof limit === 'number' && limit >= 0) records = records.slice(0, limit);
        if (order === 'desc') records = records.reverse();

        return {
          ok: true,
          code: ARCHIVE_CODES.OK,
          records,
          count: records.length,
          total: all.length,
          message: 'Trades read from the archive.',
        };
      } catch (err) {
        return fail(ARCHIVE_CODES.ARCHIVE_WRITE_FAILED, err.message || 'The archive read failed.');
      }
    },

    /** A summary of the archive's state. */
    async getArchiveStatus() {
      const opened = await ensureOpen();
      if (!opened.ok) {
        return {
          ...opened,
          available: false,
          dbName,
          schemaVersion,
          tradeCount: 0,
          lastArchivedAt: null,
          lastError: opened.message,
        };
      }
      try {
        const tx = opened.db.transaction(JOURNAL_STORE, 'readonly');
        const all = await new Promise((resolve, reject) => {
          const request = tx.objectStore(JOURNAL_STORE).getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error || new Error('The archive read failed.'));
        });
        const sorted = all.slice().sort((a, b) => (a.seq || 0) - (b.seq || 0));
        const closed = sorted.filter((r) => typeof r.closedAt === 'number');
        const last = sorted[sorted.length - 1] || null;

        return {
          ok: true,
          code: ARCHIVE_CODES.OK,
          available: true,
          dbName,
          schemaVersion,
          tradeCount: sorted.length,
          legacyCount: sorted.filter((r) => r.legacy === true).length,
          oldestClosedAt: closed.length ? closed[0].closedAt : null,
          newestClosedAt: closed.length ? closed[closed.length - 1].closedAt : null,
          lastArchivedAt: last ? last.archivedAt : null,
          lastError: null,
          message: 'Archive status read.',
        };
      } catch (err) {
        return fail(ARCHIVE_CODES.ARCHIVE_WRITE_FAILED, err.message || 'The archive status read failed.');
      }
    },

    /** Read a metadata value. */
    async readMeta(key) {
      if (typeof key !== 'string' || !key.trim()) {
        return fail(ARCHIVE_CODES.INVALID_INPUT, 'A metadata key is required.');
      }
      const opened = await ensureOpen();
      if (!opened.ok) return opened;
      try {
        const tx = opened.db.transaction(META_STORE, 'readonly');
        const record = await new Promise((resolve, reject) => {
          const request = tx.objectStore(META_STORE).get(key.trim());
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error || new Error('The metadata read failed.'));
        });
        if (!record) {
          return {
            ok: true,
            code: ARCHIVE_CODES.META_NOT_FOUND,
            value: null,
            message: `No metadata stored under ${key}.`,
          };
        }
        return {
          ok: true,
          code: ARCHIVE_CODES.OK,
          value: record.value,
          record,
          message: 'Metadata read.',
        };
      } catch (err) {
        return fail(ARCHIVE_CODES.ARCHIVE_WRITE_FAILED, err.message || 'The metadata read failed.');
      }
    },

    /** Write a metadata value. */
    async writeMeta(key, value) {
      if (typeof key !== 'string' || !key.trim()) {
        return fail(ARCHIVE_CODES.INVALID_INPUT, 'A metadata key is required.');
      }
      const opened = await ensureOpen();
      if (!opened.ok) return opened;
      try {
        const tx = opened.db.transaction(META_STORE, 'readwrite');
        const store = tx.objectStore(META_STORE);
        const request = store.put({ key: key.trim(), value: deepCopy(value) });
        await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error || new Error('The metadata write failed.'));
        });
        await awaitTransaction(tx);
        return {
          ok: true,
          code: ARCHIVE_CODES.OK,
          value: deepCopy(value),
          message: 'Metadata written.',
        };
      } catch (err) {
        const name = err && err.name;
        if (name === 'QuotaExceededError') {
          return fail(ARCHIVE_CODES.QUOTA_EXCEEDED, err.message || 'The archive storage quota was exceeded.');
        }
        return fail(ARCHIVE_CODES.ARCHIVE_WRITE_FAILED, err.message || 'The metadata write failed.');
      }
    },

    /** Close the archive connection. */
    async closeArchive() {
      if (dbHandle) {
        try {
          dbHandle.close();
        } catch {
          /* closing must never throw */
        }
        dbHandle = null;
      }
      opening = null;
      return {
        ok: true,
        code: ARCHIVE_CODES.ARCHIVE_CLOSED,
        message: 'The journal archive is closed.',
      };
    },
  };
}

/**
 * The default archive instance. It resolves the IndexedDB factory lazily, so
 * importing this module in a non-browser environment is safe.
 */
export const paperArchive = createPaperArchive();

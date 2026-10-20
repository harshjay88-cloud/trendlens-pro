/**
 * TrendLens Pro — versioned paper-account commit envelope (PURE).
 *
 * This module defines the crash-safe commit protocol that will connect the
 * paper account to the IndexedDB journal archive. It is PURE:
 *
 *   - no browser storage, no IndexedDB, no network, no React, no Zustand;
 *   - no randomness beyond an explicitly injected id suffix;
 *   - it never mutates its inputs;
 *   - identical input always produces identical output.
 *
 * WHY A SINGLE ENVELOPE
 * ---------------------
 * The rejected "spool, then update the account, then archive" protocol could
 * archive a trade whose accounting update was never committed. The envelope
 * removes that window: the committed account state AND the archive records
 * that must be archived are written together, in ONE storage write, as one
 * unit. A trade can only become eligible for archival because it is part of a
 * committed accounting transition.
 *
 * ENVELOPE SHAPE
 * --------------
 *   {
 *     schemaVersion: 2,
 *     generation: 'gen_<ms>_<suffix>',   // ledger generation
 *     revision: 7,                        // monotonic commit counter
 *     account: { ... },                   // the full account state, verbatim
 *     pendingArchive: [                   // committed trades awaiting archival
 *       { id, generation, committedAt, trade: { ... } }
 *     ],
 *     committedAt: '2026-10-20T15:00:00.000Z'
 *   }
 *
 * INVARIANTS ENFORCED HERE
 * -------------------------
 *  1. The account state is copied VERBATIM. This module never recalculates a
 *     balance, a P&L value or a counter.
 *  2. A pending record only exists if it is part of a committed envelope.
 *  3. A pending record is removed ONLY after an explicit archive confirmation.
 *     There is no path that silently drops a pending record.
 *  4. A duplicate trade id with identical content is a no-op; with different
 *     content it is a CONFLICT and is never merged.
 *  5. A missing close timestamp is never invented.
 *  6. A reset produces a NEW generation. The generation travels with every
 *     pending record so archived history from an earlier ledger is never mixed
 *     into the new one.
 *  7. A full pending queue REFUSES the commit. Records are never dropped to
 *     satisfy a size limit.
 *  8. Timestamps are never used to resolve competing financial writes. A
 *     revision/generation check detects them and the caller must fail closed.
 */

export const ENVELOPE_SCHEMA_VERSION = 2;
export const MIN_ENVELOPE_SCHEMA_VERSION = 2;

/** The legacy account key. Read-only from now on; never deleted automatically. */
export const LEGACY_ACCOUNT_KEY = 'tl_demo_account';
/** The versioned envelope key. */
export const ENVELOPE_ACCOUNT_KEY = 'tl_demo_account_v2';
/** Where an unreadable payload is preserved instead of being discarded. */
export const QUARANTINE_KEY_SUFFIX = '_corrupt';

/**
 * The pending queue never drops records to fit this limit: a commit that would
 * exceed it is REFUSED so the caller can surface the problem and the user can
 * export.
 */
export const MAX_PENDING_ARCHIVE_RECORDS = 500;

export const ENVELOPE_CODES = Object.freeze({
  OK: 'OK',
  INVALID_ENVELOPE: 'INVALID_ENVELOPE',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  INVALID_ACCOUNT: 'INVALID_ACCOUNT',
  INVALID_TRADE_ID: 'INVALID_TRADE_ID',
  INVALID_PNL: 'INVALID_PNL',
  INVALID_TRADE: 'INVALID_TRADE',
  DUPLICATE_PENDING: 'DUPLICATE_PENDING',
  CONFLICTING_PENDING: 'CONFLICTING_PENDING',
  PENDING_QUEUE_FULL: 'PENDING_QUEUE_FULL',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  GENERATION_MISMATCH: 'GENERATION_MISMATCH',
  ENVELOPE_CORRUPT: 'ENVELOPE_CORRUPT',
  LEGACY_CORRUPT: 'LEGACY_CORRUPT',
  RECOVERY_REQUIRED: 'RECOVERY_REQUIRED',
  NO_SINGLE_WRITER: 'NO_SINGLE_WRITER',
  LOCK_NOT_HELD: 'LOCK_NOT_HELD',
  REVISION_NOT_REVALIDATED: 'REVISION_NOT_REVALIDATED',
  ARCHIVED: 'ARCHIVED',
  STILL_PENDING: 'STILL_PENDING',
  CONFLICT: 'CONFLICT',
});

/**
 * CROSS-TAB CONCURRENCY POLICY (future store integration)
 * -------------------------------------------------------
 *
 * A revision check is a DETECTION aid, not mutual exclusion: two tabs can read
 * the same revision, both pass the check, and both write. A localStorage lease
 * has the same weakness — it is not an atomic compare-and-set. Storage events
 * and BroadcastChannel deliver notifications, never exclusion, and a message
 * can be missed entirely.
 *
 * The only browser primitive that provides real mutual exclusion is the Web
 * Locks API (`navigator.locks.request`). It is asynchronous, so the future
 * commit path must become asynchronous.
 *
 * THEREFORE:
 *  - PREFERRED: hold a Web Lock around the whole read-modify-write cycle.
 *  - FALLBACK: if no reliable single-writer mechanism is available, every
 *    financial write MUST fail closed (be refused), never proceed optimistically.
 *  - ALL persisted account writers must be serialized, not only the trade
 *    closes. A price tick that writes the account concurrently with a close
 *    can lose the close (or the tick) just as a second tab can.
 */
export const CONCURRENCY_POLICY = Object.freeze({
  preferredMechanism: 'web-locks',
  preferredApi: 'navigator.locks.request(name, callback)',
  fallbackMechanism: 'none',
  /**
   * A localStorage lease is NOT an acceptable substitute for an atomic
   * compare-and-swap. It is an advisory signal only and must never
   * authorize a financial write on its own.
   */
  leaseIsAuthoritative: false,
  leaseNote:
    'A localStorage lease is not an atomic compare-and-set: two writers can both ' +
    'observe it as free. It may be used to detect a likely conflict, never to ' +
    'authorize a financial write.',
  failClosedWhenUnavailable: true,
  /**
   * The three preconditions that must ALL hold before a financial commit is
   * permitted. They are checked separately so a capability check can never be
   * mistaken for permission.
   */
  permissionPreconditions: Object.freeze([
    'lockApiSupported',        // the Web Locks API exists in this browser
    'exclusiveLockAcquired',   // the caller actually holds the exclusive lock
    'revisionReReadUnderLock', // the persisted revision/generation were re-read under it
  ]),
  /** Every store action that persists the account must take the writer lock. */
  serializedWriters: Object.freeze([
    'openDemoTrade',
    'closeDemoTrade',
    'addSingleExecutedTrade',
    'updateOpenTradeOrderId',
    'updateTickPnL',
    'toggleAutoBot',
    'resetDemoAccount',
  ]),
  note:
    'A revision check detects a competing write but does not prevent it, and a localStorage ' +
    'lease is not an atomic compare-and-set. Without the Web Locks API the store must refuse ' +
    'financial writes. Price-tick writers are included because they persist the account too.',
});

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

/** Deep copy that keeps plain data and never throws. */
function deepCopy(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepCopy);
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* fall through */
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

/**
 * A deterministic fingerprint of the financial content of a trade.
 * Archive metadata (archivedAt, seq, schemaVersion) is excluded so an
 * identical trade archived later is recognised as the same trade.
 */
export function tradeContentFingerprint(trade) {
  if (!isPlainObject(trade)) return 'invalid';
  const keys = Object.keys(trade)
    .filter((k) => k !== 'archivedAt' && k !== 'seq' && k !== 'schemaVersion' && k !== 'source')
    .sort();
  return JSON.stringify(keys.map((k) => [k, trade[k] === undefined ? null : trade[k]]));
}

/**
 * Build a ledger generation id.
 * @param {object} options
 * @param {number} options.now epoch ms
 * @param {string} [options.suffix] injected uniqueness suffix
 */
export function createGenerationId({ now, suffix = '0' } = {}) {
  const stamp = Number.isFinite(now) ? String(now) : '0';
  return `gen_${stamp}_${suffix}`;
}

/**
 * Validate a pending trade record.
 * A trade must have a stable string id and a finite, already-booked P&L.
 * A missing close timestamp is preserved as null — it is never invented.
 */
export function validatePendingTrade(trade) {
  if (!isPlainObject(trade)) {
    return fail(ENVELOPE_CODES.INVALID_TRADE, 'A pending archive record must be an object.');
  }
  const id = typeof trade.id === 'string' ? trade.id.trim() : '';
  if (!id) {
    return fail(ENVELOPE_CODES.INVALID_TRADE_ID, 'A pending archive record must carry a non-empty trade id.');
  }
  if (typeof trade.pnlDollars !== 'number' || !Number.isFinite(trade.pnlDollars)) {
    return fail(
      ENVELOPE_CODES.INVALID_PNL,
      'A pending archive record must carry a finite numeric pnlDollars. Missing, NaN and infinite values are refused.'
    );
  }
  return { ok: true, code: ENVELOPE_CODES.OK, message: 'Valid pending record.', id };
}

/**
 * Validate a complete envelope.
 * @returns {{ ok: boolean, envelope?: object, code: string, message: string }}
 */
export function classifyEnvelope(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return fail(ENVELOPE_CODES.INVALID_ENVELOPE, `The account envelope is not valid JSON: ${err.message}`);
    }
  }
  if (!isPlainObject(parsed)) {
    return fail(ENVELOPE_CODES.INVALID_ENVELOPE, 'The account envelope must be an object.');
  }

  const version = parsed.schemaVersion;
  if (typeof version !== 'number' || !Number.isFinite(version)) {
    return fail(ENVELOPE_CODES.INVALID_ENVELOPE, 'The account envelope is missing a numeric schemaVersion.');
  }
  if (version < MIN_ENVELOPE_SCHEMA_VERSION || version > ENVELOPE_SCHEMA_VERSION) {
    return fail(
      ENVELOPE_CODES.UNSUPPORTED_VERSION,
      `Account envelope schema version ${version} is not supported by this build (expected ${MIN_ENVELOPE_SCHEMA_VERSION}-${ENVELOPE_SCHEMA_VERSION}).`
    );
  }
  if (typeof parsed.generation !== 'string' || parsed.generation.trim() === '') {
    return fail(ENVELOPE_CODES.INVALID_ENVELOPE, 'The account envelope is missing a ledger generation.');
  }
  if (typeof parsed.revision !== 'number' || !Number.isFinite(parsed.revision) || parsed.revision < 0) {
    return fail(ENVELOPE_CODES.INVALID_ENVELOPE, 'The account envelope is missing a valid revision.');
  }
  if (!isPlainObject(parsed.account)) {
    return fail(ENVELOPE_CODES.INVALID_ACCOUNT, 'The account envelope is missing its account state.');
  }
  if (!Array.isArray(parsed.pendingArchive)) {
    return fail(ENVELOPE_CODES.INVALID_ENVELOPE, 'The account envelope is missing its pendingArchive list.');
  }
  for (const entry of parsed.pendingArchive) {
    if (!isPlainObject(entry)) {
      return fail(ENVELOPE_CODES.INVALID_ENVELOPE, 'A pendingArchive entry is not an object.');
    }
    const check = validatePendingTrade(entry.trade);
    if (!check.ok) {
      return fail(check.code, `A pendingArchive entry is invalid: ${check.message}`);
    }
    if (typeof entry.id !== 'string' || entry.id.trim() === '') {
      return fail(ENVELOPE_CODES.INVALID_ENVELOPE, 'A pendingArchive entry is missing its trade id.');
    }
  }

  return {
    ok: true,
    code: ENVELOPE_CODES.OK,
    message: 'The account envelope is valid.',
    envelope: {
      schemaVersion: version,
      generation: parsed.generation,
      revision: parsed.revision,
      account: deepCopy(parsed.account),
      pendingArchive: deepCopy(parsed.pendingArchive),
      committedAt: typeof parsed.committedAt === 'string' ? parsed.committedAt : null,
    },
  };
}

/**
 * Create the first envelope for an account.
 */
export function createInitialEnvelope({ account, generation, now } = {}) {
  if (!isPlainObject(account)) {
    return fail(ENVELOPE_CODES.INVALID_ACCOUNT, 'An account state is required to create an envelope.');
  }
  const envelope = {
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    generation: typeof generation === 'string' && generation ? generation : createGenerationId({ now }),
    revision: 0,
    account: deepCopy(account),
    pendingArchive: [],
    committedAt: now !== undefined && now !== null ? new Date(now).toISOString() : null,
  };
  return { ok: true, code: ENVELOPE_CODES.OK, message: 'Envelope created.', envelope };
}

/**
 * Append a committed trade to the pending archive queue.
 * A duplicate id with identical content is a no-op; with different content it
 * is a CONFLICT and is never merged.
 */
export function appendPendingTrade(envelope, trade, { now } = {}) {
  const classified = classifyEnvelope(envelope);
  if (!classified.ok) return classified;

  const check = validatePendingTrade(trade);
  if (!check.ok) return check;

  const current = classified.envelope;
  const pending = current.pendingArchive;

  const existing = pending.find((entry) => entry.id === check.id);
  if (existing) {
    const same = tradeContentFingerprint(existing.trade) === tradeContentFingerprint(trade);
    if (same) {
      return {
        ok: true,
        code: ENVELOPE_CODES.DUPLICATE_PENDING,
        message: 'This trade is already pending archival. Nothing was changed.',
        envelope: current,
      };
    }
    return fail(
      ENVELOPE_CODES.CONFLICTING_PENDING,
      `A different trade with id ${check.id} is already pending archival. The two were not merged.`,
      { envelope: current }
    );
  }

  if (pending.length >= MAX_PENDING_ARCHIVE_RECORDS) {
    return fail(
      ENVELOPE_CODES.PENDING_QUEUE_FULL,
      `The pending archive queue is full (${MAX_PENDING_ARCHIVE_RECORDS} records). Records are never dropped to make room; archive or export first.`,
      { envelope: current }
    );
  }

  const entry = {
    id: check.id,
    generation: current.generation,
    committedAt: now !== undefined && now !== null ? new Date(now).toISOString() : null,
    trade: deepCopy(trade),
  };

  const next = {
    ...current,
    pendingArchive: [...pending, entry],
  };

  return { ok: true, code: ENVELOPE_CODES.OK, message: 'Trade queued for archival.', envelope: next, id: check.id };
}

/**
 * Build the next committed envelope.
 * The account state is copied VERBATIM. A pending trade is optional and, when
 * present, must belong to this same commit.
 */
export function buildNextEnvelope({ current, account, pendingTrade = null, now } = {}) {
  const classified = classifyEnvelope(current);
  if (!classified.ok) return classified;
  if (!isPlainObject(account)) {
    return fail(ENVELOPE_CODES.INVALID_ACCOUNT, 'The next account state must be an object.');
  }

  const base = classified.envelope;

  let envelope = {
    ...base,
    revision: base.revision + 1,
    account: deepCopy(account),
    committedAt: now !== undefined && now !== null ? new Date(now).toISOString() : null,
  };

  if (pendingTrade !== null && pendingTrade !== undefined) {
    const appended = appendPendingTrade(envelope, pendingTrade, { now });
    if (!appended.ok) return appended;
    envelope = appended.envelope;
  }

  return { ok: true, code: ENVELOPE_CODES.OK, message: 'Envelope committed.', envelope };
}

/**
 * Remove ONLY the pending records that the archive has confirmed.
 * A record that was not confirmed is never removed.
 */
export function confirmArchivedTrades(envelope, ids) {
  const classified = classifyEnvelope(envelope);
  if (!classified.ok) return classified;

  const confirmed = new Set(
    (Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && id.trim() !== '')
  );

  const current = classified.envelope;
  const removed = [];
  const notPending = [];
  const stillPending = [];

  for (const id of confirmed) {
    const entry = current.pendingArchive.find((e) => e.id === id);
    if (!entry) {
      notPending.push(id);
      continue;
    }
    removed.push(id);
  }

  for (const entry of current.pendingArchive) {
    if (!confirmed.has(entry.id)) stillPending.push(entry.id);
  }

  const next = {
    ...current,
    // A pending record is removed ONLY when the archive confirmed that exact
    // id. Every other record stays queued.
    pendingArchive: current.pendingArchive.filter((entry) => !confirmed.has(entry.id)),
  };

  return {
    ok: true,
    code: ENVELOPE_CODES.OK,
    message: 'Archive confirmations applied.',
    envelope: next,
    removed,
    notPending,
    stillPending,
  };
}

/**
 * Reconcile the pending queue against the archive.
 *
 * @param {object} envelope
 * @param {object} archive
 * @param {string[]} archive.archivedIds
 * @param {Object<string,string>} archive.fingerprints id -> content fingerprint
 */
export function reconcilePendingArchive(envelope, archive = {}) {
  const classified = classifyEnvelope(envelope);
  if (!classified.ok) return classified;

  const archivedIds = new Set(Array.isArray(archive.archivedIds) ? archive.archivedIds : []);
  const fingerprints = isPlainObject(archive.fingerprints) ? archive.fingerprints : {};

  const pending = [];
  const archived = [];
  const conflicts = [];

  for (const entry of classified.envelope.pendingArchive) {
    if (!archivedIds.has(entry.id)) {
      pending.push(entry.id);
      continue;
    }
    const stored = fingerprints[entry.id];
    if (stored !== undefined && stored !== tradeContentFingerprint(entry.trade)) {
      conflicts.push({ id: entry.id, reason: 'The archived record differs from the committed one.' });
      continue;
    }
    archived.push(entry.id);
  }

  return {
    ok: true,
    code: conflicts.length ? ENVELOPE_CODES.CONFLICT : ENVELOPE_CODES.OK,
    message: 'Pending archive reconciled.',
    pending,
    archived,
    conflicts,
  };
}

/**
 * Migrate a legacy account (the old `tl_demo_account` shape) into an envelope.
 *
 * The legacy account state is copied VERBATIM: balance, equity, counters, the
 * open position and the retained journal are preserved exactly. The legacy
 * journal is NOT queued for archival here — queuing it would flood the
 * pending queue; it is archived by a separate, explicit migration step.
 */
export function migrateLegacyAccount(legacyAccount, { generation, now } = {}) {
  if (!isPlainObject(legacyAccount)) {
    return fail(ENVELOPE_CODES.INVALID_ACCOUNT, 'A legacy account must be an object.');
  }
  const account = deepCopy(legacyAccount);
  if (!Array.isArray(account.trades)) account.trades = [];
  if (!Array.isArray(account.simulatedTrades)) account.simulatedTrades = [];
  if (typeof account.breakevenCount !== 'number') account.breakevenCount = 0;

  return {
    ok: true,
    code: ENVELOPE_CODES.OK,
    message: 'Legacy account migrated into a versioned envelope.',
    envelope: {
      schemaVersion: ENVELOPE_SCHEMA_VERSION,
      generation: typeof generation === 'string' && generation ? generation : createGenerationId({ now }),
      revision: 0,
      account,
      pendingArchive: [],
      committedAt: now !== undefined && now !== null ? new Date(now).toISOString() : null,
    },
  };
}

/**
 * Decide which payload is the source of truth.
 *
 * RULES (strictly ordered)
 * -----------------------
 *  1. A VALID versioned envelope wins. The legacy key is left untouched and is
 *     never used as a second writable account.
 *  2. A versioned envelope that EXISTS but CANNOT BE READ is a
 *     RECOVERY_REQUIRED situation. The raw payload is preserved (quarantined)
 *     and the function returns a failure. It NEVER falls back to the legacy
 *     account: the legacy copy is by definition older than the versioned
 *     envelope, so adopting it would silently roll the user's financial state
 *     backwards and could re-book trades that were already closed.
 *  3. ONLY when NO versioned envelope exists at all may a valid legacy
 *     account be migrated automatically.
 *  4. If neither payload can be read, the result is also RECOVERY_REQUIRED.
 *     A fresh account is never installed automatically; starting over must be
 *     an explicit, confirmed user action.
 *
 *  4. If NEITHER payload exists at all, this is a FRESH INSTALLATION — not
 *     corruption. A new account is created from the supplied default. This is
 *     the only case in which a default account is ever installed, and it is
 *     safe because there is no stored financial data to lose.
 *
 * The function never deletes a key. Quarantine entries are returned so the
 * storage layer can preserve the raw text under a quarantine key.
 *
 * `defaultAccount` is used ONLY for a genuine fresh installation. It is never
 * used to replace an existing, unreadable account.
 */
export function selectSourceOfTruth({
  versionedRaw = null,
  legacyRaw = null,
  defaultAccount = null,
  generation,
  now,
} = {}) {
  const notices = [];
  const quarantine = [];

  const hasVersioned = versionedRaw !== null && versionedRaw !== undefined;
  const hasLegacy = legacyRaw !== null && legacyRaw !== undefined;

  // ── 0. Nothing stored at all: a genuine FRESH INSTALLATION ─────────────
  if (!hasVersioned && !hasLegacy) {
    const initial = createInitialEnvelope({ account: defaultAccount, generation, now });
    if (!initial.ok) {
      return {
        ok: false,
        code: initial.code,
        source: 'fresh',
        envelope: null,
        notices,
        quarantine,
        message: 'A new account could not be initialised.',
      };
    }
    return {
      ok: true,
      source: 'fresh',
      envelope: initial.envelope,
      notices,
      quarantine,
      message: 'No stored account was found. A new account was initialised.',
    };
  }

  // ── 1. A valid versioned envelope is authoritative ──────────────────────
  if (hasVersioned) {
    const classified = classifyEnvelope(versionedRaw);
    if (classified.ok) {
      return {
        ok: true,
        source: 'versioned',
        envelope: classified.envelope,
        notices,
        quarantine,
        message: 'The versioned account envelope is authoritative.',
      };
    }

    // ── 2. The versioned envelope exists but is unreadable ───────────────
    // RECOVERY_REQUIRED. The legacy account is deliberately NOT used: it is
    // older, and adopting it would roll the financial state backwards.
    notices.push({
      code: ENVELOPE_CODES.ENVELOPE_CORRUPT,
      message: `The versioned account envelope could not be read: ${classified.message}`,
    });
    quarantine.push({ key: ENVELOPE_ACCOUNT_KEY, raw: versionedRaw, reason: classified.code });

    if (hasLegacy) {
      let legacyParsed = null;
      let legacyError = null;
      try {
        legacyParsed = typeof legacyRaw === 'string' ? JSON.parse(legacyRaw) : legacyRaw;
      } catch (err) {
        legacyError = err.message;
      }
      if (legacyError || !isPlainObject(legacyParsed)) {
        notices.push({
          code: ENVELOPE_CODES.LEGACY_CORRUPT,
          message: legacyError
            ? `The legacy account could not be parsed: ${legacyError}`
            : 'The legacy account is not an object.',
        });
        quarantine.push({ key: LEGACY_ACCOUNT_KEY, raw: legacyRaw, reason: legacyError ? 'PARSE_ERROR' : 'NOT_AN_OBJECT' });
      } else {
        // The legacy account IS readable, but it must not become the active
        // writable financial account. It is preserved for manual recovery.
        notices.push({
          code: ENVELOPE_CODES.LEGACY_CORRUPT,
          message:
            'A readable legacy account was preserved for manual recovery, but it was NOT adopted: it is older than the versioned envelope and using it would roll the financial state backwards.',
        });
        quarantine.push({ key: LEGACY_ACCOUNT_KEY, raw: legacyRaw, reason: 'OLDER_THAN_VERSIONED' });
      }
    }

    notices.push({
      code: ENVELOPE_CODES.RECOVERY_REQUIRED,
      message:
        'The stored account could not be read. The raw data was preserved and no replacement account was installed. ' +
        'Financial writes stay disabled until the account is recovered or the user explicitly starts over.',
    });

    return {
      ok: false,
      code: ENVELOPE_CODES.RECOVERY_REQUIRED,
      source: 'recovery-required',
      envelope: null,
      notices,
      quarantine,
      message: 'The stored account could not be read. Recovery is required before financial writes are allowed.',
    };
  }

  // ── 3. No versioned envelope exists: a valid legacy account may migrate ──
  if (hasLegacy) {
    let parsed = null;
    let parseError = null;
    try {
      parsed = typeof legacyRaw === 'string' ? JSON.parse(legacyRaw) : legacyRaw;
    } catch (err) {
      parseError = err.message;
    }

    if (parseError) {
      notices.push({
        code: ENVELOPE_CODES.LEGACY_CORRUPT,
        message: `The legacy account could not be parsed: ${parseError}`,
      });
      quarantine.push({ key: LEGACY_ACCOUNT_KEY, raw: legacyRaw, reason: 'PARSE_ERROR' });
    } else if (!isPlainObject(parsed)) {
      notices.push({
        code: ENVELOPE_CODES.LEGACY_CORRUPT,
        message: 'The legacy account is not an object.',
      });
      quarantine.push({ key: LEGACY_ACCOUNT_KEY, raw: legacyRaw, reason: 'NOT_AN_OBJECT' });
    } else {
      const migrated = migrateLegacyAccount(parsed, { generation, now });
      if (!migrated.ok) {
        notices.push({ code: ENVELOPE_CODES.LEGACY_CORRUPT, message: migrated.message });
        quarantine.push({ key: LEGACY_ACCOUNT_KEY, raw: legacyRaw, reason: migrated.code });
      } else {
        return {
          ok: true,
          source: 'legacy-migrated',
          envelope: migrated.envelope,
          notices,
          quarantine,
          message: 'The legacy account was migrated into a versioned envelope.',
        };
      }
    }
  }

  // ── 4. Nothing readable ────────────────────────────────────────────────
  notices.push({
    code: ENVELOPE_CODES.RECOVERY_REQUIRED,
    message:
      'No readable account was found. The raw data was preserved and no replacement account was installed. ' +
      'Starting over must be an explicit, confirmed user action.',
  });

  return {
    ok: false,
    code: ENVELOPE_CODES.RECOVERY_REQUIRED,
    source: 'recovery-required',
    envelope: null,
    notices,
    quarantine,
    message: 'No readable account was found. Recovery is required before financial writes are allowed.',
  };
}

/**
 * Detect a competing financial write.
 *
 * IMPORTANT: this is a DETECTION aid, NOT mutual exclusion. Two tabs can read
 * the same revision, both pass this check and both write. It must never be
 * treated as a lock — see {@link CONCURRENCY_POLICY} for the mechanism that
 * provides real exclusion (the Web Locks API) and for the fail-closed rule
 * when it is unavailable.
 *
 * Timestamps are never used to resolve competing writes: two writes can land
 * in the same millisecond and a clock can move backwards. The revision counter
 * and the ledger generation are the only safe discriminators.
 */
export function detectConcurrentWrite({ observedRevision, observedGeneration, currentRevision, currentGeneration } = {}) {
  if (typeof currentGeneration === 'string' && currentGeneration !== observedGeneration) {
    return fail(
      ENVELOPE_CODES.GENERATION_MISMATCH,
      `The ledger generation changed (${observedGeneration} -> ${currentGeneration}). This action was refused.`
    );
  }
  if (typeof currentRevision === 'number' && currentRevision !== observedRevision) {
    return fail(
      ENVELOPE_CODES.CONCURRENT_MODIFICATION,
      `The account was modified elsewhere (revision ${observedRevision} -> ${currentRevision}). This action was refused to avoid a lost update.`
    );
  }
  return { ok: true, code: ENVELOPE_CODES.OK, message: 'No competing write detected.' };
}

/**
 * Describe the browser's locking CAPABILITY.
 *
 * This is a capability probe ONLY. It says nothing about whether a financial
 * commit is permitted — a supported API does not mean the caller owns a lock.
 * Use {@link assertFinancialCommitPermitted} for the permission decision.
 *
 * @param {object} options
 * @param {boolean} [options.webLocksSupported]
 */
export function describeConcurrencyCapability({ webLocksSupported = false } = {}) {
  if (webLocksSupported) {
    return {
      ok: true,
      code: ENVELOPE_CODES.OK,
      mechanism: 'web-locks',
      canAttemptLock: true,
      message:
        'The Web Locks API is available, so an exclusive lock can be attempted. ' +
        'Availability alone does not authorize a financial write.',
    };
  }
  return {
    ok: false,
    code: ENVELOPE_CODES.NO_SINGLE_WRITER,
    mechanism: 'none',
    canAttemptLock: false,
    message:
      'No proven exclusive-writer mechanism is available in this browser. A localStorage lease ' +
      'is not an atomic compare-and-set and cannot substitute for one, so financial mutations ' +
      'must fail closed.',
  };
}

/**
 * Decide whether a financial commit MAY proceed.
 *
 * All three preconditions must hold:
 *   1. the Web Locks API is supported           (capability)
 *   2. the caller actually holds the lock       (ownership)
 *   3. the persisted revision/generation were re-read under that lock (freshness)
 *
 * A localStorage lease is deliberately NOT an accepted precondition: it is not
 * an atomic compare-and-set, so it can never authorize a financial write.
 *
 * This helper is PURE: it does not acquire, hold or release a browser lock.
 * It only validates the caller's assertions and, when they hold, runs the
 * defensive revision check.
 *
 * @param {object} options
 * @param {boolean} [options.webLocksSupported]
 * @param {boolean} [options.lockHeld]      the caller holds the exclusive lock
 * @param {boolean} [options.revisionReRead] revision/generation re-read under the lock
 * @param {number}  [options.observedRevision]
 * @param {string}  [options.observedGeneration]
 * @param {number}  [options.currentRevision]
 * @param {string}  [options.currentGeneration]
 */
export function assertFinancialCommitPermitted({
  webLocksSupported = false,
  lockHeld = false,
  revisionReRead = false,
  observedRevision,
  observedGeneration,
  currentRevision,
  currentGeneration,
} = {}) {
  if (!webLocksSupported) {
    return fail(
      ENVELOPE_CODES.NO_SINGLE_WRITER,
      'No proven exclusive-writer mechanism is available, so financial mutations must fail closed. ' +
      'A localStorage lease is not an atomic compare-and-set and cannot authorize a write.',
      { mechanism: 'none', lockHeld: false, revisionReRead: false }
    );
  }

  if (!lockHeld) {
    return fail(
      ENVELOPE_CODES.LOCK_NOT_HELD,
      'The Web Locks API is supported but the caller does not hold the exclusive lock. ' +
      'Financial mutations must be performed inside navigator.locks.request().',
      { mechanism: 'web-locks', lockHeld: false, revisionReRead: false }
    );
  }

  if (!revisionReRead) {
    return fail(
      ENVELOPE_CODES.REVISION_NOT_REVALIDATED,
      'The exclusive lock is held but the persisted revision and generation were not re-read under it, ' +
      'so the state could already be stale. The commit was refused.',
      { mechanism: 'web-locks', lockHeld: true, revisionReRead: false }
    );
  }

  const detected = detectConcurrentWrite({
    observedRevision,
    observedGeneration,
    currentRevision,
    currentGeneration,
  });
  if (!detected.ok) {
    return {
      ...detected,
      mechanism: 'web-locks',
      lockHeld: true,
      revisionReRead: true,
    };
  }

  return {
    ok: true,
    code: ENVELOPE_CODES.OK,
    mechanism: 'web-locks',
    lockHeld: true,
    revisionReRead: true,
    message:
      'All three preconditions hold. The commit must still be performed inside the held lock, ' +
      'and the envelope must be written in a single storage write.',
  };
}

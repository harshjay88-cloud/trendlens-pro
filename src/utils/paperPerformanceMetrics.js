/**
 * Paper trading performance metrics — the authoritative calculation layer.
 *
 * This module is PURE:
 *   - no React, no Zustand, no network, no localStorage, no randomness;
 *   - it never mutates a trade record or an account;
 *   - identical input always produces identical output;
 *   - every metric that cannot be calculated is returned as `null` together
 *     with an explicit reason, never as a fabricated zero or percentage.
 *
 * SCOPE — READ THIS BEFORE DISPLAYING ANYTHING
 * ---------------------------------------------
 * The paper account stores at most 50 journal entries. Metrics computed from
 * that array therefore describe the RETAINED JOURNAL HISTORY, not the
 * lifetime history of the account. Older trades may already have been
 * discarded. The module reports this explicitly through `scope` and never
 * labels the result as all-time.
 *
 * SOURCES
 * -------
 *   - Journal-derived metrics come only from completed trade records.
 *   - Account equity comes from the account state (balance + unrealised P&L),
 *     never from journal totals.
 *   - Bot-run session results are a different population and are never mixed
 *     in. They are not an input to this module.
 *
 * METRIC SEMANTICS
 * ----------------
 *   totalClosedTrades  valid completed trade records in scope
 *   wins               completed trades with positive booked realized P&L
 *   losses             completed trades with negative booked realized P&L
 *   breakEvens         completed trades with exactly zero booked realized P&L
 *   winRate            wins / (wins + losses) * 100   (break-evens excluded;
 *                      null when there are no decided trades)
 *   realizedPnl        sum of valid booked realized P&L
 *   grossProfit        sum of positive realized P&L
 *   grossLoss          absolute sum of negative realized P&L
 *   profitFactor       grossProfit / grossLoss   (null when grossLoss is 0)
 *   averageWin         grossProfit / wins        (null when there are no wins)
 *   averageLoss        grossLoss / losses        (null when there are no losses)
 *   expectancy         realizedPnl / totalClosedTrades (null with no trades)
 *
 * No metric is ever derived from a confluence score or a signal confidence.
 */

import { classifyResult, normalizePnl, RESULT } from './paperAccounting.js';

/** The scope label used for every journal-derived metric. */
export const METRIC_SCOPE = Object.freeze({
  JOURNAL_RETAINED: 'journal-retained',
});

/** The journal retains at most this many entries (see the account store). */
export const MAX_RETAINED_JOURNAL_ENTRIES = 50;

/** Reasons a metric can be unavailable. */
export const UNAVAILABLE_REASON = Object.freeze({
  NO_VALID_TRADES: 'NO_VALID_TRADES',
  NO_DECIDED_TRADES: 'NO_DECIDED_TRADES',
  NO_WINS: 'NO_WINS',
  NO_LOSSES: 'NO_LOSSES',
  NO_ACCOUNT_STATE: 'NO_ACCOUNT_STATE',
  NOT_CALCULABLE: 'NOT_CALCULABLE',
});

/** Statuses that mark a record as NOT a completed trade. */
const NON_COMPLETED_STATUSES = Object.freeze([
  'active',
  'open',
  'pending',
  'rejected',
  'unresolved',
  'cancelled',
  'expired',
  'invalidated',
]);

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Decide whether a journal record is a completed trade.
 * @returns {{ completed: boolean, reason: string|null }}
 */
export function isCompletedTrade(trade) {
  if (!isPlainObject(trade)) {
    return { completed: false, reason: 'NOT_A_RECORD' };
  }

  if (trade.resolved === false) {
    return { completed: false, reason: 'NOT_RESOLVED' };
  }
  if (trade.completed === false) {
    return { completed: false, reason: 'NOT_COMPLETED' };
  }
  if (typeof trade.status === 'string') {
    const status = trade.status.trim().toLowerCase();
    if (NON_COMPLETED_STATUSES.includes(status)) {
      return { completed: false, reason: `STATUS_${status.toUpperCase()}` };
    }
  }
  if (trade.open === true) {
    return { completed: false, reason: 'STILL_OPEN' };
  }

  return { completed: true, reason: null };
}

/**
 * A trade record needs a stable identity to be counted exactly once.
 * @returns {boolean}
 */
function hasUsableId(trade) {
  return typeof trade.id === 'string' && trade.id.trim() !== '';
}

/**
 * Derive a chronological key for a journal record.
 *
 * A journal record has NO reliable timestamp: `time` and `closeTime` are
 * time-of-day strings ("10:05") that cannot be ordered across days. The
 * position id does carry an opening timestamp (`pos_<ms>_<counter>`), so it
 * is used when it is present and parseable.
 *
 * @returns {number|null} the key, or null when the record cannot be ordered
 */
function chronologyKey(trade) {
  if (typeof trade.id === 'string') {
    const match = /^pos_(\d+)(?:_\d+)?$/.exec(trade.id.trim());
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  if (Number.isFinite(trade.closedAt)) return trade.closedAt;
  return null;
}

/**
 * Resolve the chronological order of the valid records.
 *
 * When every valid record carries a parseable ordering key the order is
 * derived from that key, so the result is correct no matter how the caller
 * ordered the input array. When some records cannot be ordered, the journal's
 * own array order is used and the assumption is reported.
 *
 * The account store writes the journal NEWEST FIRST
 * (`[closedTrade, ...trades]`), so the array order is newest-first.
 */
function resolveChronology(records) {
  const keys = records.map((record) => chronologyKey(record.trade));
  const ordered = keys.every((key) => key !== null);

  if (ordered) {
    const sorted = records
      .map((record, index) => ({ record, key: keys[index], index }))
      .sort((a, b) => b.key - a.key || a.index - b.index);
    return {
      records: sorted.map((entry) => entry.record),
      ordering: 'derived-from-record-identifiers',
      orderingVerified: true,
      assumption:
        'The order was derived from each record’s position identifier, so it does not depend on the order of the input array.',
    };
  }

  return {
    records,
    ordering: 'journal-array-order',
    orderingVerified: false,
    assumption:
      'Some records carry no sortable identifier, so the journal’s own array order was used. The account store writes the journal newest first, so a streak is counted from the newest completed trade backwards. A consumer that re-orders the array must re-order it newest first.',
  };
}

/**
 * Compute the authoritative performance metrics for a journal scope.
 *
 * @param {Array} trades              the retained journal records
 * @param {object} [options]
 * @param {object} [options.account]   `{ balance, unrealizedPnL }` for equity
 * @param {number} [options.maxRetained] retention cap for scope reporting
 * @returns {object} metrics + integrity metadata
 */
export function computePaperPerformanceMetrics(trades = [], options = {}) {
  const { account = null, maxRetained = MAX_RETAINED_JOURNAL_ENTRIES } = options;

  const list = Array.isArray(trades) ? trades : [];

  const excluded = {
    NOT_A_RECORD: 0,
    NOT_COMPLETED: 0,
    MISSING_ID: 0,
    INVALID_PNL: 0,
  };
  const excludedReasons = new Map();
  const duplicateIds = [];
  const seenIds = new Set();
  const resultMismatches = [];

  const valid = [];
  let totalPipsAccumulated = 0;
  let pipsRecords = 0;

  for (const trade of list) {
    const completion = isCompletedTrade(trade);
    if (!completion.completed) {
      const key = completion.reason === 'NOT_RESOLVED' || completion.reason === 'NOT_COMPLETED'
        ? 'NOT_COMPLETED'
        : completion.reason === 'STILL_OPEN'
          ? 'NOT_COMPLETED'
          : 'NOT_A_RECORD';
      excluded[key] = (excluded[key] || 0) + 1;
      excludedReasons.set(completion.reason, (excludedReasons.get(completion.reason) || 0) + 1);
      continue;
    }

    if (!hasUsableId(trade)) {
      excluded.MISSING_ID += 1;
      excludedReasons.set('MISSING_ID', (excludedReasons.get('MISSING_ID') || 0) + 1);
      continue;
    }

    if (seenIds.has(trade.id)) {
      duplicateIds.push(trade.id);
      continue;
    }

    const pnl = normalizePnl(trade.pnlDollars);
    if (!pnl.ok) {
      excluded.INVALID_PNL += 1;
      excludedReasons.set('INVALID_PNL', (excludedReasons.get('INVALID_PNL') || 0) + 1);
      continue;
    }

    seenIds.add(trade.id);
    const result = classifyResult(pnl.value);
    if (!result) {
      excluded.INVALID_PNL += 1;
      excludedReasons.set('INVALID_PNL', (excludedReasons.get('INVALID_PNL') || 0) + 1);
      continue;
    }

    if (typeof trade.result === 'string' && trade.result.trim() !== '' && trade.result !== result) {
      resultMismatches.push({ id: trade.id, stored: trade.result, derived: result });
    }

    const pips = normalizePnl(trade.pips);
    if (pips.ok) {
      totalPipsAccumulated += pips.value;
      pipsRecords += 1;
    }

    valid.push({ id: trade.id, pnl: pnl.value, result, trade });
  }

  const wins = valid.filter((r) => r.result === RESULT.WIN);
  const losses = valid.filter((r) => r.result === RESULT.LOSS);
  const breakEvens = valid.filter((r) => r.result === RESULT.BREAKEVEN);

  const totalClosedTrades = valid.length;
  const decidedTrades = wins.length + losses.length;

  const realizedPnl = valid.reduce((sum, r) => sum + r.pnl, 0);
  const grossProfit = wins.reduce((sum, r) => sum + r.pnl, 0);
  const grossLoss = losses.reduce((sum, r) => sum + Math.abs(r.pnl), 0);

  const reasons = {};

  const winRate = decidedTrades > 0
    ? (wins.length / decidedTrades) * 100
    : null;
  if (winRate === null) {
    reasons.winRate = totalClosedTrades === 0
      ? UNAVAILABLE_REASON.NO_VALID_TRADES
      : UNAVAILABLE_REASON.NO_DECIDED_TRADES;
  }

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  if (profitFactor === null) {
    reasons.profitFactor = UNAVAILABLE_REASON.NO_LOSSES;
  }

  const averageWin = wins.length > 0 ? grossProfit / wins.length : null;
  if (averageWin === null) reasons.averageWin = UNAVAILABLE_REASON.NO_WINS;

  const averageLoss = losses.length > 0 ? grossLoss / losses.length : null;
  if (averageLoss === null) reasons.averageLoss = UNAVAILABLE_REASON.NO_LOSSES;

  const expectancy = totalClosedTrades > 0 ? realizedPnl / totalClosedTrades : null;
  if (expectancy === null) reasons.expectancy = UNAVAILABLE_REASON.NO_VALID_TRADES;

  const totalPipsComputed = pipsRecords > 0 ? totalPipsAccumulated : null;

  // Streaks follow the chronological order (newest first).
  //
  // POLICY: a winning streak is a run of consecutive WIN records. A LOSS
  // ends it, and so does a BREAKEVEN — a break-even is not a win, so it
  // breaks the consecutive-win run. This is stated explicitly here so the
  // behaviour is never ambiguous.
  const chronology = resolveChronology(valid);
  const ordered = chronology.records;

  let currentWinStreak = 0;
  for (const record of ordered) {
    if (record.result !== RESULT.WIN) break;
    currentWinStreak += 1;
  }
  let longestWinStreak = 0;
  let run = 0;
  for (const record of ordered) {
    if (record.result === RESULT.WIN) {
      run += 1;
      if (run > longestWinStreak) longestWinStreak = run;
    } else {
      run = 0;
    }
  }

  // Account equity comes from the account state, never from journal totals.
  let accountEquity = null;
  if (isPlainObject(account)) {
    const balance = normalizePnl(account.balance);
    const unrealized = normalizePnl(account.unrealizedPnL);
    if (balance.ok && unrealized.ok) {
      const sum = balance.value + unrealized.value;
      if (Number.isFinite(sum)) accountEquity = sum;
    }
  }
  if (accountEquity === null) {
    reasons.accountEquity = UNAVAILABLE_REASON.NO_ACCOUNT_STATE;
  }

  const excludedCount = Object.values(excluded).reduce((a, b) => a + b, 0);

  // Every numerical output must be finite. A non-finite value would be a
  // fabricated result, so it is reported as unavailable instead.
  const finiteOrNull = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  const winRateValue = finiteOrNull(winRate);
  if (winRateValue === null) {
    reasons.winRate = totalClosedTrades === 0
      ? UNAVAILABLE_REASON.NO_VALID_TRADES
      : UNAVAILABLE_REASON.NO_DECIDED_TRADES;
  }

  const profitFactorValue = finiteOrNull(profitFactor);
  if (profitFactorValue === null) {
    reasons.profitFactor = UNAVAILABLE_REASON.NO_LOSSES;
  }

  const averageWinValue = finiteOrNull(averageWin);
  if (averageWinValue === null) reasons.averageWin = UNAVAILABLE_REASON.NO_WINS;

  const averageLossValue = finiteOrNull(averageLoss);
  if (averageLossValue === null) reasons.averageLoss = UNAVAILABLE_REASON.NO_LOSSES;

  const expectancyValue = finiteOrNull(expectancy);
  if (expectancyValue === null) reasons.expectancy = UNAVAILABLE_REASON.NO_VALID_TRADES;

  const totalPipsValue = finiteOrNull(totalPipsComputed);
  if (totalPipsValue === null) reasons.totalPips = UNAVAILABLE_REASON.NO_VALID_TRADES;

  const accountEquityValue = finiteOrNull(accountEquity);
  if (accountEquityValue === null) reasons.accountEquity = UNAVAILABLE_REASON.NO_ACCOUNT_STATE;

  const retentionLimitReached = list.length >= maxRetained;

  return {
    scope: {
      kind: METRIC_SCOPE.JOURNAL_RETAINED,
      /** The completeness of the account's history is never asserted. */
      isCompleteHistory: false,
      isAllTime: false,
      retainedCount: list.length,
      maxRetainedEntries: maxRetained,
      /** FACT: the retention limit has been reached. */
      retentionLimitReached,
      /**
       * POSSIBILITY, not a fact: when the limit has been reached, older
       * records MAY have been discarded. Reaching the limit does not prove
       * that anything was discarded, and the module never claims it did.
       */
      historyMayBeIncomplete: retentionLimitReached,
      /** Never asserted: the module cannot prove that records were lost. */
      historyDefinitivelyIncomplete: false,
      note:
        'These metrics describe the retained journal only. The account keeps at most ' +
        `${maxRetained} entries. When that limit has been reached, older trades may have ` +
        'been discarded, but that cannot be proven from the journal alone. These figures ' +
        'are never an all-time record.',
    },

    totalClosedTrades,
    wins: wins.length,
    losses: losses.length,
    breakEvens: breakEvens.length,
    decidedTrades,

    winRate: winRateValue,
    realizedPnl: finiteOrNull(realizedPnl),
    grossProfit: finiteOrNull(grossProfit),
    grossLoss: finiteOrNull(grossLoss),
    profitFactor: profitFactorValue,
    averageWin: averageWinValue,
    averageLoss: averageLossValue,
    expectancy: expectancyValue,
    totalPips: totalPipsValue,

    currentWinStreak,
    longestWinStreak,

    /**
     * How the streak was ordered, and the documented policy.
     */
    streak: {
      policy:
        'A winning streak is a run of consecutive WIN records in chronological order (newest first). A LOSS ends the run, and so does a BREAKEVEN, because a break-even is not a win.',
      ordering: chronology.ordering,
      orderingVerified: chronology.orderingVerified,
      assumption: chronology.assumption,
    },

    accountEquity: accountEquityValue,

    unavailableReasons: reasons,

    integrity: {
      excludedCount,
      excluded,
      excludedReasons: Object.fromEntries(excludedReasons),
      duplicateIds,
      duplicateIdCount: duplicateIds.length,
      resultMismatches,
      resultMismatchCount: resultMismatches.length,
      pipsRecords,
    },
  };
}

/**
 * Reconcile the journal-derived counts with the account-level counters.
 *
 * The two populations can legitimately differ: the account counters are
 * lifetime totals, while the journal only retains the most recent entries.
 * This function REPORTS the difference. It never rewrites a counter, never
 * rewrites a trade and never resets an account.
 *
 * @param {object} metrics  result of computePaperPerformanceMetrics
 * @param {object} counters `{ winCount, lossCount, breakevenCount, realizedPnL }`
 */
export function reconcileJournalWithCounters(metrics, counters = {}) {
  const journal = {
    wins: metrics?.wins ?? 0,
    losses: metrics?.losses ?? 0,
    breakEvens: metrics?.breakEvens ?? 0,
    totalClosedTrades: metrics?.totalClosedTrades ?? 0,
    realizedPnl: metrics?.realizedPnl ?? 0,
  };

  const stored = {
    wins: Number.isFinite(counters?.winCount) ? counters.winCount : null,
    losses: Number.isFinite(counters?.lossCount) ? counters.lossCount : null,
    breakEvens: Number.isFinite(counters?.breakevenCount) ? counters.breakevenCount : null,
    realizedPnl: normalizePnl(counters?.realizedPnL).ok
      ? normalizePnl(counters.realizedPnL).value
      : null,
  };

  const difference = (a, b) => (a === null || b === null ? null : a - b);

  const differences = {
    wins: difference(stored.wins, journal.wins),
    losses: difference(stored.losses, journal.losses),
    breakEvens: difference(stored.breakEvens, journal.breakEvens),
    realizedPnl: difference(stored.realizedPnl, journal.realizedPnl),
  };

  const known = Object.values(differences).filter((v) => v !== null);
  const consistent = known.length > 0 && known.every((v) => v === 0);

  return {
    journal,
    stored,
    differences,
    consistent,
    scopeLimitations: [
      'The account counters are lifetime totals; the journal retains only the most recent entries.',
      'A difference therefore does not necessarily mean an error — earlier trades may have been discarded.',
      'No counter was modified and no history was invented.',
    ],
  };
}

/**
 * Integration guide for S03-B2B.
 *
 * This documents — but does not perform — the UI rewiring. S03-B2B should
 * replace the listed ad-hoc calculations with the shared function so that
 * every surface reports the same numbers for the same journal.
 *
 * Example (a future consumer):
 *
 *   import { computePaperPerformanceMetrics } from '../utils/paperPerformanceMetrics.js';
 *
 *   const metrics = computePaperPerformanceMetrics(demoAccount.trades, {
 *     account: { balance: demoAccount.balance, unrealizedPnL: demoAccount.unrealizedPnL },
 *   });
 *
 *   // metrics.winRate        -> number | null  (null = not enough data)
 *   // metrics.profitFactor   -> number | null  (null = no losing trade)
 *   // metrics.accountEquity  -> number | null  (from the account state)
 *   // metrics.scope.isAllTime -> false          (retained journal only)
 *
 * A consumer MUST render `null` as "not available" — never as 0, never as
 * 0 % and never as an infinite ratio.
 */
export const INTEGRATION_GUIDE = Object.freeze({
  example: `const metrics = computePaperPerformanceMetrics(demoAccount.trades, {
  account: { balance: demoAccount.balance, unrealizedPnL: demoAccount.unrealizedPnL },
});
// metrics.winRate, metrics.profitFactor, metrics.accountEquity, metrics.scope`,

  nullRendering: 'A null metric must be rendered as "not available" — never 0, never 0 %, never an infinite ratio.',

  /**
   * The ad-hoc calculations that S03-B2B must replace. Each entry names the
   * surface, the current formula and the shared metric to use instead.
   */
  replaceIn: [
    {
      file: 'src/components/common/TrendLensBotPanel.jsx',
      lines: '168-170, 566-568',
      current: "winCount / (winCount + lossCount) * 100, rendered as 0 when there are no trades",
      replaceWith: 'metrics.winRate (null when there are no decided trades)',
    },
    {
      file: 'src/components/common/TrendLensBotPanel.jsx',
      lines: '42-44',
      current: 'grossProfit / grossLoss rendered as "∞" when there are no losses',
      replaceWith: 'metrics.profitFactor (null when there are no losses)',
    },
    {
      file: 'src/components/common/TrendLensBotPanel.jsx',
      lines: '42-43',
      current: 'gross profit and gross loss reduced inline from the journal',
      replaceWith: 'metrics.grossProfit / metrics.grossLoss',
    },
    {
      file: 'src/components/common/TrendLensUltraChart.jsx',
      lines: '5062-5064',
      current: "winCount / (winCount + lossCount) * 100, rendered as 0 when there are no trades",
      replaceWith: 'metrics.winRate (null when there are no decided trades)',
    },
    {
      file: 'src/pages/Dashboard.jsx',
      lines: '206-211',
      current: 'win rate and total pips reduced inline from the journal',
      replaceWith: 'metrics.winRate / metrics.totalPips',
    },
    {
      file: 'src/pages/Profile.jsx',
      lines: '28-38, 86',
      current: 'win rate, pips and a hard-coded null streak reduced inline from the journal',
      replaceWith: 'metrics.winRate / metrics.totalPips / metrics.currentWinStreak',
    },
  ],

  /**
   * Calculations that must NOT be derived from the journal.
   */
  keepSeparate: [
    {
      surface: 'account equity',
      rule: 'Use the account state (balance + unrealised P&L). Never derive it from journal totals.',
    },
    {
      surface: 'bot run session P&L',
      rule: 'Session results are a different population and must never be added to journal metrics.',
    },
    {
      surface: 'confluence / signal score',
      rule: 'An evidence score is never a profitability measure and must never appear in a performance metric.',
    },
  ],
});
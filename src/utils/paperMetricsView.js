/**
 * Paper metrics view adapter.
 *
 * A thin, PURE layer between the authoritative metrics core
 * (`paperPerformanceMetrics.js`) and the React pages. It exists so that the
 * Dashboard and the Profile derive, label and format their numbers in exactly
 * the same way, and so that the formatting rules can be tested without a
 * browser harness.
 *
 * RULES ENFORCED HERE
 * -------------------
 *  - a null metric is rendered as "N/A" — never 0, never 0 %, never an
 *    infinite ratio;
 *  - journal-derived numbers are labelled as the RETAINED JOURNAL and are
 *    never presented as an all-time or lifetime record;
 *  - a lifetime account counter is kept separate from a journal sum and is
 *    labelled differently;
 *  - pips and USD P&L are formatted separately and never mixed;
 *  - a winning streak is only presented as a fact when its chronological
 *    order was verified from the record identifiers.
 *
 * No React, no Zustand, no network, no storage, no randomness.
 */

import {
  computePaperPerformanceMetrics,
  reconcileJournalWithCounters,
} from './paperPerformanceMetrics.js';
import { canonicalAssetId } from './paperPositionSafety.js';

/** The text used for a metric that cannot be calculated. */
export const NOT_AVAILABLE = 'N/A';

/**
 * Format a win rate. `null` means "not enough decided trades".
 * @returns {string}
 */
export function formatWinRate(winRate) {
  if (typeof winRate !== 'number' || !Number.isFinite(winRate)) return NOT_AVAILABLE;
  return `${Math.round(winRate)}%`;
}

/**
 * Format a profit factor. `null` means "no losing trade in the scope".
 * @returns {string}
 */
export function formatProfitFactor(profitFactor) {
  if (typeof profitFactor !== 'number' || !Number.isFinite(profitFactor)) return NOT_AVAILABLE;
  return `${profitFactor.toFixed(2)}x`;
}

/**
 * Format a signed amount. Pips and currency are formatted separately and
 * never share a unit.
 *
 * A `+` is only shown for a strictly positive value, so a break-even reads
 * as "0.00" rather than implying a gain.
 *
 * @param {number|null} value
 * @param {'pips'|'usd'} unit
 */
export function formatSignedAmount(value, unit = 'usd') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NOT_AVAILABLE;
  const decimals = unit === 'pips' ? 1 : 2;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Format an account LEVEL (equity, balance). A level is not a change, so it
 * never carries a sign.
 * @param {number|null} value
 */
export function formatAccountAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NOT_AVAILABLE;
  return value.toFixed(2);
}

/**
 * Format a winning streak.
 *
 * When the chronological order could not be verified from the record
 * identifiers the streak is NOT presented as a fact: the value becomes "N/A"
 * and the estimate is returned separately so a consumer can label it.
 *
 * @returns {{ value: string, note: string|null, estimate: number|null, verified: boolean }}
 */
export function formatWinStreak(metrics, which = 'current') {
  const verified = metrics?.streak?.orderingVerified === true;
  const raw = which === 'longest' ? metrics?.longestWinStreak : metrics?.currentWinStreak;
  const estimate = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;

  if (!verified) {
    return {
      value: NOT_AVAILABLE,
      note:
        'The chronological order of these records could not be verified from their identifiers, ' +
        'so the winning streak is not shown as a fact.',
      estimate,
      verified: false,
    };
  }

  return {
    value: estimate === null ? NOT_AVAILABLE : String(estimate),
    note: null,
    estimate,
    verified: true,
  };
}

/**
 * A concise notice describing the scope of the journal-derived metrics.
 * @returns {string}
 */
export function formatScopeNotice(metrics) {
  const scope = metrics?.scope;
  if (!scope) return 'No recorded trades yet.';

  const count = scope.retainedCount ?? 0;
  const trades = `${count} recorded trade${count === 1 ? '' : 's'}`;

  if (scope.retentionLimitReached) {
    return (
      `Retained journal (${trades}, limit ${scope.maxRetainedEntries}). ` +
      'Earlier trades may be missing — this is not an all-time record.'
    );
  }
  return `Retained journal (${trades}). Not an all-time record.`;
}

/**
 * A concise notice about how much of the journal actually carries valid pip
 * data, or null when the coverage is complete.
 *
 * The pip total only sums the records that HAVE valid pip data. When some
 * records do not, the figure must say so — otherwise a partial sum is
 * presented as the total for the whole journal.
 *
 * @returns {string|null}
 */
export function formatPipsCoverageNotice(metrics) {
  const total = metrics?.totalClosedTrades ?? 0;
  const covered = metrics?.integrity?.pipsRecords ?? 0;
  if (total === 0) return null;
  if (covered >= total) return null;
  return (
    `Pips cover ${covered} of ${total} recorded trades — records without valid ` +
    'pip data are not included in the total.'
  );
}

/**
 * A concise notice when records were excluded or disagreed, or null.
 * @returns {string|null}
 */
export function formatIntegrityNotice(metrics) {
  const integrity = metrics?.integrity;
  if (!integrity) return null;

  const parts = [];
  if (integrity.excludedCount > 0) {
    parts.push(
      `${integrity.excludedCount} record${integrity.excludedCount === 1 ? '' : 's'} excluded (missing or invalid P&L)`
    );
  }
  if (integrity.duplicateIdCount > 0) {
    parts.push(
      `${integrity.duplicateIdCount} duplicate id${integrity.duplicateIdCount === 1 ? '' : 's'} counted once`
    );
  }
  if (integrity.resultMismatchCount > 0) {
    parts.push(
      `${integrity.resultMismatchCount} stored result${integrity.resultMismatchCount === 1 ? '' : 's'} disagreed with the booked P&L`
    );
  }
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Per-asset performance, computed with the SAME rules as the overall
 * metrics by running the shared core on each asset's own journal subset.
 *
 * Records are grouped by the CANONICAL instrument identity, so equivalent
 * labels of the same instrument ('XAU/USD', 'XAU/USDT', 'XAUUSDT') form one
 * group. An alias that cannot be resolved stays its own group and is never
 * merged into another instrument. A record with no asset at all is grouped
 * under 'Unknown' — it is never attributed to any real instrument.
 *
 * @returns {Array<{ label: string, winRate: string, metrics: object }>}
 */
export function buildPerAssetMetrics(trades = []) {
  const list = Array.isArray(trades) ? trades : [];
  const groups = new Map();

  for (const trade of list) {
    const rawLabel =
      trade && typeof trade.asset === 'string' && trade.asset.trim() !== ''
        ? trade.asset.trim()
        : null;

    let key = 'unknown';
    if (rawLabel) {
      // canonicalAssetId never falls back to a real instrument: an
      // unresolvable alias keeps its own identity.
      key = canonicalAssetId(rawLabel) || rawLabel;
    }

    if (!groups.has(key)) {
      groups.set(key, { label: rawLabel || 'Unknown', records: [] });
    }
    groups.get(key).records.push(trade);
  }

  return [...groups.values()].map((group) => {
    const metrics = computePaperPerformanceMetrics(group.records);
    return {
      label: group.label,
      metrics,
      winRate: formatWinRate(metrics.winRate),
      totalClosedTrades: metrics.totalClosedTrades,
    };
  });
}

/**
 * Build the complete view model for a paper-account surface.
 *
 * @param {object} options
 * @param {Array}  options.trades    the retained journal records
 * @param {object} [options.account] `{ balance, unrealizedPnL }`
 * @param {object} [options.counters] lifetime account counters, for the
 *        reconciliation report only — they are never used as a metric value
 */
export function buildPaperMetricsView({ trades = [], account = null, counters = null } = {}) {
  const metrics = computePaperPerformanceMetrics(trades, account ? { account } : {});
  const reconciliation = counters ? reconcileJournalWithCounters(metrics, counters) : null;

  return {
    metrics,
    reconciliation,

    totalClosedTrades: metrics.totalClosedTrades,
    wins: metrics.wins,
    losses: metrics.losses,
    breakEvens: metrics.breakEvens,

    winRate: formatWinRate(metrics.winRate),
    profitFactor: formatProfitFactor(metrics.profitFactor),
    realizedPnl: formatSignedAmount(metrics.realizedPnl, 'usd'),
    totalPips: formatSignedAmount(metrics.totalPips, 'pips'),
    accountEquity: formatAccountAmount(metrics.accountEquity),

    currentStreak: formatWinStreak(metrics, 'current'),
    longestStreak: formatWinStreak(metrics, 'longest'),

    scopeNotice: formatScopeNotice(metrics),
    integrityNotice: formatIntegrityNotice(metrics),
    pipsCoverageNotice: formatPipsCoverageNotice(metrics),

    perAsset: buildPerAssetMetrics(trades),
  };
}

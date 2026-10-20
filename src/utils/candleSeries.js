/**
 * Candle series helpers for the Ultra Chart.
 *
 * The chart's internal bar shape is `{ o, h, l, c, v, t, confirmed }`:
 *  - `t` is the candle's START time in epoch milliseconds, taken from the
 *    exchange. It is always present on a real candle.
 *  - `confirmed` is true once the exchange has closed that candle.
 *
 * The market data service produces the canonical shape
 * `{ time, open, high, low, close, volume, confirmed, source }`; this module
 * adapts it and owns the merge rules so that the chart has exactly one
 * writer.
 *
 * MERGE RULES (single-writer contract)
 * -----------------------------------
 *  - a candle with a known start time updates the existing bar in place;
 *  - a genuinely newer candle is appended exactly once;
 *  - an older or duplicate frame is ignored and cannot corrupt the series;
 *  - a candle without a valid start time is never accepted;
 *  - a confirmed candle is never re-opened by a later forming update.
 */

export const CANDLE_OUTCOME = Object.freeze({
  UPDATED: 'updated',
  APPENDED: 'appended',
  IGNORED: 'ignored',
});

export const IGNORE_REASON = Object.freeze({
  NO_TIMESTAMP: 'NO_TIMESTAMP',
  OUT_OF_ORDER: 'OUT_OF_ORDER',
});

/**
 * Adapt a canonical market candle to the chart's internal bar shape.
 * @returns {object|null} null when the candle carries no usable start time
 */
export function toChartBar(candle) {
  if (!candle || !Number.isFinite(candle.time) || candle.time <= 0) return null;
  return {
    o: candle.open,
    h: candle.high,
    l: candle.low,
    c: candle.close,
    v: Number.isFinite(candle.volume) ? candle.volume : 0,
    t: candle.time,
    confirmed: candle.confirmed === true,
  };
}

/** Index of the bar whose start time matches, or -1. */
export function findBarIndex(bars = [], time) {
  if (!Number.isFinite(time)) return -1;
  return bars.findIndex((b) => b && b.t === time);
}

/**
 * Merge one incoming candle into a chronological, de-duplicated series.
 *
 * @param {Array} bars   current series (oldest → newest)
 * @param {object} incoming bar in the chart's internal shape
 * @returns {{ bars: Array, outcome: string, candle: object|null, reason: string|null }}
 */
export function applyCandleUpdate(bars = [], incoming) {
  const current = Array.isArray(bars) ? bars : [];

  if (!incoming || !Number.isFinite(incoming.t) || incoming.t <= 0) {
    return { bars: current, outcome: CANDLE_OUTCOME.IGNORED, candle: null, reason: IGNORE_REASON.NO_TIMESTAMP };
  }

  const index = findBarIndex(current, incoming.t);
  if (index >= 0) {
    // Same candle: refresh its values in place. Never append a duplicate.
    // A candle that the exchange has already closed is never re-opened by a
    // later forming update.
    const next = current.slice();
    next[index] = {
      ...next[index],
      ...incoming,
      confirmed: next[index].confirmed === true || incoming.confirmed === true,
    };
    return { bars: next, outcome: CANDLE_OUTCOME.UPDATED, candle: next[index], reason: null };
  }

  const last = current[current.length - 1];
  if (last && Number.isFinite(last.t) && incoming.t < last.t) {
    // A late frame for an older candle. It must not disturb the series.
    return { bars: current, outcome: CANDLE_OUTCOME.IGNORED, candle: null, reason: IGNORE_REASON.OUT_OF_ORDER };
  }

  // A genuinely newer candle: append exactly once.
  return { bars: [...current, incoming], outcome: CANDLE_OUTCOME.APPENDED, candle: incoming, reason: null };
}

/**
 * Build the key that identifies one closed candle of one subscription.
 * It is used to guarantee that a candle close triggers at most one scan.
 */
export function buildScanKey(symbol, interval, candleTime) {
  return `${symbol}|${interval}|${candleTime}`;
}

/**
 * Decide whether a candle-close event should trigger an analysis scan.
 *
 * A scan is only triggered by a CONFIRMED (closed) candle, and never twice
 * for the same symbol / timeframe / candle.
 */
export function shouldTriggerScan({ lastScanKey, symbol, interval, candleTime, confirmed }) {
  if (confirmed !== true) return false;
  if (!Number.isFinite(candleTime) || candleTime <= 0) return false;
  if (!symbol || !interval) return false;
  return buildScanKey(symbol, interval, candleTime) !== lastScanKey;
}

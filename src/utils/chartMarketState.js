/**
 * Chart market state derived from real candles.
 *
 * This module exists so that the chart's post-load analysis state is a pure,
 * testable function instead of an inline block that can invent a trade.
 *
 * RULES ENFORCED HERE
 * -------------------
 * 1. Every value is derived from the candles that were actually loaded.
 * 2. No liquidity walls and no order-flow prints are generated. There is no
 *    depth feed and no trade-tape feed connected, so those panels must report
 *    their absence instead of rendering invented values.
 * 3. No trade bracket, no confluence pillars and no BUY/SELL/WAIT verdict are
 *    produced. A trade may only exist when a verified analysis result created
 *    it. Loading candles is not an analysis.
 * 4. This module has no access to the paper-trading store, the signal store or
 *    any order function, so it structurally cannot open a position or publish a
 *    signal.
 */

/** Marker used by the chart to state that no depth feed is connected. */
export const DEPTH_FEED_UNAVAILABLE = 'DEPTH_FEED_UNAVAILABLE';

/** Marker used by the chart to state that no trade-tape feed is connected. */
export const TAPE_FEED_UNAVAILABLE = 'TAPE_FEED_UNAVAILABLE';

/**
 * Approximate price-range levels derived from the loaded candles.
 *
 * These are NOT CME value-area measurements. They are fixed fractions of the
 * visible price range and are labelled accordingly in the chart.
 *
 * @param {Array<{h:number,l:number}>} bars
 * @param {number} decimals
 */
export function computeRangeLevels(bars = [], decimals = 2) {
  if (!Array.isArray(bars) || bars.length === 0) return null;

  const highs = bars.map((b) => b && b.h).filter((v) => Number.isFinite(v));
  const lows = bars.map((b) => b && b.l).filter((v) => Number.isFinite(v));
  if (highs.length === 0 || lows.length === 0) return null;

  const maxH = Math.max(...highs);
  const minL = Math.min(...lows);
  const span = Math.max(0.0001, maxH - minL);

  return {
    rangeHigh70: +(minL + span * 0.7).toFixed(decimals),
    rangeMid50: +(minL + span * 0.5).toFixed(decimals),
    rangeLow30: +(minL + span * 0.3).toFixed(decimals),
    rangeDeep15: +(minL + span * 0.15).toFixed(decimals),
  };
}

/**
 * Short-term trend bias from the loaded candles (mean of the last 6 closes
 * against the mean of the last 18 closes).
 *
 * This is a single-timeframe heuristic. It is not a multi-timeframe
 * confirmation and is labelled as such in the chart.
 *
 * @param {Array<{c:number}>} bars
 * @returns {'BULLISH'|'BEARISH'|'NEUTRAL'}
 */
export function computeTrendBias(bars = []) {
  if (!Array.isArray(bars) || bars.length < 6) return 'NEUTRAL';
  const recent = bars.slice(-18);
  if (recent.length < 6) return 'NEUTRAL';
  const fast = recent.slice(-6).reduce((acc, bar) => acc + bar.c, 0) / 6;
  const slow = recent.reduce((acc, bar) => acc + bar.c, 0) / recent.length;
  if (!Number.isFinite(fast) || !Number.isFinite(slow)) return 'NEUTRAL';
  return fast >= slow ? 'BULLISH' : 'BEARISH';
}

/**
 * Build the chart's market state for a freshly loaded set of candles.
 *
 * @param {object} options
 * @param {Array} options.bars     real candles (oldest → newest)
 * @param {number} options.finalPx last price of the series
 * @param {number} options.decimals price decimals
 */
export function buildChartMarketState({ bars = [], finalPx = 0, decimals = 2 } = {}) {
  return {
    /** Approximate range levels (NOT CME value-area measurements). */
    rangeLevels: computeRangeLevels(bars, decimals),

    /** Single-timeframe trend bias from the real candles. */
    trendBias: computeTrendBias(bars),

    /**
     * Liquidity walls require a resting-order depth feed. None is connected,
     * so no wall levels exist and the heatmap states their absence.
     */
    walls: [],
    depthFeedAvailable: false,
    depthStatus: DEPTH_FEED_UNAVAILABLE,

    /**
     * Order-flow prints require a trade tape. None is connected, so no prints
     * exist and the overlay states their absence.
     */
    prints: [],
    tapeFeedAvailable: false,
    tapeStatus: TAPE_FEED_UNAVAILABLE,

    /**
     * No verified analysis result exists yet, so there is no trade bracket,
     * no confluence pillars and no direction.
     */
    activeTrade: null,
    marks: [],
    pillars: null,
    signal: null,
    direction: 'WAIT',

    finalPx,
  };
}

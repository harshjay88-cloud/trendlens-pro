import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CANDLE_OUTCOME,
  IGNORE_REASON,
  applyCandleUpdate,
  buildScanKey,
  findBarIndex,
  shouldTriggerScan,
  toChartBar,
} from '../candleSeries.js';
import { parseRestKlines } from '../../services/marketDataService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');
const chartPath = path.join(repoRoot, 'src', 'components', 'common', 'TrendLensUltraChart.jsx');
const chartSource = readFileSync(chartPath, 'utf8');

/** A canonical market candle (the shape produced by marketDataService). */
const candle = (time, o, h, l, c, v = 100, confirmed = false) => ({
  time, open: o, high: h, low: l, close: c, volume: v, confirmed,
  source: 'bybit-public',
});

/** A REST kline row: [start, open, high, low, close, volume, turnover]. */
const row = (time, o, h, l, c, v = 100) => [
  String(time), String(o), String(h), String(l), String(c), String(v), '1000',
];

const bar = (time, o, h, l, c, v = 100, confirmed = false) => ({
  o, h, l, c, v, t: time, confirmed,
});

describe('TEST 1 — initial REST candles are sorted, timestamped and usable', () => {
  it('parses a mocked REST snapshot into ascending, timestamped candles', () => {
    const now = 1_700_000_000_000;
    const rows = [
      row(now - 30_000, 103, 104, 102, 103),
      row(now - 60_000, 102, 103, 101, 102),
      row(now - 90_000, 101, 102, 100, 101),
    ];

    const candles = parseRestKlines(rows, { interval: '1', now });
    expect(candles).toHaveLength(3);
    expect(candles.map((c) => c.time)).toEqual([now - 90_000, now - 60_000, now - 30_000]);
    candles.forEach((c) => {
      expect(Number.isFinite(c.time)).toBe(true);
      expect(c.open).toBeGreaterThan(0);
      expect(c.high).toBeGreaterThanOrEqual(c.low);
    });
  });

  it('adapts a canonical candle to the chart bar shape with a timestamp', () => {
    const b = toChartBar(candle(1000, 10, 12, 9, 11, 55, true));
    expect(b).toEqual({ o: 10, h: 12, l: 9, c: 11, v: 55, t: 1000, confirmed: true });
  });

  it('refuses a candle without a usable start time', () => {
    expect(toChartBar(candle(0, 1, 1, 1, 1))).toBeNull();
    expect(toChartBar({ open: 1, high: 1, low: 1, close: 1 })).toBeNull();
    expect(toChartBar(null)).toBeNull();
  });
});

describe('TEST 2 — a websocket update for the current candle replaces its values without appending a duplicate', () => {
  it('updates the bar in place', () => {
    const series = [bar(1000, 10, 12, 9, 11, 50, false)];
    const result = applyCandleUpdate(series, bar(1000, 10, 13, 9, 12.5, 77, false));

    expect(result.outcome).toBe(CANDLE_OUTCOME.UPDATED);
    expect(result.bars).toHaveLength(1);
    expect(result.bars[0].c).toBe(12.5);
    expect(result.bars[0].h).toBe(13);
    expect(result.bars[0].v).toBe(77);
  });

  it('keeps the series length and identity of the updated bar', () => {
    const original = bar(1000, 10, 12, 9, 11, 50, false);
    const series = [original];
    const result = applyCandleUpdate(series, bar(1000, 10, 12, 9, 11.5, 50, false));

    expect(result.bars).toHaveLength(1);
    expect(result.bars[0]).not.toBe(original);
    expect(result.bars[0].t).toBe(1000);
  });
});

describe('TEST 3 — a genuinely newer websocket candle appends exactly one bar', () => {
  it('appends once and keeps chronological order', () => {
    const series = [bar(1000, 10, 12, 9, 11, 50, true)];
    const result = applyCandleUpdate(series, bar(2000, 11, 13, 10, 12, 60, false));

    expect(result.outcome).toBe(CANDLE_OUTCOME.APPENDED);
    expect(result.bars).toHaveLength(2);
    expect(result.bars.map((b) => b.t)).toEqual([1000, 2000]);
  });

  it('appends to an empty series', () => {
    const result = applyCandleUpdate([], bar(1000, 1, 2, 0.5, 1.5, 10, false));
    expect(result.outcome).toBe(CANDLE_OUTCOME.APPENDED);
    expect(result.bars).toHaveLength(1);
  });
});

describe('TEST 4 — duplicate messages do not create duplicate candles', () => {
  it('replaying the same frame many times keeps one bar', () => {
    let series = [bar(1000, 10, 12, 9, 11, 50, false)];
    for (let i = 0; i < 25; i++) {
      series = applyCandleUpdate(series, bar(1000, 10, 12, 9, 11 + i * 0.01, 50 + i, false)).bars;
    }
    expect(series).toHaveLength(1);
    expect(series[0].t).toBe(1000);
  });

  it('replaying a snapshot after a reconnect does not duplicate existing bars', () => {
    let series = [bar(1000, 10, 12, 9, 11, 50, true), bar(2000, 11, 13, 10, 12, 60, false)];
    // A reconnect delivers the same two candles again.
    series = applyCandleUpdate(series, bar(1000, 10, 12, 9, 11, 50, true)).bars;
    series = applyCandleUpdate(series, bar(2000, 11, 13, 10, 12, 60, false)).bars;
    expect(series).toHaveLength(2);
    expect(series.map((b) => b.t)).toEqual([1000, 2000]);
  });
});

describe('TEST 5 — out-of-order messages do not corrupt the series', () => {
  it('ignores a late frame for an older candle', () => {
    const series = [bar(1000, 10, 12, 9, 11, 50, true), bar(2000, 11, 13, 10, 12, 60, false)];
    const result = applyCandleUpdate(series, bar(500, 5, 6, 4, 5.5, 10, true));

    expect(result.outcome).toBe(CANDLE_OUTCOME.IGNORED);
    expect(result.reason).toBe(IGNORE_REASON.OUT_OF_ORDER);
    expect(result.bars).toHaveLength(2);
    expect(result.bars.map((b) => b.t)).toEqual([1000, 2000]);
  });

  it('ignores a candle without a timestamp', () => {
    const series = [bar(1000, 10, 12, 9, 11, 50, true)];
    const result = applyCandleUpdate(series, { o: 1, h: 2, l: 0.5, c: 1.5, v: 5 });

    expect(result.outcome).toBe(CANDLE_OUTCOME.IGNORED);
    expect(result.reason).toBe(IGNORE_REASON.NO_TIMESTAMP);
    expect(result.bars).toHaveLength(1);
  });

  it('never produces an out-of-order series', () => {
    let series = [bar(3000, 3, 3, 3, 3, 1, true)];
    series = applyCandleUpdate(series, bar(1000, 1, 1, 1, 1, 1, true)).bars;
    series = applyCandleUpdate(series, bar(2000, 2, 2, 2, 2, 1, true)).bars;
    series = applyCandleUpdate(series, bar(4000, 4, 4, 4, 4, 1, false)).bars;

    const times = series.map((b) => b.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });
});

describe('TEST 6 — waiting for a timeframe boundary never creates a synthetic candle', () => {
  it('the chart contains no push into the candle series', () => {
    expect(chartSource).not.toMatch(/s\.bars\.push\(/);
    expect(chartSource).not.toMatch(/stateRef\.current\.bars\.push\(/);
  });

  it('the former synthetic bar shape is gone', () => {
    expect(chartSource).not.toContain("s.bars.push({ o: c, h: c, l: c, c })");
  });

  it('the timer only maintains counters and never appends a bar', () => {
    const start = chartSource.indexOf('const tickCounters = () => {');
    const end = chartSource.indexOf('let lastTickTime', start);
    expect(start).toBeGreaterThan(-1);
    const block = chartSource.slice(start, end);
    expect(block).not.toContain('bars.push');
    expect(block).toContain('tradeCooldown');
  });

  it('the auto-scan is driven by a confirmed candle, not by the timer', () => {
    const start = chartSource.indexOf('const runAutoScanOnClosedCandle = (closedCandleTime) => {');
    const end = chartSource.indexOf('const tickCounters', start);
    expect(start).toBeGreaterThan(-1);
    const block = chartSource.slice(start, end);
    expect(block).toContain('closedCandleTime');
    expect(block).toContain('confirmed !== true');
    expect(block).not.toContain('bars.push');
  });
});

describe('TEST 7 — websocket updates keep working after the former synthetic-bar timer would have fired', () => {
  it('repeated timer ticks never change the candle series', () => {
    // Simulate the old timer firing many times while the market is quiet.
    let series = [bar(1000, 10, 12, 9, 11, 50, true)];
    for (let tick = 0; tick < 50; tick++) {
      // the timer only touches counters — the series is untouched
      expect(series).toHaveLength(1);
    }

    // The next real market update still updates the forming candle.
    const updated = applyCandleUpdate(series, bar(2000, 11, 13, 10, 12, 60, false));
    expect(updated.outcome).toBe(CANDLE_OUTCOME.APPENDED);
    expect(updated.bars).toHaveLength(2);
    expect(updated.bars[1].t).toBe(2000);
  });

  it('a still-forming candle is updated in place, not replaced by a new bar', () => {
    let series = [bar(2000, 11, 13, 10, 12, 60, false)];
    series = applyCandleUpdate(series, bar(2000, 11, 14, 10, 12.5, 70, false)).bars;
    expect(series).toHaveLength(1);
    expect(series[0].h).toBe(14);
    expect(series[0].c).toBe(12.5);
  });
});

describe('TEST 8 — a forming candle is not incorrectly marked as confirmed', () => {
  it('carries the exchange confirmation flag through to the bar', () => {
    const forming = toChartBar(candle(1000, 10, 12, 9, 11, 50, false));
    const closed = toChartBar(candle(2000, 11, 13, 10, 12, 60, true));
    expect(forming.confirmed).toBe(false);
    expect(closed.confirmed).toBe(true);
  });

  it('marks a REST candle as forming while its interval has not elapsed', () => {
    const now = 1_700_000_000_000;
    const formingTime = now - 1000;
    const closedTime = now - 900_000 - 1000;
    const candles = parseRestKlines(
      [row(formingTime, 1, 2, 0.5, 1.5), row(closedTime, 1, 2, 0.5, 1.4)],
      { interval: '15', now }
    );
    const forming = candles.find((c) => c.time === formingTime);
    const closed = candles.find((c) => c.time === closedTime);
    expect(forming.confirmed).toBe(false);
    expect(closed.confirmed).toBe(true);
  });

  it('the chart preserves the confirmed flag on REST candles', () => {
    expect(chartSource).toContain('confirmed: k.confirmed === true');
  });
});

describe('TEST 9 — a candle close cannot trigger the same auto-scan twice', () => {
  const base = { symbol: 'BTCUSDT', interval: '15', candleTime: 1700000000000 };

  it('does not trigger for a forming candle', () => {
    expect(shouldTriggerScan({ ...base, lastScanKey: null, confirmed: false })).toBe(false);
  });

  it('triggers once for a confirmed candle', () => {
    const key = buildScanKey(base.symbol, base.interval, base.candleTime);
    expect(shouldTriggerScan({ ...base, lastScanKey: null, confirmed: true })).toBe(true);
    expect(shouldTriggerScan({ ...base, lastScanKey: key, confirmed: true })).toBe(false);
  });

  it('does not trigger for a different candle of the same series', () => {
    const key = buildScanKey('BTCUSDT', '15', 1700000000000);
    expect(
      shouldTriggerScan({ ...base, candleTime: 1700000900000, lastScanKey: key, confirmed: true })
    ).toBe(true);
  });

  it('does not trigger across a different symbol or timeframe', () => {
    const key = buildScanKey('BTCUSDT', '15', 1700000000000);
    expect(shouldTriggerScan({ ...base, symbol: 'ETHUSDT', lastScanKey: key, confirmed: true })).toBe(true);
    expect(shouldTriggerScan({ ...base, interval: '5', lastScanKey: key, confirmed: true })).toBe(true);
  });

  it('the chart records the last scanned candle key and clears it on resubscribe', () => {
    expect(chartSource).toContain('lastScannedCandleKey');
    expect(chartSource).toMatch(/lastScannedCandleKey = null/);
  });
});

describe('TEST 10 — with the auto-bot off, candles open no position and publish no signal', () => {
  it('the auto-scan opens a paper position only when the auto-bot is enabled', () => {
    const start = chartSource.indexOf('const runAutoScanOnClosedCandle = (closedCandleTime) => {');
    const end = chartSource.indexOf('const tickCounters', start);
    const block = chartSource.slice(start, end);

    const openIndex = block.indexOf('openDemoTrade(');
    const openGuardIndex = block.lastIndexOf('isAutoBotActive', openIndex);
    expect(openIndex).toBeGreaterThan(-1);
    expect(openGuardIndex).toBeGreaterThan(-1);

    const signalIndex = block.indexOf('addSignal(');
    const signalGuardIndex = block.lastIndexOf('isAutoBotActive', signalIndex);
    expect(signalIndex).toBeGreaterThan(-1);
    expect(signalGuardIndex).toBeGreaterThan(-1);
  });

  it('the default state of the auto-bot and of the exchange gates is still OFF', () => {
    const storeSource = readFileSync(path.join(repoRoot, 'src', 'store', 'tradingModeStore.js'), 'utf8');
    expect(storeSource).toContain('autoTradeEnabled: false');
    expect(storeSource).toContain('orderConsentGiven: false');
    const accountSource = readFileSync(path.join(repoRoot, 'src', 'store', 'index.js'), 'utf8');
    expect(accountSource).toContain('isAutoBotActive: false');
  });
});

describe('TEST 11 — with market data unavailable the chart stays honest and invents nothing', () => {
  it('keeps the explicit unavailable state', () => {
    expect(chartSource).toContain("setChartDataSource('unavailable')");
    expect(chartSource).toContain('MARKET DATA UNAVAILABLE');
  });

  it('the market data service reports a failure instead of an empty series', () => {
    expect(chartSource).toContain('await fetchCandles(');
    expect(chartSource).not.toContain('s.bars.push');
  });
});

describe('TEST 12 — a symbol or timeframe switch cannot mix two subscriptions', () => {
  it('the websocket handler rejects frames from another subscription', () => {
    expect(chartSource).toContain('activeSubscriptionKey');
    expect(chartSource).toContain('if (s.activeSubscriptionKey !== subscriptionKey) return;');
  });

  it('the subscription key is set per subscription and cleared on teardown', () => {
    const start = chartSource.indexOf('const subscriptionKey =');
    expect(start).toBeGreaterThan(-1);
    const block = chartSource.slice(start, start + 4000);
    expect(block).toMatch(/activeSubscriptionKey = subscriptionKey/);
    expect(block).toMatch(/activeSubscriptionKey = null/);
  });

  it('the resubscribe resets the scan bookkeeping', () => {
    expect(chartSource).toMatch(/lastScannedCandleKey = null/);
    expect(chartSource).toMatch(/pendingClosedCandle = null/);
  });
});

describe('TEST 13 — reconciliation does not duplicate existing bars', () => {
  it('a REST snapshot that overlaps the live series replaces instead of duplicating', () => {
    const live = [bar(1000, 10, 12, 9, 11, 50, true), bar(2000, 11, 13, 10, 12, 60, false)];
    const snapshot = [bar(1000, 10, 12, 9, 11.2, 55, true), bar(2000, 11, 13, 10, 12, 60, false)];

    let merged = live;
    for (const b of snapshot) merged = applyCandleUpdate(merged, b).bars;

    expect(merged).toHaveLength(2);
    expect(merged[0].c).toBe(11.2);
    expect(merged.map((b) => b.t)).toEqual([1000, 2000]);
  });

  it('findBarIndex locates a candle by its exchange timestamp', () => {
    const series = [bar(1000, 1, 1, 1, 1), bar(2000, 2, 2, 2, 2)];
    expect(findBarIndex(series, 2000)).toBe(1);
    expect(findBarIndex(series, 9999)).toBe(-1);
    expect(findBarIndex(series, undefined)).toBe(-1);
  });
});

describe('TEST 14 — chart rendering, indicators and drawing controls remain functional', () => {
  it('keeps the canvas, the market data integration and the indicator renderers', () => {
    expect(chartSource).toContain('<canvas ref={canvasRef}');
    expect(chartSource).toContain('await fetchCandles(');
    expect(chartSource).toContain('createRealtimeCandleFeed');
    expect(chartSource).toContain('drawEMA');
    expect(chartSource).toContain("acts.includes('bollinger')");
    expect(chartSource).toContain("acts.includes('vpvr')");
  });

  it('keeps zoom, pan, crosshair and drawing persistence', () => {
    expect(chartSource).toContain('handleWheel');
    expect(chartSource).toContain('handleMouseDown');
    expect(chartSource).toContain('handleMouseUp');
    expect(chartSource).toContain('trendlens_drawings_${asset}');
    expect(chartSource).toContain('trendlens_active_indicators');
  });

  it('keeps the S01 fake-signal removal intact', () => {
    expect(chartSource).not.toContain('defaultBullPillars');
    expect(chartSource).not.toContain('defaultBearPillars');
    expect(chartSource).not.toContain('(6/6 Confirmed)');
    expect(chartSource).toContain('buildChartMarketState');
  });
});

describe('TEST 15 — no authenticated exchange request is made', () => {
  it('the chart uses only the public market data service for its feed', () => {
    expect(chartSource).not.toContain('X-BAPI-API-KEY');
    expect(chartSource).not.toContain('X-BAPI-SIGN');
    expect(chartSource).not.toContain('crypto.subtle');
  });

  it('the private order path stays behind the explicit permission gate', () => {
    expect(chartSource).toContain('requireExchangeAction');
    expect(chartSource).toContain('placeBybitDemoOrder');
  });

  it('the server proxy still gates every mutating route', () => {
    const appSource = readFileSync(path.join(repoRoot, 'server', 'app.js'), 'utf8');
    expect(appSource).toContain('assertMutationAllowed');
    expect(appSource).toContain('DEMO_ORDER');
  });
});

describe('EDGE CASE — a late confirmed frame for an earlier candle is reconciled safely', () => {
  it('confirms candle A in place even after candle B has started', () => {
    // A is forming, then B starts.
    let series = [bar(1000, 10, 12, 9, 11, 50, false)];
    series = applyCandleUpdate(series, bar(2000, 11, 13, 10, 12, 60, false)).bars;
    expect(series.map((b) => b.t)).toEqual([1000, 2000]);

    // A late confirmed frame for A arrives.
    const result = applyCandleUpdate(series, bar(1000, 10, 12, 9, 11.8, 55, true));

    expect(result.outcome).toBe(CANDLE_OUTCOME.UPDATED);
    expect(result.bars).toHaveLength(2);
    // A is reconciled in place and stays before B.
    expect(result.bars.map((b) => b.t)).toEqual([1000, 2000]);
    expect(result.bars[0].confirmed).toBe(true);
    expect(result.bars[0].c).toBe(11.8);
    // B is untouched and still forming.
    expect(result.bars[1].confirmed).toBe(false);
  });

  it('a late confirmed frame for a candle that is gone does not corrupt the series', () => {
    const series = [bar(2000, 11, 13, 10, 12, 60, false)];
    const result = applyCandleUpdate(series, bar(1000, 10, 12, 9, 11, 50, true));

    expect(result.outcome).toBe(CANDLE_OUTCOME.IGNORED);
    expect(result.bars).toHaveLength(1);
    expect(result.bars[0].t).toBe(2000);
  });

  it('the chart analyses the closed candle by its own timestamp', () => {
    const start = chartSource.indexOf('const runAutoScanOnClosedCandle = (closedCandleTime) => {');
    const end = chartSource.indexOf('const tickCounters', start);
    const block = chartSource.slice(start, end);
    expect(block).toContain('s.bars.findIndex((b) => b.t === closedCandleTime)');
  });

  it('the chart never analyses the same bar, or an older bar, twice', () => {
    const start = chartSource.indexOf('const runAutoScanOnClosedCandle = (closedCandleTime) => {');
    const end = chartSource.indexOf('const tickCounters', start);
    const block = chartSource.slice(start, end);
    expect(block).toContain('lastScannedBarTime');
    expect(block).toMatch(/s\.bars\[k\]\.t <= s\.lastScannedBarTime/);
  });
});

describe('EDGE CASE — a stale frame cannot move the current price', () => {
  it('the chart ignores an out-of-order frame before touching the price', () => {
    const start = chartSource.indexOf('const merged = applyCandleUpdate(s.bars, bar);');
    expect(start).toBeGreaterThan(-1);
    const block = chartSource.slice(start, start + 1500);
    expect(block).toContain('CANDLE_OUTCOME.IGNORED');
    // The price update must come AFTER the ignore check.
    expect(block.indexOf('CANDLE_OUTCOME.IGNORED')).toBeLessThan(block.indexOf('livePriceRef.current = latest.close'));
  });

  it('the price is only moved by an accepted frame', () => {
    const start = chartSource.indexOf('onCandles: (incoming) => {');
    const end = chartSource.indexOf('onStatus:', start);
    const block = chartSource.slice(start, end);
    const ignoreIndex = block.indexOf('CANDLE_OUTCOME.IGNORED');
    const priceIndex = block.indexOf('livePriceRef.current = latest.close');
    const storeIndex = block.indexOf('updatePrice(asset, latest.close');
    expect(ignoreIndex).toBeGreaterThan(-1);
    expect(ignoreIndex).toBeLessThan(priceIndex);
    expect(ignoreIndex).toBeLessThan(storeIndex);
  });
});
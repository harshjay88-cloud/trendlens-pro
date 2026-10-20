import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  DEPTH_FEED_UNAVAILABLE,
  TAPE_FEED_UNAVAILABLE,
  buildChartMarketState,
  computeRangeLevels,
  computeTrendBias,
} from '../chartMarketState.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');
const chartPath = path.join(repoRoot, 'src', 'components', 'common', 'TrendLensUltraChart.jsx');
const chartSource = readFileSync(chartPath, 'utf8');
const moduleSource = readFileSync(path.join(here, '..', 'chartMarketState.js'), 'utf8');

/** A deterministic, realistic candle series (oldest → newest). */
const makeBars = (count = 60, start = 100, step = 1) =>
  Array.from({ length: count }, (_, i) => ({
    t: start + i * step,
    o: start + i * step,
    h: start + i * step + step * 0.6,
    l: start + i * step - step * 0.4,
    c: start + (i + 1) * step,
    v: 1000 + i * 10,
  }));

describe('TEST 1 — chart initialisation without market data never produces a fabricated BUY/SELL signal', () => {
  it('produces no direction and no trade bracket for an empty series', () => {
    const state = buildChartMarketState({ bars: [], finalPx: 0, decimals: 2 });

    expect(state.direction).toBe('WAIT');
    expect(state.signal).toBeNull();
    expect(state.activeTrade).toBeNull();
    expect(state.pillars).toBeNull();
    expect(state.marks).toEqual([]);
  });

  it('produces no direction for a malformed series', () => {
    const state = buildChartMarketState({
      bars: [{ o: 'x', h: null, l: undefined, c: NaN }, {}],
      finalPx: 0,
      decimals: 2,
    });

    expect(state.direction).toBe('WAIT');
    expect(state.activeTrade).toBeNull();
    expect(state.signal).toBeNull();
  });
});

describe('TEST 2 — loading valid candle data does not automatically create a 6/6 confluence result', () => {
  it('returns no trade bracket and no pillars for a valid uptrend', () => {
    const state = buildChartMarketState({ bars: makeBars(60), finalPx: 160, decimals: 2 });

    expect(state.activeTrade).toBeNull();
    expect(state.pillars).toBeNull();
    expect(state.signal).toBeNull();
    expect(state.direction).toBe('WAIT');
    expect(state.marks).toEqual([]);
  });

  it('returns no trade bracket for a valid downtrend either', () => {
    const down = makeBars(60, 200, -1);
    const state = buildChartMarketState({ bars: down, finalPx: 140, decimals: 2 });

    expect(state.activeTrade).toBeNull();
    expect(state.pillars).toBeNull();
    expect(state.direction).toBe('WAIT');
  });

  it('never reports a confirmed pillar count', () => {
    const state = buildChartMarketState({ bars: makeBars(60), finalPx: 160, decimals: 2 });
    const confirmed = state.pillars
      ? Object.values(state.pillars).filter((p) => p.ok).length
      : 0;
    expect(confirmed).toBe(0);
  });
});

describe('TEST 3 — missing order-book data never produces a fake institutional liquidity-wall claim', () => {
  it('generates no liquidity walls and reports the missing depth feed', () => {
    const state = buildChartMarketState({ bars: makeBars(60), finalPx: 160, decimals: 2 });

    expect(state.walls).toEqual([]);
    expect(state.depthFeedAvailable).toBe(false);
    expect(state.depthStatus).toBe(DEPTH_FEED_UNAVAILABLE);
  });

  it('generates no order-flow prints and reports the missing tape feed', () => {
    const state = buildChartMarketState({ bars: makeBars(60), finalPx: 160, decimals: 2 });

    expect(state.prints).toEqual([]);
    expect(state.tapeFeedAvailable).toBe(false);
    expect(state.tapeStatus).toBe(TAPE_FEED_UNAVAILABLE);
  });

  it('contains no random number generation', () => {
    expect(moduleSource).not.toContain('Math.random');
  });

  it('the chart no longer generates walls with random values', () => {
    expect(chartSource).not.toMatch(/s\.walls\s*=\s*Array\.from/);
    expect(chartSource).not.toMatch(/walls:\s*Array\.from/);
  });
});

describe('TEST 4 — the removed fabrication path cannot call openDemoTrade', () => {
  it('the state module has no reference to the paper account store', () => {
    expect(moduleSource).not.toContain('openDemoTrade');
    expect(moduleSource).not.toContain('useDemoAccountStore');
    expect(moduleSource).not.toContain('demoAccount');
  });

  it('the chart opens a paper position only from a verified analysis result', () => {
    // Every openDemoTrade call site must sit next to a real analysis source:
    // the auto-scan (evaluateInstitutionalSignal), the manual trigger
    // (synthesizeBestConfluenceSignal) or the 10-coin runner
    // (analyzeBybitMarketConfluence).
    const openCalls = [...chartSource.matchAll(/openDemoTrade\(/g)].map((m) => m.index);
    expect(openCalls.length).toBeGreaterThan(0);
    const allowed = [
      'evaluateInstitutionalSignal',
      'synthesizeBestConfluenceSignal',
      'analyzeBybitMarketConfluence',
    ];
    for (const index of openCalls) {
      const window = chartSource.slice(Math.max(0, index - 6000), index + 300);
      expect(allowed.some((token) => window.includes(token))).toBe(true);
    }
  });

  it('no openDemoTrade call remains inside applyBarsAndIndicators', () => {
    const start = chartSource.indexOf('const applyBarsAndIndicators');
    const end = chartSource.indexOf('const loadCandles', start);
    const block = chartSource.slice(start, end);
    expect(block).not.toContain('openDemoTrade');
  });
});

describe('TEST 5 — the removed fabrication path cannot call addSignal', () => {
  it('the state module has no reference to the signal store', () => {
    expect(moduleSource).not.toContain('addSignal');
    expect(moduleSource).not.toContain('useSignalStore');
  });

  it('no addSignal call remains inside applyBarsAndIndicators', () => {
    const start = chartSource.indexOf('const applyBarsAndIndicators');
    const end = chartSource.indexOf('const loadCandles', start);
    const block = chartSource.slice(start, end);
    expect(block).not.toContain('addSignal');
  });
});

describe('TEST 6 — no random 90–97 score is generated by this path', () => {
  it('the state module produces no score at all', () => {
    const state = buildChartMarketState({ bars: makeBars(60), finalPx: 160, decimals: 2 });
    expect(state.score).toBeUndefined();
    expect(state.activeTrade).toBeNull();
  });

  it('the chart contains no random confluence score', () => {
    expect(chartSource).not.toMatch(/Math\.min\(98,\s*9[01]\s*\+/);
    expect(chartSource).not.toMatch(/Math\.min\(98,\s*90\s*\+/);
  });

  it('the chart contains no hard-coded all-confirmed pillar sets', () => {
    expect(chartSource).not.toContain('defaultBullPillars');
    expect(chartSource).not.toContain('defaultBearPillars');
  });

  it('the chart contains no fabricated 6/6 confirmation claims', () => {
    expect(chartSource).not.toContain('(6/6 Confirmed)');
  });
});

describe('TEST 7 — stored paper positions are not closed against a fabricated chart bracket', () => {
  it('a freshly loaded chart has no active trade bracket', () => {
    const state = buildChartMarketState({ bars: makeBars(60), finalPx: 160, decimals: 2 });
    expect(state.activeTrade).toBeNull();
  });

  it('the chart closes a paper position only through a live bracket or an observed price', () => {
    const closes = [...chartSource.matchAll(/closeDemoTrade\(/g)].map((m) => m.index);
    expect(closes.length).toBeGreaterThan(0);
    const allowed = [
      'activeTrade',            // TP/SL monitor, driven by a live activeTrade bracket
      'outcome.exitPrice',      // 10-coin runner, driven by an observed market price
      'Reset for New 10-Coin Run',
    ];
    for (const index of closes) {
      const window = chartSource.slice(Math.max(0, index - 1500), index + 300);
      expect(allowed.some((token) => window.includes(token))).toBe(true);
    }
  });

  it('the TP/SL monitor is gated on a live activeTrade', () => {
    expect(chartSource).toContain("s.activeTrade && s.activeTrade.status === 'ACTIVE'");
  });
});

describe('TEST 8 — the chart still renders market data and its indicator/drawing interfaces', () => {
  it('keeps the canvas, the crosshair, the drawing tools and the indicator renderers', () => {
    expect(chartSource).toContain('<canvas ref={canvasRef}');
    expect(chartSource).toContain('handleWheel');
    expect(chartSource).toContain('handleMouseDown');
    expect(chartSource).toContain('drawEMA');
    expect(chartSource).toContain("acts.includes('bollinger')");
    expect(chartSource).toContain("acts.includes('vpvr')");
    expect(chartSource).toContain('trendlens_drawings_${asset}');
  });

  it('keeps the real REST/WebSocket market data loading', () => {
    expect(chartSource).toContain('await fetchCandles(');
    expect(chartSource).toContain('createRealtimeCandleFeed');
  });

  it('keeps the confluence matrix UI and the manual trigger path', () => {
    expect(chartSource).toContain('activePillars');
    expect(chartSource).toContain('handleTriggerSignal');
    expect(chartSource).toContain('evaluateInstitutionalSignal');
  });
});

describe('TEST 9 — the Phase 0 trading-disabled gates are unchanged', () => {
  it('the trading mode store still defaults to closed', () => {
    const storeSource = readFileSync(
      path.join(repoRoot, 'src', 'store', 'tradingModeStore.js'),
      'utf8'
    );
    expect(storeSource).toContain('autoTradeEnabled: false');
    expect(storeSource).toContain('orderConsentGiven: false');
  });

  it('the server proxy still gates every mutating route', () => {
    const appSource = readFileSync(path.join(repoRoot, 'server', 'app.js'), 'utf8');
    expect(appSource).toContain('assertMutationAllowed');
    expect(appSource).toContain('TRADING_DISABLED');
    expect(appSource).toContain('DEMO_ORDER');
  });

  it('the Bybit Demo base is still the only private base', () => {
    const clientSource = readFileSync(path.join(repoRoot, 'server', 'bybitClient.js'), 'utf8');
    expect(clientSource).toContain("BYBIT_DEMO_REST_BASE = 'https://api-demo.bybit.com'");
  });
});

describe('approximate levels remain clearly approximate', () => {
  it('range levels are derived from the loaded candles and named as range levels', () => {
    const bars = makeBars(20, 100, 1);
    const levels = computeRangeLevels(bars, 2);
    expect(levels).toBeTruthy();
    expect(levels).toHaveProperty('rangeHigh70');
    expect(levels).toHaveProperty('rangeMid50');
    expect(levels).toHaveProperty('rangeLow30');
    expect(levels).toHaveProperty('rangeDeep15');
    // Not CME value-area fields.
    expect(levels).not.toHaveProperty('vah');
    expect(levels).not.toHaveProperty('poc');
  });

  it('the chart no longer labels the range levels as CME measurements', () => {
    expect(chartSource).not.toContain("label: 'CME VAH'");
    expect(chartSource).not.toContain("label: 'CME POC'");
    expect(chartSource).not.toContain("label: 'CME VAL'");
    expect(chartSource).toContain("label: 'RANGE 50%'");
  });

  it('the trend bias is a single-timeframe heuristic and is labelled as such', () => {
    expect(computeTrendBias([])).toBe('NEUTRAL');
    expect(computeTrendBias(makeBars(3))).toBe('NEUTRAL');
    expect(computeTrendBias(makeBars(60, 100, 1))).toBe('BULLISH');
    expect(chartSource).toContain('Trend Bias (6 vs 18 bars)');
    expect(chartSource).not.toContain('80%+ Win Rate Filter');
  });
});

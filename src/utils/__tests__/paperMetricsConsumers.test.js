import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildPaperMetricsView } from '../paperMetricsView.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');

const read = (p) => readFileSync(path.join(repoRoot, p), 'utf8');

const dashboardSource = read('src/pages/Dashboard.jsx');
const profileSource = read('src/pages/Profile.jsx');
const botPanelSource = read('src/components/common/TrendLensBotPanel.jsx');
const chartSource = read('src/components/common/TrendLensUltraChart.jsx');
const storeSource = read('src/store/index.js');

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

// ── TEST 1 & 2: all four consumers share one calculation ────────────────────

describe('TEST 1 & 2 — all four consumers use the same shared calculation', () => {
  it('every consumer imports the shared adapter', () => {
    for (const source of [dashboardSource, profileSource, botPanelSource, chartSource]) {
      expect(source).toMatch(/from '(\.\.\/)+utils\/paperMetricsView\.js'/);
      expect(source).toContain('buildPaperMetricsView(');
    }
  });

  it('the Bot Panel and the Chart HUD read the shared journal win rate', () => {
    expect(botPanelSource).toContain('paperView.winRate');
    expect(chartSource).toContain('paperView.winRate');
  });

  it('one WIN, one LOSS and one BREAKEVEN give the same win rate everywhere', () => {
    const input = {
      trades: [
        trade('pos_3000_1', 30),
        trade('pos_2000_1', -10),
        trade('pos_3000_2', 0),
      ],
    };
    const view = buildPaperMetricsView(input);
    // 1 win / (1 win + 1 loss) — the break-even is excluded.
    expect(view.winRate).toBe('50%');
    expect(view.metrics.wins).toBe(1);
    expect(view.metrics.losses).toBe(1);
    expect(view.metrics.breakEvens).toBe(1);
  });

  it('no consumer reduces the journal inline any more', () => {
    for (const source of [dashboardSource, profileSource, botPanelSource, chartSource]) {
      expect(source).not.toMatch(/winCount \+ (demoAccount|account)\.lossCount/);
      expect(source).not.toMatch(/reduce\(\(sum, t\) => \(t\.pnlDollars/);
    }
  });
});

// ── TEST 3, 4, 5: null handling ────────────────────────────────────────────

describe('TEST 3, 4 & 5 — null, break-even and no-loss cases', () => {
  it('an empty journal is N/A', () => {
    const view = buildPaperMetricsView({ trades: [] });
    expect(view.winRate).toBe('N/A');
    expect(view.profitFactor).toBe('N/A');
  });

  it('an all-break-even journal is N/A, not a 0 % win rate', () => {
    const view = buildPaperMetricsView({ trades: [trade('pos_1000_1', 0)] });
    expect(view.winRate).toBe('N/A');
    expect(view.metrics.breakEvens).toBe(1);
  });

  it('no losses means the profit factor is N/A, never infinity', () => {
    const view = buildPaperMetricsView({ trades: [trade('pos_1000_1', 25)] });
    expect(view.profitFactor).toBe('N/A');
    expect(view.profitFactor).not.toMatch(/∞|Infinity/);
  });

  it('no consumer renders an infinity ratio', () => {
    expect(botPanelSource).not.toContain("'∞'");
    expect(chartSource).not.toContain("'∞'");
  });
});

// ── TEST 6: lifetime counters cannot change the journal win rate ───────────

describe('TEST 6 — lifetime counters cannot change the retained-journal win rate', () => {
  it('different counters leave the journal metric unchanged', () => {
    const trades = [trade('pos_2000_1', 30), trade('pos_1000_1', -10)];
    const withCounters = buildPaperMetricsView({
      trades,
      counters: { winCount: 999, lossCount: 500, breakevenCount: 100, realizedPnL: 99999 },
    });
    const withoutCounters = buildPaperMetricsView({ trades });
    expect(withCounters.winRate).toBe(withoutCounters.winRate);
    expect(withCounters.winRate).toBe('50%');
    expect(withCounters.reconciliation.consistent).toBe(false);
  });
});

// ── TEST 7 & 8: session and account populations stay separate ──────────────

describe('TEST 7 & 8 — session and account populations are not mixed in', () => {
  it('the shared adapter has no session-results input', () => {
    const viewSource = read('src/utils/paperMetricsView.js');
    expect(viewSource).not.toContain('sessionResults');
    expect(viewSource).not.toContain('session');
  });

  it('the chart keeps its session P&L separate from the journal metrics', () => {
    // The runner session total still exists and is still its own figure.
    expect(chartSource).toContain('sessionResults');
    expect(chartSource).toContain('Net Paper PnL');
  });

  it('the account realized P&L is not replaced by the journal sum', () => {
    expect(chartSource).toContain('demoAccount.realizedPnL');
    expect(botPanelSource).toContain('demoAccount.realizedPnL');
    // The journal sum is presented under its own label.
    expect(botPanelSource).toContain('Realized PnL (Account)');
    expect(chartSource).toContain('Net Realized P&amp;L (Account)');
  });
});

// ── TEST 9: partial pips coverage ──────────────────────────────────────────

describe('TEST 9 — partial pip coverage is disclosed', () => {
  it('the notice states the coverage', () => {
    const view = buildPaperMetricsView({
      trades: [
        { ...trade('pos_2000_1', 10), pips: 5 },
        { ...trade('pos_1000_1', 20), pips: undefined },
      ],
    });
    expect(view.pipsCoverageNotice).toMatch(/Pips cover 1 of 2 recorded trades/i);
  });

  it('both consumers surface the notice', () => {
    expect(botPanelSource).toContain('paperView.pipsCoverageNotice');
    expect(chartSource).toContain('paperView.scopeNotice');
  });
});

// ── TEST 10: invalid and duplicate rows ────────────────────────────────────

describe('TEST 10 — invalid or duplicate rows do not produce misleading values', () => {
  it('invalid rows are excluded and reported', () => {
    const view = buildPaperMetricsView({
      trades: [trade('pos_2000_1', 25), { ...trade('pos_1000_1', NaN) }],
    });
    expect(view.metrics.totalClosedTrades).toBe(1);
    expect(view.integrityNotice).toMatch(/excluded/i);
  });

  it('duplicate rows are counted once', () => {
    const view = buildPaperMetricsView({
      trades: [trade('pos_2000_1', 25), trade('pos_2000_1', 25)],
    });
    expect(view.metrics.totalClosedTrades).toBe(1);
    expect(view.integrityNotice).toMatch(/duplicate/i);
  });
});

// ── TEST 11: break-even badges and counts ───────────────────────────────────

describe('TEST 11 — break-even badges and counts remain correct', () => {
  it('the Bot Panel journal badge still renders a BREAKEVER-style result', () => {
    expect(botPanelSource).toContain("tr.result === 'BREAKEVEN'");
    expect(botPanelSource).toContain('{tr.result}');
  });

  it('the lifetime counter line still shows the break-even count', () => {
    expect(botPanelSource).toContain('demoAccount.breakevenCount');
    expect(botPanelSource).toContain('Wins / Losses (Lifetime)');
  });
});

// ── TEST 12: zero realized P&L is not positive growth ──────────────────────

describe('TEST 12 — a zero realized P&L is not labelled positive growth', () => {
  it('the chart no longer says "Profitable Growth" for a zero P&L', () => {
    expect(chartSource).not.toContain('Profitable Growth');
    expect(chartSource).toContain("'Break-even (account lifetime)'");
  });

  it('no consumer claims an unsupported win-rate guarantee', () => {
    expect(botPanelSource).not.toContain('80%+');
    expect(chartSource).not.toContain('80%+');
  });
});

// ── TEST 13: a metrics read mutates nothing ─────────────────────────────────

describe('TEST 13 — a metrics read mutates no account state', () => {
  it('neither consumer resets or rewrites the account from the metrics path', () => {
    // The Bot Panel's pre-existing Reset control still calls resetDemoAccount;
    // the METRICS path must not.
    for (const source of [botPanelSource, chartSource]) {
      const start = source.indexOf('const paperView = useMemo(');
      const block = source.slice(start, start + 900);
      expect(block).not.toContain('resetDemoAccount(');
      expect(block).not.toContain('setAccount(');
    }
  });

  it('the metrics memo itself never opens or closes a position', () => {
    for (const source of [botPanelSource, chartSource]) {
      const start = source.indexOf('const paperView = useMemo(');
      const block = source.slice(start, start + 900);
      expect(block).not.toContain('openDemoTrade(');
      expect(block).not.toContain('closeDemoTrade(');
    }
  });

  it('the store is untouched by this task', () => {
    // The store still owns the account; the consumers only read from it.
    expect(storeSource).toContain('openDemoTrade:');
    expect(storeSource).toContain('closeDemoTrade:');
  });
});

// ── TEST 14: previous protections remain intact ────────────────────────────

describe('TEST 14 — the earlier safety protections remain intact', () => {
  it('the Phase 0 exchange gates are unchanged', () => {
    expect(chartSource).toContain('requireExchangeAction');
    expect(chartSource).toContain('placeBybitDemoOrder');
    expect(read('server/app.js')).toContain('assertMutationAllowed');
  });

  it('the S01/S02 chart protections are unchanged', () => {
    expect(chartSource).not.toContain('defaultBullPillars');
    expect(chartSource).not.toContain('(6/6 Confirmed)');
    expect(chartSource).not.toMatch(/s\.bars\.push\(/);
    expect(chartSource).toContain('applyCandleUpdate');
  });

  it('the S03-A position guards are unchanged', () => {
    expect(chartSource).toContain('openPos.id === s.activeTrade.positionId');
    expect(storeSource).toContain('SAFETY_CODES.POSITION_EXISTS');
  });
});

// ── TEST 15: no authenticated exchange order in the metrics path ───────────

describe('TEST 15 — the metrics path performs no exchange operation', () => {
  it('the adapter and the metrics core are pure', () => {
    for (const p of ['src/utils/paperMetricsView.js', 'src/utils/paperPerformanceMetrics.js']) {
      const source = read(p);
      expect(source).not.toMatch(/fetch\s*\(/);
      expect(source).not.toMatch(/placeBybit/);
      expect(source).not.toMatch(/localStorage\s*\./);
      expect(source).not.toMatch(/Math\.random\s*\(/);
      expect(source).not.toMatch(/setTimeout|setInterval/);
    }
  });
});

// ── React safety: source-level assertions ──────────────────────────────────

describe('React safety (source-inspected — no DOM harness in this project)', () => {
  it('both consumers memoize the shared view at the top level of the component', () => {
    for (const source of [botPanelSource, chartSource]) {
      expect(source).toContain('const paperView = useMemo(');
    }
  });

  it('the memo does not depend on the unrealised P&L, so it is not recomputed per tick', () => {
    for (const source of [botPanelSource, chartSource]) {
      const start = source.indexOf('const paperView = useMemo(');
      const end = source.indexOf(');', source.indexOf('demoAccount?.realizedPnL', start));
      const block = source.slice(start, end);
      expect(block).not.toContain('unrealizedPnL');
    }
  });

  it('neither consumer adds a market-data subscription', () => {
    // The chart still has exactly ONE feed subscription, and the Bot Panel
    // still has none.
    const chartFeeds = (chartSource.match(/createRealtimeCandleFeed\s*\(/g) || []).length;
    const panelFeeds = (botPanelSource.match(/createRealtimeCandleFeed\s*\(/g) || []).length;
    expect(chartFeeds).toBe(1);
    expect(panelFeeds).toBe(0);
  });

  it('no hook is introduced inside the metrics memo', () => {
    for (const source of [botPanelSource, chartSource]) {
      const start = source.indexOf('const paperView = useMemo(');
      const matched = source.slice(start).match(/const paperView = useMemo\([\s\S]*?\n {2}\);/);
      expect(matched).toBeTruthy();
      const block = matched[0];
      for (const hook of ['useState(', 'useEffect(', 'useRef(', 'useCallback(']) {
        expect(block).not.toContain(hook);
      }
    }
  });
});

describe('memoization contract: the journal is memoized, the account is read live', () => {
  it('neither consumer passes an account into the adapter', () => {
    // The adapter's optional `account` input would make accountEquity depend
    // on the unrealised P&L. These consumers deliberately do not use it: every
    // account figure is read straight from the store on every render.
    for (const source of [botPanelSource, chartSource]) {
      const start = source.indexOf('const paperView = useMemo(');
      const block = source.slice(start, start + 900);
      expect(block).not.toMatch(/account:\s*\{/);
      expect(block).not.toContain('unrealizedPnL');
      expect(block).not.toContain('balance');
    }
  });

  it('neither consumer displays the adapter accountEquity', () => {
    expect(botPanelSource).not.toContain('paperView.accountEquity');
    expect(chartSource).not.toContain('paperView.accountEquity');
  });

  it('both consumers read equity and unrealised P&L from the account state', () => {
    expect(botPanelSource).toContain('demoAccount.equity');
    expect(botPanelSource).toContain('demoAccount.unrealizedPnL');
    expect(chartSource).toContain('demoAccount.equity');
    expect(chartSource).toContain('demoAccount.unrealizedPnL');
  });

  it('the adapter returns N/A for accountEquity when no account is supplied', () => {
    const view = buildPaperMetricsView({ trades: [trade('pos_1000_1', 25)] });
    expect(view.accountEquity).toBe('N/A');
    // The journal metrics are still correct.
    expect(view.winRate).toBe('100%');
  });

  it('an account supplied to the adapter produces a real equity value', () => {
    const view = buildPaperMetricsView({
      trades: [trade('pos_1000_1', 25)],
      account: { balance: 10000, unrealizedPnL: -120 },
    });
    expect(view.accountEquity).toBe('9880.00');
  });
});

describe('the confluence label states no unsupported performance claim', () => {
  it('neither consumer claims an 8/10 or 80 % win rate', () => {
    expect(botPanelSource).not.toContain('8/10');
    expect(chartSource).not.toContain('8/10');
    expect(botPanelSource).not.toContain('80%+');
    expect(chartSource).not.toContain('80%+');
  });

  it('the engine has six pillars and a 4-5 threshold, not ten rules', () => {
    // The label is a product name, not a measured threshold.
    const source = chartSource;
    expect(source).toContain('CONFLUENCE SYSTEM');
    expect(source).toContain('const minRequired = engineMode === \'scalper\' ? 4 : 5;');
  });
});
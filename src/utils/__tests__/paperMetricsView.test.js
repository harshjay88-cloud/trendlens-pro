import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  NOT_AVAILABLE,
  buildPaperMetricsView,
  buildPerAssetMetrics,
  formatAccountAmount,
  formatIntegrityNotice,
  formatProfitFactor,
  formatScopeNotice,
  formatSignedAmount,
  formatWinRate,
  formatWinStreak,
} from '../paperMetricsView.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');

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

// ── Formatters ─────────────────────────────────────────────────────────────

describe('formatters never fabricate a number', () => {
  it('a null win rate is "N/A", never 0 %', () => {
    expect(formatWinRate(null)).toBe('N/A');
    expect(formatWinRate(undefined)).toBe('N/A');
    expect(formatWinRate(NaN)).toBe('N/A');
    expect(formatWinRate(Infinity)).toBe('N/A');
    expect(formatWinRate(0)).toBe('0%');
    expect(formatWinRate(66.666)).toBe('67%');
  });

  it('a null profit factor is "N/A", never infinity', () => {
    expect(formatProfitFactor(null)).toBe('N/A');
    expect(formatProfitFactor(Infinity)).toBe('N/A');
    expect(formatProfitFactor(1.5)).toBe('1.50x');
  });

  it('pips and USD are formatted separately', () => {
    expect(formatSignedAmount(4, 'pips')).toBe('+4.0');
    expect(formatSignedAmount(-4, 'pips')).toBe('-4.0');
    expect(formatSignedAmount(12.5, 'usd')).toBe('+12.50');
    expect(formatSignedAmount(null, 'usd')).toBe('N/A');
  });

  it('a zero amount carries no sign, so a break-even never reads as a gain', () => {
    expect(formatSignedAmount(0, 'usd')).toBe('0.00');
    expect(formatSignedAmount(0, 'pips')).toBe('0.0');
  });

  it('an account level never carries a sign', () => {
    expect(formatAccountAmount(9880)).toBe('9880.00');
    expect(formatAccountAmount(-120)).toBe('-120.00');
    expect(formatAccountAmount(null)).toBe('N/A');
  });
});

// ── Streak safety ──────────────────────────────────────────────────────────

describe('a winning streak is only shown as a fact when its order is verified', () => {
  it('shows the streak when the identifiers verify the order', () => {
    const view = buildPaperMetricsView({
      trades: [trade('pos_3000_1', 10), trade('pos_2000_1', 10), trade('pos_1000_1', -5)],
    });
    expect(view.currentStreak.verified).toBe(true);
    expect(view.currentStreak.value).toBe('2');
    expect(view.currentStreak.note).toBeNull();
  });

  it('shows N/A with a note when the order cannot be verified', () => {
    const view = buildPaperMetricsView({
      trades: [
        { ...trade('legacy_a', 10) },
        { ...trade('legacy_b', 10) },
        { ...trade('legacy_c', -5) },
      ],
    });
    expect(view.currentStreak.verified).toBe(false);
    expect(view.currentStreak.value).toBe(NOT_AVAILABLE);
    expect(view.currentStreak.note).toMatch(/not shown as a fact/i);
    // The estimate is exposed separately, never as the displayed value.
    expect(view.currentStreak.estimate).toBe(2);
  });

  it('formatWinStreak can be used directly', () => {
    const verified = formatWinStreak(
      { streak: { orderingVerified: true }, currentWinStreak: 3, longestWinStreak: 5 },
      'current'
    );
    expect(verified.value).toBe('3');
    expect(verified.verified).toBe(true);

    const longest = formatWinStreak(
      { streak: { orderingVerified: true }, currentWinStreak: 3, longestWinStreak: 5 },
      'longest'
    );
    expect(longest.value).toBe('5');

    const unverified = formatWinStreak(
      { streak: { orderingVerified: false }, currentWinStreak: 3, longestWinStreak: 5 },
      'current'
    );
    expect(unverified.value).toBe(NOT_AVAILABLE);
    expect(unverified.estimate).toBe(3);
  });
});

// ── Scope and integrity ────────────────────────────────────────────────────

describe('scope and integrity notices', () => {
  it('states that the figures are the retained journal and not all-time', () => {
    const view = buildPaperMetricsView({ trades: [trade('a', 10)] });
    expect(view.scopeNotice).toMatch(/Retained journal/i);
    expect(view.scopeNotice).toMatch(/not an all-time record/i);
  });

  it('explains that earlier trades MAY be missing when the limit is reached', () => {
    const many = Array.from({ length: 50 }, (_, i) => trade(`pos_${1000 + i}_1`, 1));
    const view = buildPaperMetricsView({ trades: many });
    expect(view.scopeNotice).toMatch(/may be missing/i);
    expect(view.scopeNotice).not.toMatch(/were deleted|were discarded/i);
  });

  it('reports excluded, duplicate and mismatched records', () => {
    const view = buildPaperMetricsView({
      trades: [
        trade('pos_1000_1', 10),
        { ...trade('pos_2000_1', undefined), pnlDollars: undefined },
        trade('pos_3000_1', 10),
        trade('pos_3000_1', 10),
        trade('pos_4000_1', 10, { result: 'LOSS' }),
      ],
    });
    const notice = formatIntegrityNotice(view.metrics);
    expect(notice).toMatch(/excluded/i);
    expect(notice).toMatch(/duplicate/i);
    expect(notice).toMatch(/disagreed/i);
  });

  it('returns no notice when the journal is clean', () => {
    const view = buildPaperMetricsView({ trades: [trade('pos_1000_1', 10)] });
    expect(view.integrityNotice).toBeNull();
  });

  it('the scope notice is never null', () => {
    expect(formatScopeNotice(buildPaperMetricsView({}).metrics)).toBeTruthy();
  });
});

// ── The view model ─────────────────────────────────────────────────────────

describe('the view model', () => {
  it('handles an empty journal without NaN or undefined', () => {
    const view = buildPaperMetricsView({ trades: [] });
    expect(view.winRate).toBe('N/A');
    expect(view.totalPips).toBe('N/A');
    expect(view.profitFactor).toBe('N/A');
    expect(view.realizedPnl).toBe('0.00');
    expect(view.totalClosedTrades).toBe(0);
    expect(view.currentStreak.value).toBe('0');
  });

  it('handles one winning trade', () => {
    const view = buildPaperMetricsView({ trades: [trade('pos_1000_1', 25)] });
    expect(view.totalClosedTrades).toBe(1);
    expect(view.wins).toBe(1);
    expect(view.winRate).toBe('100%');
    expect(view.realizedPnl).toBe('+25.00');
    expect(view.totalPips).toBe('+10.0');
  });

  it('handles one losing trade', () => {
    const view = buildPaperMetricsView({ trades: [trade('pos_1000_1', -15)] });
    expect(view.losses).toBe(1);
    expect(view.winRate).toBe('0%');
    expect(view.realizedPnl).toBe('-15.00');
  });

  it('handles one break-even trade without counting it as a win or a loss', () => {
    const view = buildPaperMetricsView({ trades: [trade('pos_1000_1', 0)] });
    expect(view.breakEvens).toBe(1);
    expect(view.wins).toBe(0);
    expect(view.losses).toBe(0);
    expect(view.winRate).toBe('N/A');
    expect(view.realizedPnl).toBe('0.00');
  });

  it('handles a mixed journal', () => {
    const view = buildPaperMetricsView({
      trades: [
        trade('pos_4000_1', 30),
        trade('pos_3000_1', -10),
        trade('pos_2000_1', 0),
        trade('pos_1000_1', 20),
      ],
    });
    expect(view.totalClosedTrades).toBe(4);
    expect(view.wins).toBe(2);
    expect(view.losses).toBe(1);
    expect(view.breakEvens).toBe(1);
    expect(view.winRate).toBe('67%');
    expect(view.profitFactor).toBe('5.00x');
  });

  it('handles a journal at the retention limit', () => {
    const many = Array.from({ length: 50 }, (_, i) => trade(`pos_${1000 + i}_1`, 1));
    const view = buildPaperMetricsView({ trades: many });
    expect(view.totalClosedTrades).toBe(50);
    expect(view.scopeNotice).toMatch(/limit 50/i);
  });

  it('handles counters that differ from the retained journal', () => {
    const view = buildPaperMetricsView({
      trades: [trade('pos_1000_1', 25)],
      counters: { winCount: 40, lossCount: 12, breakevenCount: 3, realizedPnL: 900 },
    });
    expect(view.reconciliation).toBeTruthy();
    expect(view.reconciliation.consistent).toBe(false);
    expect(view.reconciliation.differences.wins).toBe(39);
    // The journal-derived metric is unaffected by the lifetime counters.
    expect(view.wins).toBe(1);
  });

  it('handles invalid legacy records', () => {
    const view = buildPaperMetricsView({
      trades: [
        { ...trade('legacy_ok', 10) },
        { ...trade('legacy_bad', undefined), pnlDollars: undefined, pips: undefined },
        { ...trade('legacy_nan', NaN) },
        null,
      ],
    });
    expect(view.totalClosedTrades).toBe(1);
    expect(view.wins).toBe(1);
    expect(view.integrityNotice).toMatch(/excluded/i);
  });

  it('handles missing pips without fabricating a zero', () => {
    const view = buildPaperMetricsView({
      trades: [{ ...trade('pos_1000_1', 25), pips: undefined }],
    });
    expect(view.totalPips).toBe('N/A');
    expect(view.realizedPnl).toBe('+25.00');
  });

  it('takes account equity from the account state', () => {
    const view = buildPaperMetricsView({
      trades: [trade('pos_1000_1', 25)],
      account: { balance: 10000, unrealizedPnL: -120 },
    });
    expect(view.accountEquity).toBe('9880.00');
  });

  it('never produces NaN, Infinity or undefined in a display value', () => {
    const cases = [
      { trades: [] },
      { trades: [trade('a', 25)] },
      { trades: [trade('a', NaN)] },
      { trades: [trade('a', Infinity)] },
      { trades: [trade('a', 25)], account: { balance: NaN, unrealizedPnL: 0 } },
      { trades: [trade('a', 25)], account: { balance: Infinity, unrealizedPnL: 0 } },
    ];
    for (const input of cases) {
      const view = buildPaperMetricsView(input);
      for (const key of [
        'winRate', 'profitFactor', 'realizedPnl', 'totalPips', 'accountEquity',
        'totalClosedTrades', 'wins', 'losses', 'breakEvens',
      ]) {
        expect(view[key]).not.toBeUndefined();
        expect(String(view[key])).not.toMatch(/NaN|Infinity/);
      }
    }
  });
});

// ── Per-asset ──────────────────────────────────────────────────────────────

describe('per-asset performance uses the same rules', () => {
  it('applies the shared win-rate rule to each asset subset', () => {
    const rows = buildPerAssetMetrics([
      trade('pos_1000_1', 10, { asset: 'XAU/USD' }),
      trade('pos_900_1', -5, { asset: 'XAU/USD' }),
      trade('pos_800_1', 0, { asset: 'BTC/USD' }),
      trade('pos_700_1', 20, { asset: 'BTC/USD' }),
    ]);

    const xau = rows.find((r) => r.label === 'XAU/USD');
    const btc = rows.find((r) => r.label === 'BTC/USD');
    // XAU: 1 win, 1 loss, 0 break-even -> 50 %
    expect(xau.winRate).toBe('50%');
    // BTC: 1 win, 0 losses, 1 break-even -> 100 % (break-even excluded)
    expect(btc.winRate).toBe('100%');
  });

  it('reports N/A for an asset with no decided trades', () => {
    const rows = buildPerAssetMetrics([trade('pos_1000_1', 0, { asset: 'XAU/USD' })]);
    expect(rows[0].winRate).toBe('N/A');
  });
});

// ── Both pages consume the same adapter ────────────────────────────────────

describe('the Dashboard and the Profile consume the same shared calculations', () => {
  const dashboardSource = readFileSync(path.join(repoRoot, 'src', 'pages', 'Dashboard.jsx'), 'utf8');
  const profileSource = readFileSync(path.join(repoRoot, 'src', 'pages', 'Profile.jsx'), 'utf8');

  it('both pages import the shared view adapter', () => {
    expect(dashboardSource).toContain("from '../utils/paperMetricsView.js'");
    expect(profileSource).toContain("from '../utils/paperMetricsView.js'");
  });

  it('neither page reduces the journal inline any more', () => {
    expect(dashboardSource).not.toMatch(/filter\(\(t\) => \(t\.pnlDollars \|\| 0\) > 0\)/);
    expect(profileSource).not.toMatch(/filter\(\(t\) => \(t\.pnlDollars \|\| 0\) > 0\)/);
    expect(dashboardSource).not.toMatch(/reduce\(\(s, t\) => s \+ \(t\.pips \|\| 0\)/);
    expect(profileSource).not.toMatch(/reduce\(\(s, t\) => s \+ \(t\.pips \|\| 0\)/);
  });

  it('both pages use the same adapter, so identical input gives identical output', () => {
    const input = {
      trades: [
        trade('pos_3000_1', 30),
        trade('pos_2000_1', -10),
        trade('pos_1000_1', 0),
      ],
      account: { balance: 10000, unrealizedPnL: 5 },
    };
    const a = buildPaperMetricsView(input);
    const b = buildPaperMetricsView(input);
    expect(a.winRate).toBe(b.winRate);
    expect(a.totalPips).toBe(b.totalPips);
    expect(a.realizedPnl).toBe(b.realizedPnl);
    expect(a.scopeNotice).toBe(b.scopeNotice);
  });

  it('a signal score is never used as a profitability statistic', () => {
    // The Dashboard keeps the confluence badge, but it is not a metric.
    expect(dashboardSource).toContain('latestConfluence');
    expect(dashboardSource).not.toMatch(/winRate\s*=\s*[^;]*confluence/i);
    expect(profileSource).not.toMatch(/winRate\s*=\s*[^;]*confluence/i);
  });
});

describe('partial pip coverage is disclosed', () => {
  it('states how many of the recorded trades carry valid pip data', () => {
    const view = buildPaperMetricsView({
      trades: [
        { ...trade('pos_3000_1', 10), pips: 5 },
        { ...trade('pos_2000_1', -5), pips: undefined },
        { ...trade('pos_1000_1', 20), pips: 8 },
      ],
    });
    // The total only sums the records that HAVE valid pip data.
    expect(view.totalPips).toBe('+13.0');
    // ...and the coverage is disclosed.
    expect(view.pipsCoverageNotice).toMatch(/Pips cover 2 of 3 recorded trades/i);
    expect(view.pipsCoverageNotice).toMatch(/not included in the total/i);
  });

  it('reports no coverage notice when every record has valid pips', () => {
    const view = buildPaperMetricsView({
      trades: [
        { ...trade('pos_2000_1', 10), pips: 5 },
        { ...trade('pos_1000_1', 20), pips: 8 },
      ],
    });
    expect(view.pipsCoverageNotice).toBeNull();
    expect(view.totalPips).toBe('+13.0');
  });

  it('never turns missing pips into zero pips', () => {
    const view = buildPaperMetricsView({
      trades: [{ ...trade('pos_1000_1', 25), pips: undefined }],
    });
    expect(view.totalPips).toBe('N/A');
    expect(view.totalPips).not.toBe('+0.0');
  });

  it('keeps pips and USD P&L separate', () => {
    const view = buildPaperMetricsView({
      trades: [
        { ...trade('pos_2000_1', 30), pips: 12 },
        { ...trade('pos_1000_1', -10), pips: -4 },
      ],
    });
    expect(view.totalPips).toBe('+8.0');
    expect(view.realizedPnl).toBe('+20.00');
  });
});

describe('per-asset grouping uses the canonical instrument identity', () => {
  it('groups equivalent labels of the same instrument', () => {
    const rows = buildPerAssetMetrics([
      { ...trade('pos_3000_1', 10), asset: 'XAU/USD' },
      { ...trade('pos_2000_1', 20), asset: 'XAUUSDT' },
      { ...trade('pos_1000_1', -5), asset: 'XAU/USDT' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('XAU/USD');
    expect(rows[0].totalClosedTrades).toBe(3);
    expect(rows[0].winRate).toBe('67%');
  });

  it('keeps different instruments apart', () => {
    const rows = buildPerAssetMetrics([
      { ...trade('pos_2000_1', 10), asset: 'XAU/USD' },
      { ...trade('pos_1000_1', 20), asset: 'BTC/USD' },
    ]);
    expect(rows).toHaveLength(2);
  });

  it('never assigns an unknown alias to a real instrument', () => {
    const rows = buildPerAssetMetrics([
      { ...trade('pos_2000_1', 10), asset: 'NAS100' },
      { ...trade('pos_1000_1', 20), asset: 'BTC/USD' },
    ]);
    const labels = rows.map((r) => r.label).sort();
    expect(labels).toEqual(['BTC/USD', 'NAS100']);
  });

  it('groups a record with no asset under Unknown, never under a real instrument', () => {
    const rows = buildPerAssetMetrics([
      { ...trade('pos_2000_1', 10), asset: undefined },
      { ...trade('pos_1000_1', 20), asset: 'BTC/USD' },
    ]);
    const labels = rows.map((r) => r.label).sort();
    expect(labels).toEqual(['BTC/USD', 'Unknown']);
  });

  it('does not double-count a duplicate id inside an asset subset', () => {
    const rows = buildPerAssetMetrics([
      { ...trade('pos_2000_1', 10), asset: 'XAU/USD' },
      { ...trade('pos_2000_1', 10), asset: 'XAU/USD' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalClosedTrades).toBe(1);
    expect(rows[0].metrics.integrity.duplicateIdCount).toBe(1);
  });

  it('excludes an invalid P&L from an asset subset and reports it', () => {
    const rows = buildPerAssetMetrics([
      { ...trade('pos_2000_1', 10), asset: 'XAU/USD' },
      { ...trade('pos_1000_1', NaN), asset: 'XAU/USD' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalClosedTrades).toBe(1);
    expect(rows[0].metrics.integrity.excludedCount).toBe(1);
  });
});
describe('UI rendering assertions (source-inspected — no DOM harness in this project)', () => {
  const dashboardSource = readFileSync(path.join(repoRoot, 'src', 'pages', 'Dashboard.jsx'), 'utf8');
  const profileSource = readFileSync(path.join(repoRoot, 'src', 'pages', 'Profile.jsx'), 'utf8');

  it('the Dashboard surfaces the scope notice and the pip coverage notice', () => {
    expect(dashboardSource).toContain('paperView.scopeNotice');
    expect(dashboardSource).toContain('paperView.pipsCoverageNotice');
    expect(dashboardSource).toContain('paperView.winRate');
    expect(dashboardSource).toContain('paperView.totalPips');
  });

  it('the Profile surfaces the scope, pip coverage, integrity and streak notes', () => {
    expect(profileSource).toContain('paperView.scopeNotice');
    expect(profileSource).toContain('paperView.pipsCoverageNotice');
    expect(profileSource).toContain('paperView.integrityNotice');
    expect(profileSource).toContain('paperView.currentStreak.note');
  });

  it('the Profile per-asset row renders N/A rather than a 0 % bar', () => {
    expect(profileSource).toContain("a.winRate === 'N/A'");
    // The old fabricated zero-width bar is gone.
    expect(profileSource).not.toContain("width: a.val + '%'");
  });

  it('neither page labels a retained-journal metric as an all-time or lifetime figure', () => {
    // The pages may explain that a figure is NOT all-time; they must never
    // present one as an all-time or lifetime total.
    for (const source of [dashboardSource, profileSource]) {
      expect(source).not.toMatch(/(label|sub|title)="[^"]*(all[- ]time|lifetime)/i);
      expect(source).not.toMatch(/'(All[- ]Time|Lifetime)[^']*'/i);
      expect(source).not.toMatch(/`(All[- ]Time|Lifetime)[^`]*`/i);
    }
    // The scope wording comes from the shared adapter and is surfaced by both pages.
    const viewSource = readFileSync(path.join(repoRoot, 'src', 'utils', 'paperMetricsView.js'), 'utf8');
    expect(viewSource).toContain('Retained journal');
    expect(dashboardSource).toContain('paperView.scopeNotice');
    expect(profileSource).toContain('paperView.scopeNotice');
  });

  it('neither page writes to the paper account', () => {
    for (const source of [dashboardSource, profileSource]) {
      expect(source).not.toContain('openDemoTrade(');
      expect(source).not.toContain('closeDemoTrade(');
      expect(source).not.toContain('resetDemoAccount(');
      expect(source).not.toContain('setAccount(');
    }
  });
});
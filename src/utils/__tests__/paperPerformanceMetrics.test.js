import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  INTEGRATION_GUIDE,
  MAX_RETAINED_JOURNAL_ENTRIES,
  METRIC_SCOPE,
  UNAVAILABLE_REASON,
  computePaperPerformanceMetrics,
  isCompletedTrade,
  reconcileJournalWithCounters,
} from '../paperPerformanceMetrics.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');

/** A deterministic journal record, shaped exactly like the store's rows. */
const trade = (id, pnlDollars, extra = {}) => ({
  id,
  asset: 'XAU/USD',
  type: 'BUY',
  lotSize: 1,
  entryPrice: 1000,
  exitPrice: 1010,
  tp: 1010,
  sl: 990,
  pips: 10,
  pnlDollars,
  result: pnlDollars > 0 ? 'WIN' : pnlDollars < 0 ? 'LOSS' : 'BREAKEVEN',
  reason: 'test',
  time: '10:00',
  closeTime: '10:05',
  duration: '5m',
  maxDrawdownPips: 0,
  maxRunupPips: 10,
  confluence: 70,
  exchangeOrderId: null,
  exchange: null,
  ...extra,
});

const win = (id = 'w1', pnl = 25) => trade(id, pnl);
const loss = (id = 'l1', pnl = -15) => trade(id, pnl);
const flat = (id = 'b1') => trade(id, 0);

describe('1 — empty journal', () => {
  it('returns null for every derived metric', () => {
    const m = computePaperPerformanceMetrics([]);
    expect(m.totalClosedTrades).toBe(0);
    expect(m.wins).toBe(0);
    expect(m.losses).toBe(0);
    expect(m.breakEvens).toBe(0);
    expect(m.winRate).toBeNull();
    expect(m.profitFactor).toBeNull();
    expect(m.expectancy).toBeNull();
    expect(m.realizedPnl).toBe(0);
    expect(m.unavailableReasons.winRate).toBe(UNAVAILABLE_REASON.NO_VALID_TRADES);
  });
});

describe('2 — one WIN', () => {
  it('counts one win and reports a 100 % win rate', () => {
    const m = computePaperPerformanceMetrics([win()]);
    expect(m.totalClosedTrades).toBe(1);
    expect(m.wins).toBe(1);
    expect(m.winRate).toBe(100);
    expect(m.realizedPnl).toBe(25);
    expect(m.grossProfit).toBe(25);
    expect(m.grossLoss).toBe(0);
    expect(m.profitFactor).toBeNull();
    expect(m.unavailableReasons.profitFactor).toBe(UNAVAILABLE_REASON.NO_LOSSES);
  });
});

describe('3 — one LOSS', () => {
  it('counts one loss and reports a 0 % win rate', () => {
    const m = computePaperPerformanceMetrics([loss()]);
    expect(m.losses).toBe(1);
    expect(m.wins).toBe(0);
    expect(m.winRate).toBe(0);
    expect(m.realizedPnl).toBe(-15);
    expect(m.grossLoss).toBe(15);
    expect(m.profitFactor).toBe(0);
    expect(m.averageWin).toBeNull();
  });
});

describe('4 — one BREAKEVEN', () => {
  it('counts a break-even and increments no win or loss', () => {
    const m = computePaperPerformanceMetrics([flat()]);
    expect(m.breakEvens).toBe(1);
    expect(m.wins).toBe(0);
    expect(m.losses).toBe(0);
    expect(m.realizedPnl).toBe(0);
    expect(m.expectancy).toBe(0);
  });
});

describe('5 — multiple mixed outcomes', () => {
  it('aggregates every population correctly', () => {
    const m = computePaperPerformanceMetrics([
      win('a', 30), loss('b', -10), flat('c'), win('d', 20), loss('e', -5),
    ]);
    expect(m.totalClosedTrades).toBe(5);
    expect(m.wins).toBe(2);
    expect(m.losses).toBe(2);
    expect(m.breakEvens).toBe(1);
    expect(m.realizedPnl).toBe(35);
    expect(m.grossProfit).toBe(50);
    expect(m.grossLoss).toBe(15);
    expect(m.winRate).toBe(50);
    expect(m.profitFactor).toBeCloseTo(50 / 15, 10);
  });
});

describe('6 — break-evens are excluded from the win-rate denominator', () => {
  it('uses wins / (wins + losses)', () => {
    const m = computePaperPerformanceMetrics([win('a', 10), win('b', 10), flat('c'), flat('d')]);
    expect(m.wins).toBe(2);
    expect(m.losses).toBe(0);
    expect(m.breakEvens).toBe(2);
    expect(m.winRate).toBe(100);
    expect(m.decidedTrades).toBe(2);
  });
});

describe('7 — an all-break-even journal returns winRate = null', () => {
  it('does not manufacture a 0 % or 100 % win rate', () => {
    const m = computePaperPerformanceMetrics([flat('a'), flat('b')]);
    expect(m.winRate).toBeNull();
    expect(m.unavailableReasons.winRate).toBe(UNAVAILABLE_REASON.NO_DECIDED_TRADES);
    expect(m.breakEvens).toBe(2);
  });
});

describe('8 — gross profit', () => {
  it('sums only positive realized P&L', () => {
    const m = computePaperPerformanceMetrics([win('a', 10), loss('b', -7), win('c', 5)]);
    expect(m.grossProfit).toBe(15);
  });
});

describe('9 — gross loss', () => {
  it('is the absolute sum of negative realized P&L', () => {
    const m = computePaperPerformanceMetrics([win('a', 10), loss('b', -7), loss('c', -3)]);
    expect(m.grossLoss).toBe(10);
  });
});

describe('10 — profit factor', () => {
  it('is grossProfit / grossLoss', () => {
    const m = computePaperPerformanceMetrics([win('a', 30), loss('b', -10)]);
    expect(m.profitFactor).toBe(3);
  });
});

describe('11 — profit factor is unavailable without losses', () => {
  it('returns null with an explicit reason instead of a misleading figure', () => {
    const m = computePaperPerformanceMetrics([win('a', 30), win('b', 10)]);
    expect(m.profitFactor).toBeNull();
    expect(m.unavailableReasons.profitFactor).toBe(UNAVAILABLE_REASON.NO_LOSSES);
  });
});

describe('12 — realized P&L', () => {
  it('sums the valid booked P&L of the scope', () => {
    const m = computePaperPerformanceMetrics([win('a', 30), loss('b', -12), flat('c')]);
    expect(m.realizedPnl).toBe(18);
  });
});

describe('13 — average win and average loss', () => {
  it('uses their own populations', () => {
    const m = computePaperPerformanceMetrics([win('a', 30), win('b', 10), loss('c', -8)]);
    expect(m.averageWin).toBe(20);
    expect(m.averageLoss).toBe(8);
  });

  it('returns null when a population is empty', () => {
    const m = computePaperPerformanceMetrics([win('a', 30)]);
    expect(m.averageWin).toBe(30);
    expect(m.averageLoss).toBeNull();
    expect(m.unavailableReasons.averageLoss).toBe(UNAVAILABLE_REASON.NO_LOSSES);
  });
});

describe('14 — expectancy', () => {
  it('is the average realized P&L per valid completed trade', () => {
    const m = computePaperPerformanceMetrics([win('a', 30), loss('b', -10)]);
    expect(m.expectancy).toBe(10);
  });
});

describe('15 — duplicate ids do not double-count', () => {
  it('counts the trade once and reports the conflict', () => {
    const m = computePaperPerformanceMetrics([win('a', 25), win('a', 25)]);
    expect(m.totalClosedTrades).toBe(1);
    expect(m.wins).toBe(1);
    expect(m.realizedPnl).toBe(25);
    expect(m.integrity.duplicateIdCount).toBe(1);
    expect(m.integrity.duplicateIds).toEqual(['a']);
  });
});

describe('16 — NaN, Infinity and malformed P&L cannot corrupt the metrics', () => {
  it('excludes them and reports how many were excluded', () => {
    const m = computePaperPerformanceMetrics([
      win('a', 25),
      trade('b', NaN),
      trade('c', Infinity),
      trade('d', 'abc'),
      trade('e', undefined),
    ]);
    expect(m.totalClosedTrades).toBe(1);
    expect(m.realizedPnl).toBe(25);
    expect(m.integrity.excludedCount).toBe(4);
    expect(m.integrity.excluded.INVALID_PNL).toBe(4);
  });
});

describe('17 — a missing P&L is not interpreted as a break-even', () => {
  it('is excluded, never counted as a zero-P&L trade', () => {
    const m = computePaperPerformanceMetrics([trade('a', undefined), flat('b')]);
    expect(m.totalClosedTrades).toBe(1);
    expect(m.breakEvens).toBe(1);
    expect(m.wins).toBe(0);
    expect(m.losses).toBe(0);
    expect(m.integrity.excluded.INVALID_PNL).toBe(1);
  });
});

describe('18 — open, rejected and unresolved records are not counted', () => {
  it('excludes them', () => {
    const m = computePaperPerformanceMetrics([
      win('a', 25),
      trade('b', 100, { status: 'active' }),
      trade('c', 100, { status: 'rejected' }),
      trade('d', 100, { resolved: false }),
      trade('e', 100, { completed: false }),
      trade('f', 100, { open: true }),
    ]);
    expect(m.totalClosedTrades).toBe(1);
    expect(m.wins).toBe(1);
    expect(m.realizedPnl).toBe(25);
    expect(m.integrity.excludedCount).toBe(5);
  });

  it('the completion check is exposed', () => {
    expect(isCompletedTrade(win()).completed).toBe(true);
    expect(isCompletedTrade(trade('x', 1, { status: 'active' })).completed).toBe(false);
    expect(isCompletedTrade(null).completed).toBe(false);
  });
});

describe('19 — existing valid legacy journal records remain readable', () => {
  it('reads a record that has no confluence or order id', () => {
    const legacy = {
      id: 'legacy_1', asset: 'XAU/USD', type: 'BUY', entryPrice: 1000, exitPrice: 1010,
      pips: 10, pnlDollars: 100, result: 'WIN', time: '10:00', closeTime: '10:05',
    };
    const m = computePaperPerformanceMetrics([legacy]);
    expect(m.totalClosedTrades).toBe(1);
    expect(m.wins).toBe(1);
    expect(m.realizedPnl).toBe(100);
  });

  it('reports a stored result that disagrees with the booked P&L', () => {
    const m = computePaperPerformanceMetrics([trade('a', 25, { result: 'LOSS' })]);
    expect(m.wins).toBe(1);
    expect(m.integrity.resultMismatchCount).toBe(1);
    expect(m.integrity.resultMismatches[0]).toMatchObject({ id: 'a', stored: 'LOSS', derived: 'WIN' });
  });
});

describe('20 — journal records are never mutated', () => {
  it('leaves the input array and its records untouched', () => {
    const input = [win('a', 25), loss('b', -10)];
    const snapshot = JSON.parse(JSON.stringify(input));
    computePaperPerformanceMetrics(input);
    expect(input).toEqual(snapshot);
  });
});

describe('21 — identical input produces identical output', () => {
  it('is deterministic', () => {
    const input = [win('a', 25), loss('b', -10), flat('c')];
    expect(computePaperPerformanceMetrics(input)).toEqual(computePaperPerformanceMetrics(input));
  });
});

describe('22 — counters that differ from the retained journal are reported explicitly', () => {
  it('produces a reconciliation report without changing anything', () => {
    const m = computePaperPerformanceMetrics([win('a', 25), loss('b', -10)]);
    const report = reconcileJournalWithCounters(m, {
      winCount: 40, lossCount: 12, breakevenCount: 3, realizedPnL: 900,
    });

    expect(report.journal.wins).toBe(1);
    expect(report.stored.wins).toBe(40);
    expect(report.differences.wins).toBe(39);
    expect(report.differences.losses).toBe(11);
    expect(report.consistent).toBe(false);
    expect(report.scopeLimitations.length).toBeGreaterThan(0);
  });

  it('reports consistency when the counters match the journal', () => {
    const m = computePaperPerformanceMetrics([win('a', 25), loss('b', -10)]);
    const report = reconcileJournalWithCounters(m, {
      winCount: 1, lossCount: 1, breakevenCount: 0, realizedPnL: 15,
    });
    expect(report.consistent).toBe(true);
    expect(report.differences.wins).toBe(0);
  });
});

describe('23 — a truncated or unknown-history journal is never labelled all-time', () => {
  it('always reports the retained-journal scope', () => {
    const m = computePaperPerformanceMetrics([win('a', 25)]);
    expect(m.scope.kind).toBe(METRIC_SCOPE.JOURNAL_RETAINED);
    expect(m.scope.isAllTime).toBe(false);
    expect(m.scope.isCompleteHistory).toBe(false);
    expect(m.scope.maxRetainedEntries).toBe(MAX_RETAINED_JOURNAL_ENTRIES);
    expect(m.scope.note).toMatch(/never an all-time record/i);
  });

  it('reports the retention limit being reached without claiming records were lost', () => {
    const full = Array.from({ length: MAX_RETAINED_JOURNAL_ENTRIES }, (_, i) => win(`t${i}`, 1));
    const m = computePaperPerformanceMetrics(full);
    expect(m.scope.retentionLimitReached).toBe(true);
    expect(m.scope.historyMayBeIncomplete).toBe(true);
    // It is never asserted that records were definitely discarded.
    expect(m.scope.historyDefinitivelyIncomplete).toBe(false);
    expect(m.scope.retainedCount).toBe(MAX_RETAINED_JOURNAL_ENTRIES);
  });

  it('reports the retention state for 0, 49, 50 and more than 50 records', () => {
    const build = (n) => Array.from({ length: n }, (_, i) => win(`t${i}`, 1));

    const empty = computePaperPerformanceMetrics([]);
    expect(empty.scope.retainedCount).toBe(0);
    expect(empty.scope.retentionLimitReached).toBe(false);
    expect(empty.scope.historyMayBeIncomplete).toBe(false);

    const under = computePaperPerformanceMetrics(build(49));
    expect(under.scope.retentionLimitReached).toBe(false);
    expect(under.scope.historyMayBeIncomplete).toBe(false);

    const at = computePaperPerformanceMetrics(build(50));
    expect(at.scope.retentionLimitReached).toBe(true);

    const over = computePaperPerformanceMetrics(build(57));
    expect(over.scope.retainedCount).toBe(57);
    expect(over.scope.retentionLimitReached).toBe(true);
  });
});

describe('winning streaks follow the chronological order', () => {
  // The store writes the journal newest first.
  const newestFirst = [win('pos_3000_1', 10), win('pos_2000_1', 10), loss('pos_1000_1', -5)];

  it('counts the current streak from the newest completed trade backwards', () => {
    const m = computePaperPerformanceMetrics(newestFirst);
    expect(m.currentWinStreak).toBe(2);
    expect(m.longestWinStreak).toBe(2);
  });

  it('gives the same answer for an oldest-first array', () => {
    const oldestFirst = [...newestFirst].reverse();
    const m = computePaperPerformanceMetrics(oldestFirst);
    expect(m.currentWinStreak).toBe(2);
    expect(m.longestWinStreak).toBe(2);
  });

  it('derives the order from the record identifiers when they are available', () => {
    const m = computePaperPerformanceMetrics(newestFirst);
    expect(m.streak.ordering).toBe('derived-from-record-identifiers');
    expect(m.streak.orderingVerified).toBe(true);
  });

  it('falls back to the journal array order and documents the assumption', () => {
    const legacy = [{ ...win('legacy_a', 10) }, { ...win('legacy_b', 10) }, { ...loss('legacy_c', -5) }];
    const m = computePaperPerformanceMetrics(legacy);
    expect(m.streak.ordering).toBe('journal-array-order');
    expect(m.streak.orderingVerified).toBe(false);
    expect(m.streak.assumption).toMatch(/newest first/i);
  });

  it('a LOSS ends a winning streak', () => {
    const m = computePaperPerformanceMetrics([
      win('pos_3000_1', 10), loss('pos_2000_1', -5), win('pos_1000_1', 10),
    ]);
    expect(m.currentWinStreak).toBe(1);
    expect(m.longestWinStreak).toBe(1);
  });

  it('a BREAKEVEN ends a winning streak and the policy is documented', () => {
    const m = computePaperPerformanceMetrics([
      win('pos_3000_1', 10), flat('pos_2000_1'), win('pos_1000_1', 10),
    ]);
    expect(m.currentWinStreak).toBe(1);
    expect(m.streak.policy).toMatch(/BREAKEVEN/);
    expect(m.streak.policy).toMatch(/not a win/i);
  });

  it('reports the longest run anywhere in the journal', () => {
    const m = computePaperPerformanceMetrics([
      loss('pos_5000_1', -5),
      win('pos_4000_1', 10), win('pos_3000_1', 10), win('pos_2000_1', 10),
      win('pos_1000_1', 10),
    ]);
    expect(m.currentWinStreak).toBe(0);
    expect(m.longestWinStreak).toBe(4);
  });
});

describe('24 — the previous safety guards remain intact', () => {
  it('the account store still refuses an overwrite and a cross-asset close', () => {
    const storeSource = readFileSync(path.join(repoRoot, 'src', 'store', 'index.js'), 'utf8');
    expect(storeSource).toContain('SAFETY_CODES.POSITION_EXISTS');
    expect(storeSource).toContain('canClosePosition');
    expect(storeSource).toContain('POSITION_ID_REQUIRED');
    expect(storeSource).toContain('INVALID_PNL');
    expect(storeSource).not.toMatch(/force:\s*true/);
  });

  it('the chart still gates exchange orders', () => {
    const chartSource = readFileSync(
      path.join(repoRoot, 'src', 'components', 'common', 'TrendLensUltraChart.jsx'),
      'utf8'
    );
    expect(chartSource).toContain('requireExchangeAction');
    expect(chartSource).toContain('updateOpenTradeOrderId(res.orderId, opened.position.id)');
  });
});

describe('the integration guide documents the S03-B2B replacements', () => {
  it('names every surface that still computes metrics inline', () => {
    const files = INTEGRATION_GUIDE.replaceIn.map((entry) => entry.file);
    expect(files).toContain('src/components/common/TrendLensBotPanel.jsx');
    expect(files).toContain('src/components/common/TrendLensUltraChart.jsx');
    expect(files).toContain('src/pages/Dashboard.jsx');
    expect(files).toContain('src/pages/Profile.jsx');
    for (const entry of INTEGRATION_GUIDE.replaceIn) {
      expect(entry.current.length).toBeGreaterThan(0);
      expect(entry.replaceWith.length).toBeGreaterThan(0);
    }
  });

  it('states that a null metric must never be rendered as a number', () => {
    expect(INTEGRATION_GUIDE.nullRendering).toMatch(/never 0/i);
    expect(INTEGRATION_GUIDE.keepSeparate.length).toBeGreaterThanOrEqual(3);
  });
});
describe('numeric integrity', () => {
  it('totalPips never becomes a fabricated zero when no pips are valid', () => {
    const m = computePaperPerformanceMetrics([
      trade('a', 25, { pips: undefined }),
      trade('b', 10, { pips: 'abc' }),
    ]);
    expect(m.totalPips).toBeNull();
    expect(m.unavailableReasons.totalPips).toBe(UNAVAILABLE_REASON.NO_VALID_TRADES);
    expect(m.integrity.pipsRecords).toBe(0);
    // The dollar P&L is unaffected — pips and USD are never mixed.
    expect(m.realizedPnl).toBe(35);
  });

  it('pips and dollar P&L are reported separately', () => {
    const m = computePaperPerformanceMetrics([
      trade('a', 25, { pips: 10 }),
      trade('b', -15, { pips: -6 }),
    ]);
    expect(m.totalPips).toBe(4);
    expect(m.realizedPnl).toBe(10);
  });

  it('account equity comes from the account state, not from journal totals', () => {
    const m = computePaperPerformanceMetrics([win('a', 25)], {
      account: { balance: 10000, unrealizedPnL: -120 },
    });
    expect(m.accountEquity).toBe(9880);
    expect(m.realizedPnl).toBe(25);
    expect(m.accountEquity).not.toBe(m.realizedPnl);
  });

  it('an invalid balance or unrealised P&L yields no account equity', () => {
    for (const account of [
      { balance: undefined, unrealizedPnL: 0 },
      { balance: 10000, unrealizedPnL: NaN },
      { balance: Infinity, unrealizedPnL: 0 },
      { balance: 10000, unrealizedPnL: 'abc' },
      null,
    ]) {
      const m = computePaperPerformanceMetrics([win('a', 25)], { account });
      expect(m.accountEquity).toBeNull();
      expect(m.unavailableReasons.accountEquity).toBe(UNAVAILABLE_REASON.NO_ACCOUNT_STATE);
    }
  });

  it('every numerical output is finite', () => {
    const m = computePaperPerformanceMetrics([
      win('a', 25), loss('b', -15), flat('c'),
    ], { account: { balance: 10000, unrealizedPnL: 5 } });
    for (const key of [
      'winRate', 'realizedPnl', 'grossProfit', 'grossLoss', 'profitFactor',
      'averageWin', 'averageLoss', 'expectancy', 'totalPips', 'accountEquity',
      'currentWinStreak', 'longestWinStreak',
    ]) {
      if (m[key] === null) continue;
      expect(Number.isFinite(m[key])).toBe(true);
    }
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { useDemoAccountStore } from '../../store/index.js';
import {
  RESULT,
  classifyResult,
  isBreakEvenResult,
  isLossResult,
  isWinResult,
  resultCounterDelta,
} from '../paperAccounting.js';
import { SAFETY_CODES } from '../paperPositionSafety.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');
const chartSource = readFileSync(
  path.join(repoRoot, 'src', 'components', 'common', 'TrendLensUltraChart.jsx'),
  'utf8'
);
const storeSource = readFileSync(path.join(repoRoot, 'src', 'store', 'index.js'), 'utf8');

const baseAccount = () => ({
  initialBalance: 10000,
  balance: 10000,
  equity: 10000,
  realizedPnL: 0,
  unrealizedPnL: 0,
  winCount: 0,
  lossCount: 0,
  breakevenCount: 0,
  trades: [],
  simulatedTrades: [],
  openPosition: null,
  isAutoBotActive: false,
});

const resetAccount = () => {
  try { localStorage.removeItem('tl_demo_account'); } catch {}
  useDemoAccountStore.setState({ account: baseAccount() });
};

const account = () => useDemoAccountStore.getState().account;
const store = () => useDemoAccountStore.getState();

/**
 * Open a position. `entry`/`exit` are chosen so the booked P&L is exact:
 * margin 200 x leverage 1 => pnlDollars = (exit-entry)/entry * 200.
 */
const openAt = (entry, asset = 'XAU/USD') =>
  store().openDemoTrade({
    asset,
    buy: true,
    entry,
    sl: entry * 0.99,
    tp1: entry * 1.01,
    score: 70,
    reason: 'test',
    lotSize: 1,
    marginUsdt: 200,
    leverage: 1,
    pipMultiplier: 10,
  });

beforeEach(() => resetAccount());

// ── Classification ─────────────────────────────────────────────────────────

describe('TEST 1 — positive P&L produces WIN', () => {
  it('classifies and books a win', () => {
    expect(classifyResult(12.34)).toBe(RESULT.WIN);
    expect(isWinResult(RESULT.WIN)).toBe(true);

    openAt(1000);
    const closed = store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    expect(closed.ok).toBe(true);
    expect(closed.trade.result).toBe('WIN');
    expect(account().winCount).toBe(1);
    expect(account().lossCount).toBe(0);
    expect(account().breakevenCount).toBe(0);
    expect(account().realizedPnL).toBe(2);
  });
});

describe('TEST 2 — negative P&L produces LOSS', () => {
  it('classifies and books a loss', () => {
    expect(classifyResult(-3.5)).toBe(RESULT.LOSS);
    expect(isLossResult(RESULT.LOSS)).toBe(true);

    openAt(1000);
    const closed = store().closeDemoTrade(990, 'SL', 10, { asset: 'XAU/USD' });
    expect(closed.ok).toBe(true);
    expect(closed.trade.result).toBe('LOSS');
    expect(account().winCount).toBe(0);
    expect(account().lossCount).toBe(1);
    expect(account().breakevenCount).toBe(0);
    expect(account().realizedPnL).toBe(-2);
  });
});

describe('TEST 3 — zero P&L produces BREAKEVEN', () => {
  it('classifies and books a break-even', () => {
    expect(classifyResult(0)).toBe(RESULT.BREAKEVEN);
    expect(isBreakEvenResult(RESULT.BREAKEVEN)).toBe(true);

    openAt(1000);
    const closed = store().closeDemoTrade(1000, 'exit at entry', 10, { asset: 'XAU/USD' });
    expect(closed.ok).toBe(true);
    expect(closed.trade.result).toBe('BREAKEVEN');
    expect(closed.trade.pnlDollars).toBe(0);
  });
});

describe('TEST 4 — a break-even increments neither counter', () => {
  it('keeps win, loss and realized P&L untouched', () => {
    openAt(1000);
    store().closeDemoTrade(1000, 'exit at entry', 10, { asset: 'XAU/USD' });

    expect(account().winCount).toBe(0);
    expect(account().lossCount).toBe(0);
    expect(account().breakevenCount).toBe(1);
    expect(account().realizedPnL).toBe(0);
    expect(account().balance).toBe(10000);
    expect(account().equity).toBe(10000);
  });

  it('the counter delta helper agrees', () => {
    expect(resultCounterDelta(RESULT.BREAKEVEN)).toEqual({ wins: 0, losses: 0, breakEvens: 1 });
    expect(resultCounterDelta(RESULT.WIN)).toEqual({ wins: 1, losses: 0, breakEvens: 0 });
    expect(resultCounterDelta(RESULT.LOSS)).toEqual({ wins: 0, losses: 1, breakEvens: 0 });
  });

  it('a break-even is never reported as a win', () => {
    openAt(1000);
    const closed = store().closeDemoTrade(1000, 'flat', 10, { asset: 'XAU/USD' });
    expect(closed.trade.result).not.toBe('WIN');
    expect(closed.trade.result).not.toBe('LOSS');
  });
});

// ── Single-booking invariants ──────────────────────────────────────────────

describe('TEST 5 — closing a position exactly once produces one realised P&L event', () => {
  it('books the P&L once and creates exactly one journal record', () => {
    openAt(1000);
    const closed = store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    expect(closed.ok).toBe(true);

    expect(account().trades.length).toBe(1);
    expect(account().realizedPnL).toBe(2);
    expect(account().balance).toBe(10002);
    expect(account().winCount).toBe(1);
  });
});

describe('TEST 6 — duplicate close requests do not duplicate journal entries', () => {
  it('a second close is refused and changes nothing', () => {
    openAt(1000);
    store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    const afterFirst = JSON.parse(JSON.stringify(account()));

    const second = store().closeDemoTrade(1010, 'TP again', 10, { asset: 'XAU/USD' });
    expect(second.ok).toBe(false);
    expect(second.code).toBe(SAFETY_CODES.NO_POSITION);

    expect(account().trades.length).toBe(afterFirst.trades.length);
    expect(account().realizedPnL).toBe(afterFirst.realizedPnL);
    expect(account().balance).toBe(afterFirst.balance);
    expect(account().winCount).toBe(afterFirst.winCount);
    expect(account().lossCount).toBe(afterFirst.lossCount);
  });

  it('a rejected close cannot change the balance or the counters', () => {
    openAt(1000);
    const rejected = store().closeDemoTrade(1010, 'wrong asset', 10, { asset: 'BTC/USD' });
    expect(rejected.ok).toBe(false);
    expect(rejected.code).toBe(SAFETY_CODES.ASSET_MISMATCH);
    expect(account().balance).toBe(10000);
    expect(account().winCount).toBe(0);
    expect(account().lossCount).toBe(0);
    expect(account().trades.length).toBe(0);
  });

  it('the journal record belongs to the position that was closed', () => {
    const opened = openAt(1000);
    const positionId = opened.position.id;
    const closed = store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    expect(closed.trade.id).toBe(positionId);
    expect(account().trades[0].id).toBe(positionId);
  });
});

// ── Order id attribution ───────────────────────────────────────────────────

describe('TEST 7 — an order id is attached only to the matching position', () => {
  it('attaches the id to the open position', () => {
    const opened = openAt(1000);
    const result = store().updateOpenTradeOrderId('order-abc', opened.position.id);
    expect(result.ok).toBe(true);
    expect(account().openPosition.exchangeOrderId).toBe('order-abc');
  });

  it('the journal inherits the id when its own position is closed', () => {
    const opened = openAt(1000);
    store().updateOpenTradeOrderId('order-abc', opened.position.id);
    const closed = store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    expect(closed.trade.exchangeOrderId).toBe('order-abc');
    expect(account().trades[0].exchangeOrderId).toBe('order-abc');
  });
});

describe('TEST 8 — an order id for position A cannot be attached to position B', () => {
  it('refuses a mismatched position id and changes nothing', () => {
    const openedA = openAt(1000);
    const positionIdA = openedA.position.id;

    // Close A and open B.
    store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    const openedB = openAt(2000, 'BTC/USD');

    const result = store().updateOpenTradeOrderId('order-for-A', positionIdA);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(SAFETY_CODES.POSITION_MISMATCH);
    expect(account().openPosition.id).toBe(openedB.position.id);
    expect(account().openPosition.exchangeOrderId).toBeNull();
  });
});

describe('TEST 9 — a late acknowledgement cannot corrupt an unrelated journal entry', () => {
  it('refuses the acknowledgement once the position has closed', () => {
    const opened = openAt(1000);
    const positionId = opened.position.id;
    store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    const tradesBefore = JSON.parse(JSON.stringify(account().trades));

    const result = store().updateOpenTradeOrderId('late-order', positionId);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('POSITION_NOT_OPEN');

    expect(account().trades).toEqual(tradesBefore);
    expect(account().trades[0].exchangeOrderId).toBeNull();
    expect(account().balance).toBe(10002);
  });

  it('never writes an order id into a journal row directly', () => {
    // The store's order-id updater must not touch the journal at all.
    const start = storeSource.indexOf('updateOpenTradeOrderId: (orderId, positionId) => {');
    const end = storeSource.indexOf('addSingleExecutedTrade', start);
    const block = storeSource.slice(start, end);
    expect(block).not.toContain('trades:');
    expect(block).not.toContain('nextTrades');
  });
});

describe('TEST 10 — missing position identity refuses order-id attribution', () => {
  it('refuses when no position id is supplied', () => {
    openAt(1000);
    const result = store().updateOpenTradeOrderId('order-xyz');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('POSITION_ID_REQUIRED');
    expect(account().openPosition.exchangeOrderId).toBeNull();
  });

  it('refuses an empty order id', () => {
    const opened = openAt(1000);
    const result = store().updateOpenTradeOrderId('', opened.position.id);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('ORDER_ID_MISSING');
    expect(account().openPosition.exchangeOrderId).toBeNull();
  });

  it('the chart supplies the position identity with the acknowledgement', () => {
    expect(chartSource).toContain('updateOpenTradeOrderId(res.orderId, opened.position.id)');
  });
});

describe('TEST 11 — existing stored journal rows remain readable', () => {
  it('a legacy account without breakevenCount loads and still works', () => {
    const legacy = {
      initialBalance: 10000,
      balance: 10100,
      equity: 10100,
      realizedPnL: 100,
      unrealizedPnL: 0,
      winCount: 1,
      lossCount: 0,
      trades: [
        { id: 'legacy_1', asset: 'XAU/USD', type: 'BUY', entryPrice: 1000, exitPrice: 1010, pips: 10, pnlDollars: 100, result: 'WIN', time: '10:00' },
      ],
      openPosition: null,
    };
    localStorage.setItem('tl_demo_account', JSON.stringify(legacy));

    // Load exactly the legacy shape: it has no breakevenCount field at all.
    useDemoAccountStore.setState({ account: legacy });
    expect(account().trades[0].result).toBe('WIN');
    expect(account().breakevenCount).toBeUndefined();

    // A new close still books correctly on a legacy account.
    openAt(1000);
    store().closeDemoTrade(1010, 'TP', 10, { asset: 'XAU/USD' });
    expect(account().breakevenCount).toBe(0);
    expect(account().winCount).toBe(2);
    expect(account().trades.length).toBe(2);
  });
});

describe('TEST 12 — S03-A still rejects force:true overwrites', () => {
  it('refuses a forced second open', () => {
    openAt(1000);
    const forced = store().openDemoTrade({ asset: 'BTC/USD', entry: 1, force: true });
    expect(forced.ok).toBe(false);
    expect(forced.code).toBe(SAFETY_CODES.POSITION_EXISTS);
    expect(account().openPosition.entryPrice).toBe(1000);
  });
});

describe('TEST 13 — S03-A still rejects cross-asset and cross-position closes', () => {
  it('rejects a cross-asset close', () => {
    openAt(1000);
    const result = store().closeDemoTrade(1010, 'cross', 10, { asset: 'BTC/USD' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(SAFETY_CODES.ASSET_MISMATCH);
    expect(account().openPosition).toBeTruthy();
  });

  it('rejects a close that names another position', () => {
    const opened = openAt(1000);
    const result = store().closeDemoTrade(1010, 'cross', 10, {
      asset: 'XAU/USD',
      positionId: 'pos_someone_else',
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(SAFETY_CODES.POSITION_MISMATCH);
    expect(account().openPosition).toBeTruthy();
    expect(opened.position.id).toBeTruthy();
  });
});

describe('TEST 14 — S01 and S02 safeguards remain intact', () => {
  it('the fabricated signal removal is preserved', () => {
    expect(chartSource).not.toContain('defaultBullPillars');
    expect(chartSource).not.toContain('(6/6 Confirmed)');
    expect(chartSource).toContain('buildChartMarketState');
  });

  it('the real candle handling is preserved', () => {
    expect(chartSource).not.toMatch(/s\.bars\.push\(/);
    expect(chartSource).toContain('applyCandleUpdate');
    expect(chartSource).toContain('CANDLE_OUTCOME.IGNORED');
  });

  it('the position identity guards are preserved', () => {
    expect(chartSource).toContain('openPos.id === s.activeTrade.positionId');
  });
});

describe('TEST 15 — no authenticated exchange order is executed', () => {
  it('the order-id path never calls the proxy itself', () => {
    const start = storeSource.indexOf('updateOpenTradeOrderId: (orderId, positionId) => {');
    const end = storeSource.indexOf('addSingleExecutedTrade', start);
    const block = storeSource.slice(start, end);
    expect(block).not.toContain('fetch(');
    expect(block).not.toContain('placeBybit');
  });

  it('the chart still routes exchange orders through the explicit permission gate', () => {
    expect(chartSource).toContain('requireExchangeAction');
    expect(chartSource).toContain('placeBybitDemoOrder');
  });

  it('the server proxy still gates every mutating route', () => {
    const appSource = readFileSync(path.join(repoRoot, 'server', 'app.js'), 'utf8');
    expect(appSource).toContain('assertMutationAllowed');
    expect(appSource).toContain('DEMO_ORDER');
  });
});

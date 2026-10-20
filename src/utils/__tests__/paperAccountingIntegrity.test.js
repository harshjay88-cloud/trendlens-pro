import { describe, it, expect, beforeEach } from 'vitest';
import { useDemoAccountStore } from '../../store/index.js';
import {
  PNL_REJECTION,
  RESULT,
  classifyResult,
  normalizePnl,
  resultCounterDelta,
} from '../paperAccounting.js';

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

beforeEach(() => resetAccount());

// ── The validator ──────────────────────────────────────────────────────────

describe('normalizePnl rejects invalid financial input explicitly', () => {
  it('accepts finite numbers', () => {
    expect(normalizePnl(0)).toEqual({ ok: true, value: 0, reason: null });
    expect(normalizePnl(12.34)).toEqual({ ok: true, value: 12.34, reason: null });
    expect(normalizePnl(-5)).toEqual({ ok: true, value: -5, reason: null });
  });

  it('accepts a numeric string for legacy compatibility, validated explicitly', () => {
    expect(normalizePnl('12.34')).toEqual({ ok: true, value: 12.34, reason: null });
    expect(normalizePnl('  -7 ')).toEqual({ ok: true, value: -7, reason: null });
    expect(normalizePnl('0')).toEqual({ ok: true, value: 0, reason: null });
  });

  it('rejects undefined, null, booleans, objects and arrays', () => {
    for (const value of [undefined, null, true, false, {}, [], () => {}]) {
      const result = normalizePnl(value);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe(PNL_REJECTION.MISSING);
    }
  });

  it('rejects an empty string and a malformed string', () => {
    expect(normalizePnl('')).toEqual({ ok: false, value: NaN, reason: PNL_REJECTION.EMPTY });
    expect(normalizePnl('   ')).toEqual({ ok: false, value: NaN, reason: PNL_REJECTION.EMPTY });
    expect(normalizePnl('abc')).toEqual({ ok: false, value: NaN, reason: PNL_REJECTION.NOT_A_NUMBER });
    expect(normalizePnl('12,34')).toEqual({ ok: false, value: NaN, reason: PNL_REJECTION.NOT_A_NUMBER });
  });

  it('rejects NaN and both infinities', () => {
    expect(normalizePnl(NaN).reason).toBe(PNL_REJECTION.NOT_FINITE);
    expect(normalizePnl(Infinity).reason).toBe(PNL_REJECTION.NOT_FINITE);
    expect(normalizePnl(-Infinity).reason).toBe(PNL_REJECTION.NOT_FINITE);
  });
});

describe('classifyResult never fabricates a classification', () => {
  it('classifies finite values', () => {
    expect(classifyResult(1)).toBe(RESULT.WIN);
    expect(classifyResult(-1)).toBe(RESULT.LOSS);
    expect(classifyResult(0)).toBe(RESULT.BREAKEVEN);
  });

  it('returns null for an unclassifiable value instead of assuming zero', () => {
    for (const value of [NaN, Infinity, -Infinity, undefined, null, 'abc', {}]) {
      expect(classifyResult(value)).toBeNull();
    }
  });

  it('an unclassifiable result increments no counter', () => {
    expect(resultCounterDelta(null)).toEqual({ wins: 0, losses: 0, breakEvens: 0 });
  });
});

// ── The store paths ────────────────────────────────────────────────────────

const bookTrade = (pnlDollars, extra = {}) =>
  store().addSingleExecutedTrade({
    id: 'trade_' + Math.random().toString(36).slice(2, 8),
    asset: 'XAU/USD',
    type: 'BUY',
    entryPrice: 1000,
    exitPrice: 1000,
    pips: 0,
    pnlDollars,
    result: 'WIN',
    time: '10:00',
    ...extra,
  });

describe('a valid P&L is booked exactly as classified', () => {
  it('books a positive P&L as a win', () => {
    const result = bookTrade(25);
    expect(result.ok).toBe(true);
    expect(account().winCount).toBe(1);
    expect(account().lossCount).toBe(0);
    expect(account().breakevenCount).toBe(0);
    expect(account().realizedPnL).toBe(25);
    expect(account().balance).toBe(10025);
    expect(account().trades[0].result).toBe('WIN');
  });

  it('books a negative P&L as a loss', () => {
    const result = bookTrade(-25);
    expect(result.ok).toBe(true);
    expect(account().winCount).toBe(0);
    expect(account().lossCount).toBe(1);
    expect(account().breakevenCount).toBe(0);
    expect(account().realizedPnL).toBe(-25);
    expect(account().balance).toBe(9975);
    expect(account().trades[0].result).toBe('LOSS');
  });

  it('books a zero P&L as a break-even', () => {
    const result = bookTrade(0);
    expect(result.ok).toBe(true);
    expect(account().winCount).toBe(0);
    expect(account().lossCount).toBe(0);
    expect(account().breakevenCount).toBe(1);
    expect(account().realizedPnL).toBe(0);
    expect(account().balance).toBe(10000);
    expect(account().trades[0].result).toBe('BREAKEVEN');
  });

  it('books a numeric string P&L for legacy compatibility', () => {
    const result = bookTrade('12.5');
    expect(result.ok).toBe(true);
    expect(account().winCount).toBe(1);
    expect(account().realizedPnL).toBe(12.5);
  });
});

describe('an invalid P&L is rejected and never becomes a break-even', () => {
  const invalidValues = [undefined, null, NaN, Infinity, -Infinity, '', '   ', 'abc', true, {}, []];

  it('refuses every invalid value without touching the account', () => {
    for (const value of invalidValues) {
      resetAccount();
      const before = JSON.parse(JSON.stringify(account()));

      const result = bookTrade(value);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('INVALID_PNL');

      const after = account();
      expect(after.balance).toBe(before.balance);
      expect(after.equity).toBe(before.equity);
      expect(after.realizedPnL).toBe(before.realizedPnL);
      expect(after.unrealizedPnL).toBe(before.unrealizedPnL);
      expect(after.trades.length).toBe(before.trades.length);
      expect(after.winCount).toBe(before.winCount);
      expect(after.lossCount).toBe(before.lossCount);
      expect(after.breakevenCount).toBe(before.breakevenCount);
    }
  });

  it('never books an infinite balance', () => {
    for (const value of [Infinity, -Infinity]) {
      resetAccount();
      bookTrade(value);
      expect(Number.isFinite(account().balance)).toBe(true);
      expect(Number.isFinite(account().equity)).toBe(true);
      expect(Number.isFinite(account().realizedPnL)).toBe(true);
    }
  });

  it('never books a NaN balance', () => {
    resetAccount();
    bookTrade(NaN);
    expect(Number.isFinite(account().balance)).toBe(true);
    expect(Number.isFinite(account().realizedPnL)).toBe(true);
  });
});

describe('duplicate executed trades are rejected', () => {
  it('refuses a trade whose id is already in the journal', () => {
    const trade = {
      id: 'dup_1',
      asset: 'XAU/USD',
      type: 'BUY',
      entryPrice: 1000,
      exitPrice: 1010,
      pips: 10,
      pnlDollars: 20,
      result: 'WIN',
      time: '10:00',
    };

    const first = store().addSingleExecutedTrade(trade);
    expect(first.ok).toBe(true);
    expect(account().trades.length).toBe(1);
    expect(account().realizedPnL).toBe(20);

    const second = store().addSingleExecutedTrade(trade);
    expect(second.ok).toBe(false);
    expect(second.code).toBe('TRADE_ALREADY_JOURNALLED');
    expect(account().trades.length).toBe(1);
    expect(account().realizedPnL).toBe(20);
    expect(account().winCount).toBe(1);
  });
});

describe('a position with an invalid entry price can never be opened', () => {
  it('refuses a non-numeric or non-positive entry', () => {
    for (const entry of [undefined, null, NaN, 0, -1, 'abc']) {
      resetAccount();
      const result = store().openDemoTrade({
        asset: 'XAU/USD',
        buy: true,
        entry,
        sl: 1,
        tp1: 2,
        marginUsdt: 200,
        leverage: 20,
        pipMultiplier: 10,
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe('INVALID_ENTRY_PRICE');
      expect(account().openPosition).toBeNull();
      expect(account().balance).toBe(10000);
    }
  });
});

describe('a broken legacy position cannot corrupt the live P&L', () => {
  it('does not write a NaN unrealised P&L into the account', () => {
    // A position persisted before the entry-price guard existed.
    useDemoAccountStore.setState({
      account: {
        ...baseAccount(),
        openPosition: {
          id: 'legacy_broken',
          asset: 'XAU/USD',
          type: 'BUY',
          entryPrice: undefined,
          sl: 1,
          tp: 2,
          timestamp: Date.now(),
          marginUsdt: 200,
          leverage: 20,
          pipMultiplier: 10,
        },
      },
    });

    store().updateTickPnL(1010, 10, 'XAU/USD');
    expect(Number.isFinite(account().unrealizedPnL)).toBe(true);
    expect(Number.isFinite(account().equity)).toBe(true);
  });
});

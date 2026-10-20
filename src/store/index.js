import { create } from 'zustand';
import { MOCK_SIGNALS } from '../utils/mockData.js';
import {
  SAFETY_CODES,
  canClosePosition,
  isSameAsset,
  isValidExitPrice,
} from '../utils/paperPositionSafety.js';
import { classifyResult, normalizePnl, resultCounterDelta } from '../utils/paperAccounting.js';

// ── Theme Store ──────────────────────────────────────────
const THEMES = [
  // Black & White Hybrid Pro (the flagship design system)
  'mono-dark',
  'mono-light',
  // Legacy themes - kept so an existing stored preference always resolves
  'tl-dark',
  'tl-black-red',
  'tl-navy',
  'tl-matrix',
  'tl-amber',
  'tl-light',
];
const DEFAULT_THEME = 'mono-dark';
const getStoredTheme = () => {
  try {
    const saved = localStorage.getItem('tl_theme');
    // An unknown stored value falls back to the default instead of leaving
    // the document with a theme that has no tokens.
    return saved && THEMES.includes(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const useThemeStore = create((set) => ({
  theme: getStoredTheme(),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('tl_theme', theme); } catch {}
    set({ theme });
  },
  themes: THEMES,
}));

// ── Auth Store ───────────────────────────────────────────
const getStoredUser = () => {
  try {
    const token = localStorage.getItem('tl.sessionToken');
    const user = localStorage.getItem('tl.user');
    if (token && user) return JSON.parse(user);
  } catch {}
  return null;
};

export const useAuthStore = create((set) => ({
  user: getStoredUser(),
  isAuthenticated: !!getStoredUser(),
  isLoading: false,

  /**
   * DEMO-ONLY AUTHENTICATION.
   * There is no identity provider in this build: any email/password pair
   * creates a local session that is stored in the browser. It is NOT a secure
   * login and it grants no real permissions.
   */
  login: async (email, password) => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 800));
    const user = {
      id: 'u_001',
      username: email.split('@')[0] || 'Trader',
      email,
      avatar: '🎯',
      plan: 'demo',
      isAdmin: false,
      isDemoAuth: true,
      // No performance figures are asserted until they are measured from real
      // trades in the journal.
      stats: { winRate: null, totalSignals: 0, pips: 0, streak: 0, measured: false },
    };
    const token = 'demo_session_' + Date.now();
    try {
      localStorage.setItem('tl.sessionToken', token);
      localStorage.setItem('tl.user', JSON.stringify(user));
    } catch {}
    set({ user, isAuthenticated: true, isLoading: false });
    return { success: true };
  },

  logout: () => {
    try {
      localStorage.removeItem('tl.sessionToken');
      localStorage.removeItem('tl.user');
    } catch {}
    set({ user: null, isAuthenticated: false });
  },
}));

// ── Signal Store ─────────────────────────────────────────
export const useSignalStore = create((set, get) => ({
  signals: MOCK_SIGNALS,
  filter: { asset: 'All', direction: 'All', status: 'All', timeframe: 'All' },

  setFilter: (key, value) => set(s => ({ filter: { ...s.filter, [key]: value } })),

  getFiltered: () => {
    const { signals, filter } = get();
    return signals.filter(s => {
      if (filter.asset !== 'All' && s.asset !== filter.asset) return false;
      if (filter.direction !== 'All' && s.direction !== filter.direction) return false;
      if (filter.status !== 'All' && s.status !== filter.status) return false;
      if (filter.timeframe !== 'All' && s.timeframe !== filter.timeframe) return false;
      return true;
    });
  },

  addSignal: (newSignal) => {
    const created = {
      id: 'sig_' + Date.now(),
      createdAt: new Date(),
      status: 'active',
      result: null,
      pips: null,
      // No accuracy figure is asserted. `confluence` is the measured strength
      // of the rules that actually fired, not a calibrated probability.
      ...newSignal,
    };
    set(state => ({ signals: [created, ...state.signals] }));
    return created;
  },

  updateSignal: (id, updates) => {
    set(state => ({
      signals: state.signals.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  },

  deleteSignal: (id) => {
    set(state => ({
      signals: state.signals.filter(s => s.id !== id),
    }));
  },

  resetSignals: () => {
    set({ signals: MOCK_SIGNALS });
  },
}));

// ── Demo / Paper Trading Account Store ────────────────────
let positionCounter = 0;

const getStoredDemoAccount = () => {
  try {
    const data = localStorage.getItem('tl_demo_account');
    if (data) return JSON.parse(data);
  } catch {}
  return {
    initialBalance: 10000,
    balance: 10000,
    equity: 10000,
    realizedPnL: 0,
    unrealizedPnL: 0,
    winCount: 0,
    lossCount: 0,
    // Break-even closes. Additive: accounts stored before this field existed
    // simply report zero.
    breakevenCount: 0,
    // The journal starts empty. No historical trades are fabricated.
    trades: [],
    // Scenario trades produced by the simulator. They are never booked into
    // balance, equity, realizedPnL or the win/loss counters.
    simulatedTrades: [],
    openPosition: null,
    isAutoBotActive: false
  };
};

export const useDemoAccountStore = create((set, get) => ({
  account: getStoredDemoAccount(),

  // Toggle Live Auto Trading Bot
  toggleAutoBot: (enabled) => {
    set(state => {
      const nextAcc = { ...state.account, isAutoBotActive: enabled !== undefined ? enabled : !state.account.isAutoBotActive };
      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      return { account: nextAcc };
    });
  },

  /**
   * Open a paper position.
   *
   * SAFETY: an open position is NEVER overwritten. The `force` flag that
   * previously bypassed this guard has been removed — a request that arrives
   * while a position is open is rejected and nothing about the account
   * changes (balance, equity, openPosition, unrealizedPnL, journal and the
   * win/loss counters are all left untouched).
   *
   * @returns {{ ok: boolean, code: string, message: string, position: object|null }}
   */
  openDemoTrade: (tradeData) => {
    let outcome = null;

    set(state => {
      const currentAcc = state.account;

      if (currentAcc.openPosition) {
        outcome = {
          ok: false,
          code: SAFETY_CODES.POSITION_EXISTS,
          message: `A ${currentAcc.openPosition.asset} paper position is already open. Close it before opening another one.`,
          position: currentAcc.openPosition,
        };
        return state; // no change at all
      }

      // The entry price must be a real number. A position with a broken
      // entry price would produce a broken P&L on close, so it is refused
      // here rather than corrupting the account later.
      const entry = normalizePnl(tradeData.entry);
      if (!entry.ok || entry.value <= 0) {
        outcome = {
          ok: false,
          code: 'INVALID_ENTRY_PRICE',
          message: 'The entry price is not a valid positive number, so no position was opened.',
          position: null,
        };
        return state;
      }

      const pos = {
        // A stable, unique identity for this position. A bracket or an action
        // that references a different id is refused.
        id: 'pos_' + Date.now() + '_' + (++positionCounter),
        asset: tradeData.asset || 'XAU/USD',
        type: tradeData.direction || (tradeData.buy ? 'BUY' : 'SELL'),
        lotSize: tradeData.lotSize || 1.0,
        entryPrice: entry.value,
        sl: tradeData.sl,
        tp: tradeData.tp1,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        // Confluence strength of the rules that fired (0-100, not calibrated).
        confluence: tradeData.score ?? null,
        reason: tradeData.reason || 'No confluence reason recorded',
        currentPips: 0,
        currentPnlDollars: 0,
        maxDrawdownPips: 0,
        maxRunupPips: 0,
        secondsElapsed: 0,
        exchangeOrderId: tradeData.exchangeOrderId || null,
        exchange: tradeData.exchange || null,
        marginUsdt: tradeData.marginUsdt || 200,
        leverage: tradeData.leverage || 20,
        pipMultiplier: tradeData.pipMultiplier || 10
      };

      const nextAcc = {
        ...currentAcc,
        openPosition: pos,
        // A genuinely new position starts with no unrealised P&L.
        unrealizedPnL: 0,
        equity: currentAcc.balance
      };
      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      outcome = { ok: true, code: SAFETY_CODES.OK, message: 'Paper position opened.', position: pos };
      return { account: nextAcc };
    });

    return outcome;
  },

  // Update unrealized PnL and live drawdown / runup based on live tick price
  updateTickPnL: (currentPrice, pipMultiplier = 10, forAsset = null) => {
    const { account } = get();
    if (!account.openPosition) return;
    const pos = account.openPosition;
    // Guard against cross-asset price pollution (e.g. an XAU/USD tick price
    // hitting a BTC/DOGE bot trade). The instrument identity must match.
    if (forAsset && pos.asset && !isSameAsset(pos.asset, forAsset)) return;
    // A missing or malformed price never produces a P&L update.
    if (!isValidExitPrice(currentPrice)) return;

    const effPipMultiplier = pos.pipMultiplier || pipMultiplier || 10;
    const isBuy = pos.type === 'BUY';
    const diff = isBuy ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    const pips = +(diff * effPipMultiplier).toFixed(1);
    
    // Leverage-aware PnL calculation
    let pnlDollars;
    if (pos.marginUsdt && pos.leverage && pos.entryPrice > 0) {
      const pctMove = diff / pos.entryPrice;
      pnlDollars = +(pctMove * pos.marginUsdt * pos.leverage).toFixed(2);
    } else {
      pnlDollars = +(pips * 10 * pos.lotSize).toFixed(2);
    }

    // A P&L that cannot be calculated must never be written into the account:
    // a NaN would corrupt balance, equity and realised P&L.
    if (!Number.isFinite(pnlDollars)) return;

    const prevDD = pos.maxDrawdownPips || 0;
    const prevRunup = pos.maxRunupPips || 0;
    const newDD = pips < 0 ? Math.min(prevDD, pips) : prevDD;
    const newRunup = pips > 0 ? Math.max(prevRunup, pips) : prevRunup;
    const elapsedSecs = Math.max(1, Math.floor((Date.now() - (pos.timestamp || Date.now())) / 1000));

    set(state => ({
      account: {
        ...state.account,
        unrealizedPnL: pnlDollars,
        equity: +(state.account.balance + pnlDollars).toFixed(2),
        openPosition: {
          ...state.account.openPosition,
          currentPips: pips,
          currentPnlDollars: pnlDollars,
          secondsElapsed: elapsedSecs,
          maxDrawdownPips: newDD,
          maxRunupPips: newRunup
        }
      }
    }));
  },

  /**
   * Close the open paper position.
   *
   * SAFETY: the exit price must belong to the position's own instrument.
   * `options.asset` declares which instrument the price belongs to. When it
   * does not match, when it is missing, or when the price is not a usable
   * market price, the position is left OPEN and the refusal is reported.
   *
   * @returns {{ ok: boolean, code: string, message: string, trade: object|null }}
   */
  closeDemoTrade: (exitPrice, reason = 'TP1_HIT', pipMultiplier = null, options = {}) => {
    let outcome = null;

    set(state => {
      const currentAcc = state.account;
      const pos = currentAcc.openPosition;

      const verdict = canClosePosition({
        position: pos,
        exitPrice,
        exitAsset: options.asset,
        positionId: options.positionId,
      });

      if (!verdict.allowed) {
        outcome = { ok: false, code: verdict.code, message: verdict.message, trade: null };
        return state; // the position is left exactly as it was
      }

      const effPipMultiplier = pipMultiplier || pos.pipMultiplier || 10;
      const isBuy = pos.type === 'BUY';
      const diff = isBuy ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
      const pips = +(diff * effPipMultiplier).toFixed(1);
      let pnlDollars;
      if (pos.marginUsdt && pos.leverage && pos.entryPrice > 0) {
        const pctMove = diff / pos.entryPrice;
        pnlDollars = +(pctMove * pos.marginUsdt * pos.leverage).toFixed(2);
      } else {
        pnlDollars = +(pips * 10 * pos.lotSize).toFixed(2);
      }
      // Classification uses the same rounded value that is booked into the
      // balance. A booked P&L of exactly 0.00 is a break-even: it is neither a
      // win nor a loss, and it increments neither counter.
      // A P&L that cannot be classified (a broken legacy entry price, for
      // example) is refused: the position stays open and nothing is booked.
      const result = classifyResult(pnlDollars);
      if (!result) {
        outcome = {
          ok: false,
          code: 'INVALID_PNL',
          message: 'The resulting P&L could not be calculated, so the position was left open and nothing was booked.',
          trade: null,
        };
        return state;
      }
      const delta = resultCounterDelta(result);

      const elapsedSecs = Math.max(1, Math.floor((Date.now() - (pos.timestamp || Date.now())) / 1000));
      const mins = Math.floor(elapsedSecs / 60);
      const secs = elapsedSecs % 60;
      const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      const closedTrade = {
        id: pos.id,
        asset: pos.asset,
        type: pos.type,
        lotSize: pos.lotSize,
        entryPrice: pos.entryPrice,
        exitPrice: exitPrice,
        tp: pos.tp,
        sl: pos.sl,
        pips,
        pnlDollars,
        result,
        reason,
        time: pos.time,
        closeTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: durationStr,
        // Only report excursion figures that were actually observed while the
        // position was open. Never invent a drawdown or a run-up.
        maxDrawdownPips: pos.maxDrawdownPips ?? 0,
        maxRunupPips: pos.maxRunupPips ?? 0,
        confluence: pos.confluence ?? null,
        exchangeOrderId: pos.exchangeOrderId || null,
        exchange: pos.exchange || null
      };

      const newBalance = +(currentAcc.balance + pnlDollars).toFixed(2);
      const nextAcc = {
        ...currentAcc,
        balance: newBalance,
        equity: newBalance,
        realizedPnL: +(currentAcc.realizedPnL + pnlDollars).toFixed(2),
        unrealizedPnL: 0,
        winCount: currentAcc.winCount + delta.wins,
        lossCount: currentAcc.lossCount + delta.losses,
        breakevenCount: (currentAcc.breakevenCount || 0) + delta.breakEvens,
        trades: [closedTrade, ...currentAcc.trades].slice(0, 50),
        openPosition: null
      };

      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      outcome = { ok: true, code: SAFETY_CODES.OK, message: 'Paper position closed.', trade: closedTrade };
      return { account: nextAcc };
    });

    return outcome;
  },

  /**
   * Attach an exchange order id to the paper position it belongs to.
   *
   * SAFETY:
   *  - a stable `positionId` is REQUIRED; without it nothing is changed;
   *  - the id is only written to the open position whose id matches, so an
   *    acknowledgement for position A can never touch position B;
   *  - the journal is never written here. A journal row inherits the order id
   *    when its own position is closed, so a late acknowledgement can never
   *    corrupt an unrelated trade;
   *  - an acknowledgement that arrives after the position has closed is
   *    refused and reported;
   *  - no order id is ever generated here.
   *
   * @returns {{ ok: boolean, code: string, message: string }}
   */
  updateOpenTradeOrderId: (orderId, positionId) => {
    let outcome = null;

    set(state => {
      const currentAcc = state.account;
      const pos = currentAcc.openPosition;

      if (!orderId) {
        outcome = {
          ok: false,
          code: 'ORDER_ID_MISSING',
          message: 'No order id was supplied, so nothing was attached.',
        };
        return state;
      }

      if (!positionId) {
        outcome = {
          ok: false,
          code: 'POSITION_ID_REQUIRED',
          message: 'An order acknowledgement must name the position it belongs to.',
        };
        return state;
      }

      if (!pos) {
        outcome = {
          ok: false,
          code: 'POSITION_NOT_OPEN',
          message: 'The position this order belongs to is no longer open. The acknowledgement was not attached to any trade.',
        };
        return state;
      }

      if (pos.id !== positionId) {
        outcome = {
          ok: false,
          code: SAFETY_CODES.POSITION_MISMATCH,
          message: `This order belongs to position ${positionId}, but position ${pos.id} is open. Nothing was changed.`,
        };
        return state;
      }

      const nextAcc = {
        ...currentAcc,
        openPosition: { ...pos, exchangeOrderId: orderId },
      };
      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      outcome = {
        ok: true,
        code: SAFETY_CODES.OK,
        message: 'Order id attached to the matching position.',
        positionId: pos.id,
      };
      return { account: nextAcc };
    });

    return outcome;
  },

  /**
   * Add a single executed paper trade.
   *
   * The result is classified from the trade's own recorded P&L so a
   * break-even is never booked as a win. A trade whose id is already in the
   * journal is refused, so the realized P&L can never be booked twice.
   */
  addSingleExecutedTrade: (closedTrade) => {
    let outcome = null;

    set(state => {
      const currentAcc = state.account;

      if (!closedTrade) {
        outcome = { ok: false, code: 'INVALID_TRADE', message: 'No trade was supplied.' };
        return state;
      }

      if (closedTrade.id && currentAcc.trades.some((t) => t.id === closedTrade.id)) {
        outcome = {
          ok: false,
          code: 'TRADE_ALREADY_JOURNALLED',
          message: 'This trade is already in the journal. Its P&L was not booked again.',
        };
        return state;
      }

      const pnl = normalizePnl(closedTrade.pnlDollars);
      if (!pnl.ok) {
        outcome = {
          ok: false,
          code: 'INVALID_PNL',
          message: `The trade's P&L is not a valid finite amount (${pnl.reason}), so it was not booked.`,
          trade: null,
        };
        return state;
      }
      const pnlDollars = pnl.value;
      const result = classifyResult(pnlDollars);
      if (!result) {
        outcome = {
          ok: false,
          code: 'INVALID_PNL',
          message: "The trade's P&L could not be classified, so it was not booked.",
          trade: null,
        };
        return state;
      }
      const delta = resultCounterDelta(result);
      const newBalance = +(currentAcc.balance + pnlDollars).toFixed(2);
      const nextAcc = {
        ...currentAcc,
        balance: newBalance,
        equity: newBalance,
        realizedPnL: +(currentAcc.realizedPnL + pnlDollars).toFixed(2),
        unrealizedPnL: 0,
        winCount: currentAcc.winCount + delta.wins,
        lossCount: currentAcc.lossCount + delta.losses,
        breakevenCount: (currentAcc.breakevenCount || 0) + delta.breakEvens,
        trades: [{ ...closedTrade, result }, ...currentAcc.trades].slice(0, 50),
        openPosition: null
      };
      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      outcome = { ok: true, code: SAFETY_CODES.OK, message: 'Trade booked.', trade: closedTrade };
      return { account: nextAcc };
    });

    return outcome;
  },

  // Reset Demo Account to clean $10,000 state
  resetDemoAccount: () => {
    const fresh = {
      initialBalance: 10000,
      balance: 10000,
      equity: 10000,
      realizedPnL: 0,
      unrealizedPnL: 0,
      winCount: 0,
      lossCount: 0,
      trades: [],
      simulatedTrades: [],
      openPosition: null,
      isAutoBotActive: false
    };
    try { localStorage.setItem('tl_demo_account', JSON.stringify(fresh)); } catch {}
    set({ account: fresh });
  },

  /**
   * Forward simulation is intentionally DISABLED.
   *
   * The previous implementation drew random win/loss outcomes and booked them
   * into the account balance, equity and win/loss counters. That produced
   * fabricated P&L, so it has been removed. A deterministic replay of real
   * candles (a backtest with no look-ahead) is required instead, and that
   * ships with the backtest engine rather than with a random draw.
   */
  runDynamicForwardSimulation: () => ({
    ok: false,
    code: 'BACKTEST_NOT_IMPLEMENTED',
    message:
      'Forward simulation is disabled. Trade outcomes must come from real price movement, not a random draw. Use the backtest engine once it ships.',
  })
}));


import { create } from 'zustand';
import { MOCK_SIGNALS } from '../utils/mockData.js';

// ── Theme Store ──────────────────────────────────────────
const THEMES = ['tl-dark', 'tl-black-red', 'tl-navy', 'tl-matrix', 'tl-amber', 'tl-light'];
const getStoredTheme = () => {
  try { return localStorage.getItem('tl_theme') || 'tl-dark'; } catch { return 'tl-dark'; }
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

  // Open position from real signal with trajectory tracking
  openDemoTrade: (tradeData) => {
    set(state => {
      const currentAcc = state.account;
      if (currentAcc.openPosition && !tradeData.force) return state; // Only 1 active trade at a time unless forced

      const pos = {
        id: 'pos_' + Date.now(),
        asset: tradeData.asset || 'XAU/USD',
        type: tradeData.direction || (tradeData.buy ? 'BUY' : 'SELL'),
        lotSize: tradeData.lotSize || 1.0,
        entryPrice: tradeData.entry,
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
        openPosition: pos
      };
      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      return { account: nextAcc };
    });
  },

  // Update unrealized PnL and live drawdown / runup based on live tick price
  updateTickPnL: (currentPrice, pipMultiplier = 10, forAsset = null) => {
    const { account } = get();
    if (!account.openPosition) return;
    const pos = account.openPosition;
    // Guard against cross-asset price pollution (e.g. XAU/USD tick price hitting a BTC/DOGE bot trade)
    if (forAsset && pos.asset && pos.asset !== forAsset) return;

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

  // Close position (either manually, TP hit, or SL hit) with recorded duration & drawdown
  closeDemoTrade: (exitPrice, reason = 'TP1_HIT', pipMultiplier = null) => {
    set(state => {
      const currentAcc = state.account;
      if (!currentAcc.openPosition) return state;

      const pos = currentAcc.openPosition;
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
      const isWin = pnlDollars >= 0;

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
        result: isWin ? 'WIN' : 'LOSS',
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
        winCount: currentAcc.winCount + (isWin ? 1 : 0),
        lossCount: currentAcc.lossCount + (isWin ? 0 : 1),
        trades: [closedTrade, ...currentAcc.trades].slice(0, 50),
        openPosition: null
      };

      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      return { account: nextAcc };
    });
  },

  // Update orderId on open position and top closed trade when Bybit order response arrives
  updateOpenTradeOrderId: (orderId) => {
    set(state => {
      const currentAcc = state.account;
      let updated = false;
      let nextOpenPos = currentAcc.openPosition;
      if (nextOpenPos) {
        nextOpenPos = { ...nextOpenPos, exchangeOrderId: orderId };
        updated = true;
      }
      let nextTrades = currentAcc.trades;
      if (nextTrades && nextTrades.length > 0) {
        nextTrades = nextTrades.map((tr, idx) => idx === 0 ? { ...tr, exchangeOrderId: orderId } : tr);
        updated = true;
      }
      if (!updated) return state;
      const nextAcc = {
        ...currentAcc,
        openPosition: nextOpenPos,
        trades: nextTrades
      };
      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      return { account: nextAcc };
    });
  },

  // Add single executed trade dynamically
  addSingleExecutedTrade: (closedTrade) => {
    set(state => {
      const currentAcc = state.account;
      const isWin = closedTrade.result === 'WIN';
      const pnlDollars = closedTrade.pnlDollars;
      const newBalance = +(currentAcc.balance + pnlDollars).toFixed(2);
      const nextAcc = {
        ...currentAcc,
        balance: newBalance,
        equity: newBalance,
        realizedPnL: +(currentAcc.realizedPnL + pnlDollars).toFixed(2),
        unrealizedPnL: 0,
        winCount: currentAcc.winCount + (isWin ? 1 : 0),
        lossCount: currentAcc.lossCount + (isWin ? 0 : 1),
        trades: [closedTrade, ...currentAcc.trades].slice(0, 50),
        openPosition: null
      };
      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      return { account: nextAcc };
    });
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


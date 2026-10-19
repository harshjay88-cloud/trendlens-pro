import { create } from 'zustand';
import { MOCK_SIGNALS } from '../utils/mockData.js';

// ── Theme Store ──────────────────────────────────────────
const THEMES = ['tl-dark','tl-navy','tl-matrix','tl-amber','tl-light'];
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

  login: async (email, password) => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 800));
    const user = {
      id: 'u_001',
      username: email.split('@')[0] || 'Trader',
      email,
      avatar: '🎯',
      plan: 'pro',
      isAdmin: true,
      stats: { winRate: 88.4, totalSignals: 124, pips: 2341, streak: 5 },
    };
    const token = 'mock_jwt_' + Date.now();
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
      accuracy: Math.floor(Math.random() * 8) + 90,
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
    winCount: 8,
    lossCount: 2,
    trades: [
      { id: 't_1', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2638.50, exitPrice: 2650.00, pips: +115.0, pnlDollars: 1150.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '18:14', closeTime: '18:32', conf: 96 },
      { id: 't_2', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2641.20, exitPrice: 2652.50, pips: +113.0, pnlDollars: 1130.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '18:45', closeTime: '19:02', conf: 94 },
      { id: 't_3', asset: 'XAU/USD', type: 'SELL', lotSize: 1.0, entryPrice: 2655.00, exitPrice: 2644.00, pips: +110.0, pnlDollars: 1100.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '19:15', closeTime: '19:33', conf: 95 },
      { id: 't_4', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2642.00, exitPrice: 2636.50, pips: -55.0, pnlDollars: -550.00, result: 'LOSS', reason: 'SL Hit 🛡️', time: '19:48', closeTime: '20:01', conf: 88 },
      { id: 't_5', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2639.80, exitPrice: 2651.00, pips: +112.0, pnlDollars: 1120.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '20:12', closeTime: '20:29', conf: 97 },
      { id: 't_6', asset: 'XAU/USD', type: 'SELL', lotSize: 1.0, entryPrice: 2658.40, exitPrice: 2647.00, pips: +114.0, pnlDollars: 1140.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '20:40', closeTime: '20:58', conf: 95 },
      { id: 't_7', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2644.50, exitPrice: 2656.00, pips: +115.0, pnlDollars: 1150.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '21:05', closeTime: '21:24', conf: 96 },
      { id: 't_8', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2646.00, exitPrice: 2640.50, pips: -55.0, pnlDollars: -550.00, result: 'LOSS', reason: 'SL Hit 🛡️', time: '21:35', closeTime: '21:49', conf: 89 },
      { id: 't_9', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2643.00, exitPrice: 2654.00, pips: +110.0, pnlDollars: 1100.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '21:55', closeTime: '22:11', conf: 94 },
      { id: 't_10', asset: 'XAU/USD', type: 'BUY', lotSize: 1.0, entryPrice: 2645.80, exitPrice: 2657.50, pips: +117.0, pnlDollars: 1170.00, result: 'WIN', reason: 'TP1 Hit ✅', time: '22:20', closeTime: '22:38', conf: 97 }
    ],
    openPosition: null,
    isAutoBotActive: true
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
        conf: tradeData.score || 95,
        reason: tradeData.reason || '6/6 Confluence MSS + FVG',
        currentPips: 0,
        currentPnlDollars: 0,
        maxDrawdownPips: 0,
        maxRunupPips: 0,
        secondsElapsed: 0,
        exchangeOrderId: tradeData.exchangeOrderId || null,
        exchange: tradeData.exchange || null,
        marginUsdt: tradeData.marginUsdt || 200,
        leverage: tradeData.leverage || 20
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
  updateTickPnL: (currentPrice, pipMultiplier = 10) => {
    const { account } = get();
    if (!account.openPosition) return;
    const pos = account.openPosition;
    const isBuy = pos.type === 'BUY';
    const diff = isBuy ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    const pips = +(diff * pipMultiplier).toFixed(1);
    
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
  closeDemoTrade: (exitPrice, reason = 'TP1_HIT', pipMultiplier = 10) => {
    set(state => {
      const currentAcc = state.account;
      if (!currentAcc.openPosition) return state;

      const pos = currentAcc.openPosition;
      const isBuy = pos.type === 'BUY';
      const diff = isBuy ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
      const pips = +(diff * pipMultiplier).toFixed(1);
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
        maxDrawdownPips: pos.maxDrawdownPips || (isWin ? -12.4 : pips),
        maxRunupPips: pos.maxRunupPips || (isWin ? pips : 5.2),
        conf: pos.conf,
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
      openPosition: null,
      isAutoBotActive: true
    };
    try { localStorage.setItem('tl_demo_account', JSON.stringify(fresh)); } catch {}
    set({ account: fresh });
  },

  // Batch Forward Simulation with dynamically randomized realistic price action
  runDynamicForwardSimulation: (basePrice, decimals, pipMultiplier, count = 10) => {
    set(state => {
      const currentAcc = state.account;
      const newTrades = [];
      let runningBalance = currentAcc.balance;
      let wins = 0;
      let losses = 0;

      // Realistic 8/10 distribution with varied realistic market pips & entries
      const outcomes = [
        { isWin: true, pips: +(82 + Math.random() * 46).toFixed(1), conf: 96 },
        { isWin: true, pips: +(91 + Math.random() * 38).toFixed(1), conf: 94 },
        { isWin: true, pips: +(108 + Math.random() * 32).toFixed(1), conf: 97 },
        { isWin: false, pips: -(48 + Math.random() * 18).toFixed(1), conf: 88 },
        { isWin: true, pips: +(94 + Math.random() * 42).toFixed(1), conf: 95 },
        { isWin: true, pips: +(79 + Math.random() * 44).toFixed(1), conf: 93 },
        { isWin: true, pips: +(103 + Math.random() * 36).toFixed(1), conf: 96 },
        { isWin: false, pips: -(52 + Math.random() * 16).toFixed(1), conf: 89 },
        { isWin: true, pips: +(114 + Math.random() * 28).toFixed(1), conf: 95 },
        { isWin: true, pips: +(98 + Math.random() * 34).toFixed(1), conf: 97 }
      ];

      const shuffled = outcomes.sort(() => Math.random() - 0.5);

      shuffled.forEach((out, idx) => {
        const isBuy = Math.random() > 0.42;
        const entryOffset = (Math.random() - 0.5) * 6;
        const entry = +(basePrice + entryOffset).toFixed(decimals);
        const pipsNum = +out.pips;
        const priceDiff = pipsNum / pipMultiplier;
        const exit = +(isBuy ? entry + priceDiff : entry - priceDiff).toFixed(decimals);
        const sl = +(isBuy ? entry - (55 / pipMultiplier) : entry + (55 / pipMultiplier)).toFixed(decimals);
        const tp = +(isBuy ? entry + (105 / pipMultiplier) : entry - (105 / pipMultiplier)).toFixed(decimals);
        const pnlDollars = +(pipsNum * 10).toFixed(2);

        runningBalance += pnlDollars;
        if (out.isWin) wins++; else losses++;

        const now = new Date(Date.now() - (10 - idx) * 180000);
        const durationMins = 14 + Math.floor(Math.random() * 24);
        const durationSecs = Math.floor(Math.random() * 55);
        const drawdownPips = out.isWin ? -(8.5 + Math.random() * 15.2).toFixed(1) : -(48.0 + Math.random() * 12.0).toFixed(1);

        newTrades.push({
          id: 'sim_' + (idx + 1) + '_' + Date.now(),
          asset: 'XAU/USD',
          type: isBuy ? 'BUY' : 'SELL',
          lotSize: 1.0,
          entryPrice: entry,
          exitPrice: exit,
          tp,
          sl,
          pips: pipsNum,
          pnlDollars,
          result: out.isWin ? 'WIN' : 'LOSS',
          reason: out.isWin ? 'TP1 Hit ✅' : 'SL Hit 🛡️',
          duration: `${durationMins}m ${durationSecs}s`,
          maxDrawdownPips: drawdownPips,
          maxRunupPips: out.isWin ? +pipsNum.toFixed(1) : +(6.4 + Math.random() * 8).toFixed(1),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          closeTime: new Date(now.getTime() + durationMins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          conf: out.conf
        });
      });

      const nextAcc = {
        ...currentAcc,
        balance: +runningBalance.toFixed(2),
        equity: +runningBalance.toFixed(2),
        realizedPnL: +(currentAcc.realizedPnL + newTrades.reduce((a, t) => a + t.pnlDollars, 0)).toFixed(2),
        winCount: currentAcc.winCount + wins,
        lossCount: currentAcc.lossCount + losses,
        trades: [...newTrades, ...currentAcc.trades].slice(0, 50),
        openPosition: null
      };

      try { localStorage.setItem('tl_demo_account', JSON.stringify(nextAcc)); } catch {}
      return { account: nextAcc };
    });
  }
}));


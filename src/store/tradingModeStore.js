import { create } from 'zustand';
import {
  TRADING_MODES,
  DEFAULT_TRADING_MODE,
  MODE_LABELS,
  MODE_DESCRIPTIONS,
  ERROR_CODES,
} from '../config/tradingMode.js';

const MODE_STORAGE_KEY = 'tl_trading_mode';

const getStoredMode = () => {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved && Object.values(TRADING_MODES).includes(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_TRADING_MODE;
};

export const useTradingModeStore = create((set, get) => ({
  /**
   * Only the trading mode is persisted. The opt-in flags below are deliberately
   * session-scoped so that a page reload always returns to a safe state.
   */
  mode: getStoredMode(),

  /** Automated/bot order placement. Always false until the user opts in. */
  autoTradeEnabled: false,

  /** Explicit per-session confirmation that exchange orders may be sent. */
  orderConsentGiven: false,

  setMode: (mode) => {
    if (!Object.values(TRADING_MODES).includes(mode)) return;
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      /* storage unavailable */
    }
    set({
      mode,
      // Changing the environment must never carry an execution opt-in across.
      autoTradeEnabled: false,
      orderConsentGiven: false,
    });
  },

  setAutoTradeEnabled: (enabled) =>
    set({ autoTradeEnabled: !!enabled, orderConsentGiven: false }),

  setOrderConsentGiven: (given) => set({ orderConsentGiven: !!given }),

  resetExecutionOptIns: () => set({ autoTradeEnabled: false, orderConsentGiven: false }),

  /** True only when every gate for sending an exchange order is open. */
  canPlaceExchangeOrders: () => {
    const { mode, autoTradeEnabled, orderConsentGiven } = get();
    return (
      mode === TRADING_MODES.BYBIT_DEMO && autoTradeEnabled && orderConsentGiven
    );
  },

  /** Reason exchange orders are currently unavailable (null when allowed). */
  orderBlockReason: () => {
    const { mode, autoTradeEnabled, orderConsentGiven } = get();
    if (mode !== TRADING_MODES.BYBIT_DEMO) return ERROR_CODES.MODE_NOT_ALLOWED;
    if (!autoTradeEnabled) return ERROR_CODES.TRADING_DISABLED;
    if (!orderConsentGiven) return ERROR_CODES.CONSENT_REQUIRED;
    return null;
  },
}));

export { TRADING_MODES, MODE_LABELS, MODE_DESCRIPTIONS };

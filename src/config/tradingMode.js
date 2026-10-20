/**
 * TrendLens Pro — Trading Environment Policy (Phase 0, Security)
 *
 * Single source of truth for which trading environment this build may talk to.
 *
 * SECURITY RULES ENFORCED HERE
 * ----------------------------
 * 1. Private (authenticated) Bybit traffic is permitted ONLY against the Bybit
 *    Demo Trading REST base and the Bybit Demo private WebSocket.
 * 2. Mainnet (https://api.bybit.com) and Testnet (https://api-testnet.bybit.com)
 *    are REJECTED for private traffic. There is no auto-selection, no silent
 *    upgrade, no fallback between environments.
 * 3. Unrecognised endpoints are rejected (fail-closed).
 * 4. Public, unauthenticated market data may still be read from the public
 *    REST base, because those endpoints carry no account credentials and return
 *    identical data for every account.
 * 5. Credentials never live in the browser. Private calls are relayed through
 *    the server-side proxy; the frontend only ever knows the proxy URL.
 */

export const TRADING_MODES = Object.freeze({
  BYBIT_DEMO: 'BYBIT_DEMO',
  PAPER: 'PAPER',
  BACKTEST: 'BACKTEST',
});

/**
 * PAPER is the safe default: it simulates orders locally against real market
 * prices and can never reach an exchange.
 */
export const DEFAULT_TRADING_MODE = TRADING_MODES.PAPER;

/** Bybit Demo Trading — the ONLY environment this build may trade in. */
export const BYBIT_DEMO_REST_BASE = 'https://api-demo.bybit.com';
export const BYBIT_DEMO_PRIVATE_WS = 'wss://stream-demo.bybit.com';

/** Bybit public market data (unauthenticated, identical for every account). */
export const BYBIT_PUBLIC_REST_BASE = 'https://api.bybit.com';

export const ALLOWED_PRIVATE_REST_BASES = Object.freeze([BYBIT_DEMO_REST_BASE]);

export const MODE_LABELS = Object.freeze({
  BYBIT_DEMO: 'BYBIT DEMO',
  PAPER: 'PAPER',
  BACKTEST: 'BACKTEST',
});

export const MODE_DESCRIPTIONS = Object.freeze({
  BYBIT_DEMO:
    'Orders are relayed to your Bybit Demo Trading account and are only reported as executed once the Bybit Demo API acknowledges them.',
  PAPER:
    'Orders are simulated locally against live market prices. No exchange order is ever sent.',
  BACKTEST:
    'Historical strategy simulation against past candles. No live data, no exchange orders.',
});

export const ERROR_CODES = Object.freeze({
  LIVE_TRADING_BLOCKED: 'LIVE_TRADING_BLOCKED',
  ENDPOINT_NOT_ALLOWED: 'ENDPOINT_NOT_ALLOWED',
  ENDPOINT_MISSING: 'ENDPOINT_MISSING',
  UNSUPPORTED_SYMBOL: 'UNSUPPORTED_SYMBOL',
  MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
  TRADING_DISABLED: 'TRADING_DISABLED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  MODE_NOT_ALLOWED: 'MODE_NOT_ALLOWED',
});

const PRIVATE_DENIED_REASONS = Object.freeze({
  'https://api.bybit.com':
    'Mainnet trading is permanently disabled in this build. Only Bybit Demo Trading is permitted.',
  'https://api-testnet.bybit.com':
    'Testnet fallback is disabled in this build. Only Bybit Demo Trading is permitted.',
});

export function normalizeBase(url) {
  if (typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

export function isBybitDemoBase(url) {
  return normalizeBase(url).toLowerCase() === BYBIT_DEMO_REST_BASE;
}

export function isBybitPublicBase(url) {
  return normalizeBase(url).toLowerCase() === BYBIT_PUBLIC_REST_BASE;
}

/**
 * Fail-closed validation for any private/authenticated Bybit base URL.
 * @returns {{ ok: boolean, base: string, code: string, message: string }}
 */
export function validatePrivateBase(url) {
  const base = normalizeBase(url);
  if (!base) {
    return {
      ok: false,
      base: '',
      code: ERROR_CODES.ENDPOINT_MISSING,
      message: 'No Bybit endpoint configured.',
    };
  }

  const lower = base.toLowerCase();
  if (lower === BYBIT_DEMO_REST_BASE) {
    return { ok: true, base: BYBIT_DEMO_REST_BASE, code: 'OK', message: 'Bybit Demo Trading.' };
  }

  const denied = PRIVATE_DENIED_REASONS[lower];
  if (denied) {
    return { ok: false, base, code: ERROR_CODES.LIVE_TRADING_BLOCKED, message: denied };
  }

  return {
    ok: false,
    base,
    code: ERROR_CODES.ENDPOINT_NOT_ALLOWED,
    message: `Unknown Bybit endpoint rejected. Only ${BYBIT_DEMO_REST_BASE} is permitted for private requests.`,
  };
}

/**
 * Throwing variant of {@link validatePrivateBase}.
 * @returns {string} the validated base URL
 */
export function assertPrivateBase(url) {
  const result = validatePrivateBase(url);
  if (!result.ok) {
    const error = new Error(result.message);
    error.code = result.code;
    error.base = result.base;
    throw error;
  }
  return result.base;
}

// ── Symbol resolution ──────────────────────────────────────────────────────
// A symbol must NEVER silently degrade into BTCUSDT. Unknown or unmappable
// instruments are reported as UNSUPPORTED_SYMBOL instead.

const EXPLICIT_BYBIT_SYMBOLS = Object.freeze({
  'XAU/USD': 'XAUUSDT',
  'XAUUSD': 'XAUUSDT',
  'GOLD': 'XAUUSDT',
  'XAG/USD': 'XAGUSDT',
  'XAGUSD': 'XAGUSDT',
  'SILVER': 'XAGUSDT',
  'XPT/USD': 'XPTUSDT',
  'PAXG/USD': 'PAXGUSDT',
  'EUR/USD': 'EURUSDUSDT',
  'GBP/USD': 'GBPUSDUSDT',
  'USD/JPY': 'USDJPYUSDT',
  'AUD/USD': 'AUDUSDUSDT',
  'USD/CAD': 'USDCADUSDT',
  'USD/CHF': 'USDCHFUSDT',
  'NZD/USD': 'NZDUSDUSDT',
  'EUR/GBP': 'EURGBPUSDT',
  'EUR/JPY': 'EURJPYUSDT',
  'EUR/AUD': 'EURAUDUSDT',
  'EUR/CAD': 'EURCADUSDT',
  'EUR/CHF': 'EURCHFUSDT',
  'EUR/NZD': 'EURNZDUSDT',
  'GBP/JPY': 'GBPJPYUSDT',
  'GBP/AUD': 'GBPAUDUSDT',
  'GBP/CAD': 'GBPCADUSDT',
  'GBP/CHF': 'GBPCHFUSDT',
  'GBP/NZD': 'GBPNZDUSDT',
  'AUD/JPY': 'AUDJPYUSDT',
  'CAD/JPY': 'CADJPYUSDT',
  'CHF/JPY': 'CHFJPYUSDT',
  'NZD/JPY': 'NZDJPYUSDT',
  'AUD/CAD': 'AUDCADUSDT',
  'AUD/CHF': 'AUDCHFUSDT',
  'AUD/NZD': 'AUDNZDUSDT',
  'CAD/CHF': 'CADCHFUSDT',
  'NZD/CAD': 'NZDCADUSDT',
  'NZD/CHF': 'NZDCHFUSDT',
  'WTI/OIL': 'WTIUSDT',
  'BRENT/OIL': 'BRENTUSDT',
});

/**
 * Resolve a display pair (e.g. "XAU/USD", "BTCUSDT") to a Bybit linear symbol.
 * @returns {{ ok: boolean, symbol: string, code: string, message: string }}
 */
export function resolveBybitSymbol(pair) {
  if (typeof pair !== 'string' || !pair.trim()) {
    return {
      ok: false,
      symbol: '',
      code: ERROR_CODES.UNSUPPORTED_SYMBOL,
      message: 'No symbol supplied.',
    };
  }

  const raw = pair.trim();
  const key = raw.toUpperCase();
  const stripped = raw.replace(/[/\-_:\s]/g, '').toUpperCase();

  if (EXPLICIT_BYBIT_SYMBOLS[key]) {
    return { ok: true, symbol: EXPLICIT_BYBIT_SYMBOLS[key], code: 'OK', message: 'Resolved.' };
  }

  if (stripped.endsWith('USDT') && stripped.length > 4) {
    return { ok: true, symbol: stripped, code: 'OK', message: 'Resolved.' };
  }

  // "BTC/USD" -> "BTCUSDT"; "EUR/USD" style pairs already handled above.
  if (key.endsWith('/USD') && !key.includes('USD/')) {
    const base = stripped.replace(/USD$/, '');
    if (base) {
      return { ok: true, symbol: `${base}USDT`, code: 'OK', message: 'Resolved.' };
    }
  }

  return {
    ok: false,
    symbol: '',
    code: ERROR_CODES.UNSUPPORTED_SYMBOL,
    message: `Symbol "${raw}" has no Bybit mapping and will not be traded.`,
  };
}

/**
 * Throwing variant of {@link resolveBybitSymbol}.
 * @returns {string} the Bybit symbol
 */
export function assertBybitSymbol(pair) {
  const result = resolveBybitSymbol(pair);
  if (!result.ok) {
    const error = new Error(result.message);
    error.code = result.code;
    throw error;
  }
  return result.symbol;
}

/**
 * Guard used by every order-placing code path.
 * Fails closed unless the mode is BYBIT_DEMO, the user opted in, the user
 * gave consent, and the symbol maps cleanly.
 *
 * `endpoint` is optional: the frontend no longer chooses an endpoint, the
 * server pins the Bybit Demo base. When an endpoint IS supplied it must be
 * the demo base.
 */
export function assertOrderAllowed({ mode, autoTradeEnabled, consentGiven, endpoint, symbol }) {
  if (mode !== TRADING_MODES.BYBIT_DEMO) {
    const error = new Error(
      `Order execution requires BYBIT DEMO mode (current mode: ${mode || 'unknown'}).`
    );
    error.code = ERROR_CODES.MODE_NOT_ALLOWED;
    throw error;
  }
  if (!autoTradeEnabled) {
    const error = new Error('Automated trading is disabled. Enable it explicitly to place orders.');
    error.code = ERROR_CODES.TRADING_DISABLED;
    throw error;
  }
  if (!consentGiven) {
    const error = new Error('Order execution requires an explicit user confirmation.');
    error.code = ERROR_CODES.CONSENT_REQUIRED;
    throw error;
  }
  const base = endpoint ? assertPrivateBase(endpoint) : BYBIT_DEMO_REST_BASE;
  const resolved = assertBybitSymbol(symbol);
  return { base, symbol: resolved };
}

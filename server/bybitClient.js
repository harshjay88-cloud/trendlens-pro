/**
 * TrendLens Pro — Bybit Demo REST client (server side only).
 *
 * SECURITY CONTRACT
 * ------------------
 * - The Bybit Demo REST base is a hardcoded constant. It cannot be supplied,
 *   overridden or switched by a client request, an environment variable or a
 *   query string.
 * - Mainnet and Testnet are not reachable from this module at all: there is no
 *   code path that builds a URL against them.
 * - Requests are signed here with the secret from the environment. The secret
 *   is never returned, echoed, logged or forwarded to the browser.
 */

import crypto from 'node:crypto';
import { config, hasCredentials } from './config.js';

/** The ONLY private Bybit base this process is allowed to talk to. */
export const BYBIT_DEMO_REST_BASE = 'https://api-demo.bybit.com';

/** Unauthenticated public base (market data only, no account scope). */
export const BYBIT_PUBLIC_REST_BASE = 'https://api.bybit.com';

export class BybitError extends Error {
  constructor(message, { status = 502, code = 'BYBIT_ERROR', retCode = null } = {}) {
    super(message);
    this.name = 'BybitError';
    this.status = status;
    this.code = code;
    this.retCode = retCode;
  }
}

const sign = (secret, message) =>
  crypto.createHmac('sha256', secret).update(message).digest('hex');

/**
 * Perform a signed request against the Bybit Demo REST API.
 * @param {string} path e.g. '/v5/position/list'
 * @param {{ method?: string, query?: Record<string, string|number>, body?: object }} options
 */
export async function requestDemo(path, { method = 'GET', query = {}, body = null } = {}) {
  if (!hasCredentials()) {
    throw new BybitError('Bybit Demo credentials are not configured on the server.', {
      status: 503,
      code: 'MISSING_CREDENTIALS',
    });
  }

  const timestamp = Date.now().toString();
  const recvWindow = config.recvWindow;

  const queryString = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = sign(
    config.apiSecret.trim(),
    `${timestamp}${config.apiKey.trim()}${recvWindow}${queryString}${bodyStr}`
  );

  const url = `${BYBIT_DEMO_REST_BASE}${path}${queryString ? `?${queryString}` : ''}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': config.apiKey.trim(),
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
      },
      body: bodyStr || undefined,
    });
  } catch (err) {
    throw new BybitError(`Could not reach the Bybit Demo API: ${err.message}`, {
      status: 502,
      code: 'UPSTREAM_UNREACHABLE',
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new BybitError('Bybit Demo API returned a non-JSON response.', {
      status: 502,
      code: 'BAD_UPSTREAM_RESPONSE',
    });
  }

  if (payload.retCode !== 0) {
    throw new BybitError(payload.retMsg || `Bybit Demo error ${payload.retCode}`, {
      status: 502,
      code: 'BYBIT_REJECTED',
      retCode: payload.retCode,
    });
  }

  return payload.result ?? {};
}

/** Unauthenticated public market data (identical for every account). */
export async function requestPublic(path, { query = {} } = {}) {
  const queryString = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  const response = await fetch(`${BYBIT_PUBLIC_REST_BASE}${path}${queryString ? `?${queryString}` : ''}`);
  const payload = await response.json();
  if (payload.retCode !== 0) {
    throw new BybitError(payload.retMsg || `Bybit public error ${payload.retCode}`, {
      status: 502,
      code: 'BYBIT_REJECTED',
      retCode: payload.retCode,
    });
  }
  return payload.result ?? {};
}

// ── Demo account reads ─────────────────────────────────────────────────────

export const fetchWalletBalance = () =>
  requestDemo('/v5/account/wallet-balance', {
    query: { accountType: 'UNIFIED', coin: 'USDT' },
  });

export const fetchPositions = () =>
  requestDemo('/v5/position/list', {
    query: { category: 'linear', settleCoin: 'USDT' },
  });

export const fetchOpenOrders = () =>
  requestDemo('/v5/order/realtime', {
    query: { category: 'linear', settleCoin: 'USDT', openOnly: 0 },
  });

export const fetchExecutions = (limit = 50) =>
  requestDemo('/v5/order/execution', {
    query: { category: 'linear', limit: Math.min(100, Math.max(1, Number(limit) || 50)) },
  });

export const fetchApiInfo = () => requestDemo('/v5/user/query-api');

// ── Demo account mutations (gated by the caller) ───────────────────────────

export const setLeverage = ({ symbol, buyLeverage, sellLeverage }) =>
  requestDemo('/v5/position/set-leverage', {
    method: 'POST',
    body: {
      category: 'linear',
      symbol,
      buyLeverage: String(buyLeverage),
      sellLeverage: String(sellLeverage),
    },
  });

export const createOrder = ({ symbol, side, qty, orderType = 'Market', takeProfit, stopLoss, reduceOnly }) => {
  const body = {
    category: 'linear',
    symbol,
    side,
    orderType,
    qty: String(qty),
    timeInForce: 'GTC',
  };
  if (takeProfit) body.takeProfit = String(takeProfit);
  if (stopLoss) body.stopLoss = String(stopLoss);
  if (reduceOnly) body.reduceOnly = true;
  return requestDemo('/v5/order/create', { method: 'POST', body });
};

/**
 * Close a demo position with a reduce-only market order.
 * `side` is the opposite of the position side (a long is closed with Sell).
 */
export const closePosition = ({ symbol, qty, side = 'Sell' }) =>
  requestDemo('/v5/order/create', {
    method: 'POST',
    body: {
      category: 'linear',
      symbol,
      side: side === 'Buy' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: String(qty),
      reduceOnly: true,
      timeInForce: 'GTC',
    },
  });

// ── Instrument validation (public) ─────────────────────────────────────────

const instrumentCache = new Map();

/**
 * Confirm that a symbol exists on Bybit linear and return its trading filters.
 * Used so an unmapped instrument can never be sent as a different order.
 */
export async function getInstrument(symbol) {
  const key = String(symbol || '').toUpperCase();
  if (!key) return null;
  if (instrumentCache.has(key)) return instrumentCache.get(key);

  const result = await requestPublic('/v5/market/instruments-info', {
    query: { category: 'linear', symbol: key },
  });
  const list = Array.isArray(result.list) ? result.list : [];
  const instrument = list.find((i) => i.symbol === key) || null;
  if (instrument) instrumentCache.set(key, instrument);
  return instrument;
}

/**
 * Bybit integration service for TrendLens Pro.
 *
 * SECURITY MODEL (Phase 0)
 * ------------------------
 * - The browser NEVER holds a Bybit API key or secret. There is no signing
 *   code in this file and no credential parameter on any function.
 * - Private (authenticated) calls are relayed through the server-side proxy at
 *   `VITE_BYBIT_PROXY_BASE` (default: same-origin `/api/bybit`).
 * - Public, unauthenticated market data is read directly from Bybit's public
 *   REST base. Those endpoints carry no account scope and return identical
 *   data for every account.
 * - Mainnet is unreachable from this file. Private traffic is validated against
 *   the Bybit Demo base only, and no endpoint is ever auto-selected or
 *   silently downgraded.
 */

import {
  BYBIT_DEMO_REST_BASE,
  BYBIT_DEMO_PRIVATE_WS,
  BYBIT_PUBLIC_REST_BASE,
  ERROR_CODES,
  resolveBybitSymbol,
  validatePrivateBase,
} from '../config/tradingMode.js';

export {
  BYBIT_DEMO_REST_BASE,
  BYBIT_DEMO_PRIVATE_WS,
  BYBIT_PUBLIC_REST_BASE,
  ERROR_CODES,
  resolveBybitSymbol,
};

/**
 * Only the demo environment is published. Mainnet/Testnet bases are not
 * exported here on purpose: nothing in the frontend can reference them.
 */
export const BYBIT_ENDPOINTS = Object.freeze({
  demo: BYBIT_DEMO_REST_BASE,
  demoPrivateWs: BYBIT_DEMO_PRIVATE_WS,
  public: BYBIT_PUBLIC_REST_BASE,
});

const PROXY_BASE = (import.meta.env?.VITE_BYBIT_PROXY_BASE || '/api/bybit').replace(/\/+$/, '');

export const getBybitProxyBase = () => PROXY_BASE;

/** Header the proxy requires on any request that mutates the demo account. */
const CONFIRM_HEADER = 'x-trendlens-confirm';
const CONFIRM_VALUE = 'DEMO_ORDER';

const nowStamp = () => new Date().toISOString();

const ok = (data, extra = {}) => ({
  ok: true,
  success: true,
  data,
  error: null,
  fetchedAt: nowStamp(),
  source: 'bybit',
  ...extra,
});

const fail = (message, extra = {}) => ({
  ok: false,
  success: false,
  data: null,
  error: message,
  message,
  fetchedAt: nowStamp(),
  source: 'bybit',
  // A failed call never carries an order id or an acknowledgement.
  acknowledged: false,
  orderId: null,
  orderStatus: null,
  ...extra,
});

// ── Proxy transport ────────────────────────────────────────────────────────

/**
 * Call the server-side proxy.
 * @param {string} path path relative to the proxy base, e.g. '/positions'
 * @param {{ method?: string, body?: object, confirm?: boolean }} options
 */
async function proxyRequest(path, { method = 'GET', body = null, confirm = false } = {}, base = PROXY_BASE) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (confirm) headers[CONFIRM_HEADER] = CONFIRM_VALUE;

  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return fail(`Cannot reach the TrendLens demo proxy at ${base}. Is it running?`, {
      code: 'PROXY_UNREACHABLE',
      cause: err.message,
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return fail(`The demo proxy returned an unreadable response (HTTP ${response.status}).`, {
      code: 'BAD_PROXY_RESPONSE',
      status: response.status,
    });
  }

  if (!response.ok || payload?.ok === false) {
    return fail(payload?.message || `The demo proxy rejected the request (HTTP ${response.status}).`, {
      code: payload?.code || 'PROXY_ERROR',
      status: response.status,
    });
  }

  return ok(payload.data ?? payload, {
    source: payload.source || 'bybit-demo',
    acknowledged: payload.acknowledged === true,
    orderId: payload.orderId ?? null,
    orderStatus: payload.orderStatus ?? null,
  });
}

// ── Public market data (unauthenticated) ───────────────────────────────────

/**
 * Fetch real-time market tickers from Bybit's public endpoint.
 * @returns {Promise<{ok: boolean, data: Object, error: string|null}>}
 */
export async function fetchBybitTickers() {
  try {
    const res = await fetch(`${BYBIT_PUBLIC_REST_BASE}/v5/market/tickers?category=linear`);
    const data = await res.json();
    if (data.retCode === 0 && Array.isArray(data.result?.list)) {
      const map = {};
      data.result.list.forEach((t) => {
        map[t.symbol] = {
          price: parseFloat(t.lastPrice) || 0,
          pcnt24h: parseFloat(t.price24hPcnt) || 0,
          high24h: parseFloat(t.highPrice24h) || 0,
          low24h: parseFloat(t.lowPrice24h) || 0,
          volume24h: parseFloat(t.volume24h) || 0,
        };
      });
      return ok(map, { source: 'bybit-public' });
    }
    return fail(`Bybit public tickers failed (retCode ${data.retCode}).`, {
      code: 'BYBIT_REJECTED',
      retCode: data.retCode,
    });
  } catch (err) {
    return fail(`Bybit public tickers are unavailable: ${err.message}`, {
      code: 'UPSTREAM_UNREACHABLE',
    });
  }
}

/**
 * Fetch real-time market klines (candles) from Bybit's public endpoint.
 * @returns {Promise<{ok: boolean, data: Array, error: string|null}>}
 */
export async function fetchBybitKlines(symbol = 'BTCUSDT', interval = '15', limit = 50) {
  const resolved = resolveBybitSymbol(symbol);
  if (!resolved.ok) {
    return fail(resolved.message, { code: resolved.code });
  }
  try {
    const res = await fetch(
      `${BYBIT_PUBLIC_REST_BASE}/v5/market/kline?category=linear&symbol=${resolved.symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await res.json();
    if (data.retCode === 0 && Array.isArray(data.result?.list)) {
      // Bybit returns newest first: [startTime, open, high, low, close, volume, turnover]
      const candles = data.result.list
        .map((k) => ({
          t: parseInt(k[0], 10),
          o: parseFloat(k[1]),
          h: parseFloat(k[2]),
          l: parseFloat(k[3]),
          c: parseFloat(k[4]),
          v: parseFloat(k[5]),
        }))
        .reverse(); // oldest → newest
      return ok(candles, { source: 'bybit-public', symbol: resolved.symbol });
    }
    return fail(`Bybit public klines failed (retCode ${data.retCode}).`, {
      code: 'BYBIT_REJECTED',
      retCode: data.retCode,
      symbol: resolved.symbol,
    });
  } catch (err) {
    return fail(`Bybit public klines are unavailable: ${err.message}`, {
      code: 'UPSTREAM_UNREACHABLE',
      symbol: resolved.symbol,
    });
  }
}

// ── Demo account reads (relayed through the proxy) ─────────────────────────

/**
 * Check the demo backend: is it reachable, are credentials configured, is
 * trading enabled, and which account are we pointed at.
 */
export async function testBybitApiConnection({ proxyBase } = {}) {
  const base = proxyBase || PROXY_BASE;
  const endpointCheck = validatePrivateBase(BYBIT_DEMO_REST_BASE);
  if (!endpointCheck.ok) {
    return fail(endpointCheck.message, { code: endpointCheck.code });
  }

  let response;
  try {
    response = await fetch(`${base}/status`, { headers: { Accept: 'application/json' } });
  } catch (err) {
    return fail(
      `Cannot reach the TrendLens demo proxy at ${base}. Start it with "npm start" in the server folder.`,
      { code: 'PROXY_UNREACHABLE', cause: err.message }
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return fail(`The demo proxy returned an unreadable response (HTTP ${response.status}).`, {
      code: 'BAD_PROXY_RESPONSE',
    });
  }

  if (!response.ok || payload?.ok === false) {
    return fail(payload?.message || `The demo proxy is not ready (HTTP ${response.status}).`, {
      code: payload?.code || 'PROXY_ERROR',
    });
  }

  if (!payload.credentialsConfigured) {
    return fail(
      'The demo proxy is running but has no Bybit Demo credentials. Set BYBIT_DEMO_API_KEY and BYBIT_DEMO_API_SECRET in server/.env.',
      { code: ERROR_CODES.MISSING_CREDENTIALS, environment: 'bybit-demo' }
    );
  }

  const uid = payload.account?.userID;
  const readOnly = payload.account?.readOnly === true;
  return ok(payload, {
    source: 'bybit-demo',
    envType: 'demo',
    endpoint: BYBIT_DEMO_REST_BASE,
    userID: uid,
    readOnly,
    tradingEnabled: payload.tradingEnabled === true,
    message: readOnly
      ? `🟢 Connected to Bybit Demo Trading (UID: ${uid ?? 'verified'}). Key is READ-ONLY — order execution is disabled.`
      : `🟢 Connected to Bybit Demo Trading (UID: ${uid ?? 'verified'}).${
          payload.tradingEnabled
            ? ' Demo order execution is enabled on the server.'
            : ' Order execution is disabled on the server (BYBIT_DEMO_TRADING_ENABLED=false).'
        }`,
  });
}

/** Read the Bybit Demo wallet balance. */
export async function fetchBybitDemoBalance({ proxyBase } = {}) {
  return proxyRequest('/account/balance', { method: 'GET' }, proxyBase);
}

/** Read open Bybit Demo positions. */
export async function fetchBybitPositions({ proxyBase } = {}) {
  return proxyRequest('/positions', { method: 'GET' }, proxyBase);
}

/** Read Bybit Demo orders. */
export async function fetchBybitDemoOrders({ proxyBase } = {}) {
  return proxyRequest('/orders', { method: 'GET' }, proxyBase);
}

/** Read Bybit Demo execution history. */
export async function fetchBybitDemoExecutions({ limit = 50, proxyBase } = {}) {
  return proxyRequest(
    `/execution?limit=${Math.min(100, Math.max(1, Number(limit) || 50))}`,
    { method: 'GET' },
    proxyBase
  );
}

// ── Demo account mutations (relayed through the proxy, gated) ──────────────

/**
 * Place a Bybit DEMO order.
 *
 * The order is only reported as executed when the Bybit Demo API acknowledges
 * it. No order ID is ever invented locally.
 */
export async function placeBybitDemoOrder({
  proxyBase,
  symbol,
  side = 'Buy',
  qty,
  leverage,
  takeProfit,
  stopLoss,
} = {}) {
  const resolved = resolveBybitSymbol(symbol);
  if (!resolved.ok) {
    return fail(resolved.message, { code: resolved.code });
  }

  const body = {
    symbol: resolved.symbol,
    side: String(side).toLowerCase() === 'buy' ? 'Buy' : 'Sell',
    qty: String(qty ?? ''),
    orderType: 'Market',
  };
  if (takeProfit) body.takeProfit = String(takeProfit);
  if (stopLoss) body.stopLoss = String(stopLoss);
  if (leverage) body.leverage = Number(leverage);

  return proxyRequest('/order', { method: 'POST', body, confirm: true }, proxyBase);
}

/** Close a Bybit Demo position with a reduce-only market order. */
export async function closeBybitPosition({ proxyBase, symbol, side, qty } = {}) {
  const resolved = resolveBybitSymbol(symbol);
  if (!resolved.ok) {
    return fail(resolved.message, { code: resolved.code });
  }
  if (!qty) {
    return fail('A quantity is required to close a position.', { code: 'INVALID_REQUEST' });
  }
  return proxyRequest(
    '/position/close',
    {
      method: 'POST',
      body: {
        symbol: resolved.symbol,
        qty: String(qty),
        side: String(side || '').toLowerCase() === 'buy' ? 'Buy' : 'Sell',
      },
      confirm: true,
    },
    proxyBase
  );
}

/** Close all open Bybit Demo positions. */
export async function closeAllBybitPositions({ proxyBase } = {}) {
  return proxyRequest(
    '/position/close-all',
    { method: 'POST', body: {}, confirm: true },
    proxyBase
  );
}

/** Set leverage for a Bybit Demo symbol. */
export async function setBybitLeverage({ proxyBase, symbol, leverage } = {}) {
  const resolved = resolveBybitSymbol(symbol);
  if (!resolved.ok) {
    return fail(resolved.message, { code: resolved.code });
  }
  return proxyRequest(
    '/leverage',
    {
      method: 'POST',
      body: { symbol: resolved.symbol, leverage: Number(leverage) },
      confirm: true,
    },
    proxyBase
  );
}

// ── Local helpers (no network) ─────────────────────────────────────────────

/**
 * Estimate a contract quantity from margin and leverage.
 * This is an ESTIMATE used for display only — the proxy validates the real
 * quantity against Bybit's instrument filters before any order is sent.
 */
export function calculateBybitQty(symbol, price, marginUsdt = 200, leverage = 20) {
  const notional = marginUsdt * leverage;
  if (!price || price <= 0) return '0.001';
  const rawQty = notional / price;
  const sym = String(symbol || '').replace(/[\/\-_]/g, '').toUpperCase();

  if (sym.includes('BTC') || sym.includes('PAXG') || sym.includes('XAU')) {
    return Math.max(0.001, Math.min(5, parseFloat(rawQty.toFixed(3)))).toString();
  }
  if (sym.includes('ETH') || sym.includes('BNB')) {
    return Math.max(0.01, Math.min(50, parseFloat(rawQty.toFixed(2)))).toString();
  }
  if (sym.includes('SOL') || sym.includes('AVAX') || sym.includes('LINK') || sym.includes('NEAR')) {
    return Math.max(0.1, Math.min(500, parseFloat(rawQty.toFixed(1)))).toString();
  }
  if (sym.includes('XRP') || sym.includes('ADA')) {
    return Math.max(1, Math.min(5000, Math.round(rawQty))).toString();
  }
  if (sym.includes('DOGE')) {
    // DOGE on Bybit: round to lot step size 10 and cap between 10 and 10,000
    return Math.max(10, Math.min(10000, Math.round(rawQty / 10) * 10)).toString();
  }
  return Math.max(0.01, Math.min(500, parseFloat(rawQty.toFixed(2)))).toString();
}

/**
 * Map an application timeframe to a Bybit kline interval.
 */
export function resolveBybitInterval(timeframe) {
  const t = String(timeframe || '').toLowerCase();
  if (t.includes('1s') || t.includes('5s')) return '1';
  if (t.includes('1m') || t === '1') return '1';
  if (t.includes('3m') || t === '3') return '3';
  if (t.includes('5m') || t === '5') return '5';
  if (t.includes('15m') || t === '15') return '15';
  if (t.includes('30m') || t === '30') return '30';
  if (t.includes('1h') || t === '60' || t === 'h1') return '60';
  if (t.includes('2h') || t === '120' || t === 'h2') return '120';
  if (t.includes('4h') || t === '240' || t === 'h4') return '240';
  if (t.includes('1d') || t === 'd' || t === 'd1') return 'D';
  if (t.includes('1w') || t === 'w') return 'W';
  return '15';
}

/**
 * Confluence analysis over real Bybit candles.
 *
 * Contract:
 * - never invents a direction or a score;
 * - returns WAIT when the evidence is insufficient;
 * - reports which rules actually fired.
 */
export function analyzeBybitMarketConfluence(candles = [], ticker = null) {
  if (!Array.isArray(candles) || candles.length < 20) {
    return {
      direction: 'WAIT',
      score: null,
      rsi: null,
      reason: 'Insufficient candle history for a confluence decision — waiting for more data.',
      evidence: [],
      slPipsRatio: null,
      tpPipsRatio: null,
    };
  }

  const closes = candles.map((c) => c.c);
  const n = closes.length;
  const currentPrice = closes[n - 1];

  // EMA helper
  const calcEMA = (period) => {
    const p = Math.max(2, Math.min(period, Math.floor(n / 2)));
    const k = 2 / (p + 1);
    let ema = closes.slice(0, p).reduce((a, b) => a + b, 0) / p;
    for (let i = p; i < n; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  };

  const ema20 = calcEMA(20);
  const ema50 = calcEMA(50);
  const isEmaBullish = currentPrice > ema20 && ema20 > ema50;
  const isEmaBearish = currentPrice < ema20 && ema20 < ema50;

  // RSI(14) — simple average of the last 14 changes
  let gains = 0;
  let losses = 0;
  const rsiPeriod = 14;
  for (let i = n - rsiPeriod; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / rsiPeriod;
  const avgLoss = losses / rsiPeriod || 0.0001;
  const rsi = 100 - 100 / (1 + avgGain / avgLoss);

  // Fair Value Gap detection (3-candle imbalance)
  let fvgBullish = false;
  let fvgBearish = false;
  for (let i = n - 5; i < n - 1; i++) {
    if (i >= 2) {
      if (candles[i].l > candles[i - 2].h) fvgBullish = true;
      if (candles[i].h < candles[i - 2].l) fvgBearish = true;
    }
  }

  const recentVol = candles.slice(-3).reduce((a, b) => a + b.v, 0);
  const priorVol = candles.slice(-6, -3).reduce((a, b) => a + b.v, 0);
  const volumeRising = recentVol > priorVol;

  const evidence = [];
  let bullScore = 0;
  let bearScore = 0;

  if (isEmaBullish) {
    bullScore += 25;
    evidence.push('Price above EMA20 and EMA20 above EMA50 (bullish EMA stack).');
  }
  if (isEmaBearish) {
    bearScore += 25;
    evidence.push('Price below EMA20 and EMA20 below EMA50 (bearish EMA stack).');
  }
  if (rsi < 42) {
    bullScore += 20;
    evidence.push(`RSI ${rsi.toFixed(1)} is below 42 (weakening momentum / discount zone).`);
  } else if (rsi > 58) {
    bearScore += 20;
    evidence.push(`RSI ${rsi.toFixed(1)} is above 58 (stretched momentum / premium zone).`);
  } else {
    evidence.push(`RSI ${rsi.toFixed(1)} is neutral.`);
  }
  if (fvgBullish) {
    bullScore += 15;
    evidence.push('A bullish fair value gap was detected in the recent window.');
  }
  if (fvgBearish) {
    bearScore += 15;
    evidence.push('A bearish fair value gap was detected in the recent window.');
  }
  if (volumeRising) {
    if (closes[n - 1] > closes[n - 3]) {
      bullScore += 10;
      evidence.push('Volume is rising into higher closes.');
    } else {
      bearScore += 10;
      evidence.push('Volume is rising into lower closes.');
    }
  } else {
    evidence.push('Volume is not expanding over the last three candles.');
  }
  if (ticker && typeof ticker.pcnt24h === 'number') {
    evidence.push(
      `24h change ${ticker.pcnt24h >= 0 ? '+' : ''}${(ticker.pcnt24h * 100).toFixed(2)}% (context only, not scored).`
    );
  }

  const maxScore = 95; // 25 + 20 + 15 + 10 + 25 (structure) — see note below
  const gap = Math.abs(bullScore - bearScore);
  const score = maxScore - gap; // confluence strength: how far from a tie

  if (gap < 15) {
    return {
      direction: 'WAIT',
      score: Math.round(score),
      rsi: +rsi.toFixed(1),
      reason: `Bullish ${bullScore} vs Bearish ${bearScore} — no clear confluence, standing aside.`,
      evidence,
      slPipsRatio: null,
      tpPipsRatio: null,
    };
  }

  const isBuy = bullScore > bearScore;
  const reason = isBuy
    ? `Bullish confluence ${bullScore} vs ${bearScore} on ${evidence.length} observed rules.`
    : `Bearish confluence ${bearScore} vs ${bullScore} on ${evidence.length} observed rules.`;

  return {
    direction: isBuy ? 'BUY' : 'SELL',
    score: Math.round(score),
    rsi: +rsi.toFixed(1),
    reason,
    evidence,
    slPipsRatio: 0.01,
    tpPipsRatio: 0.024,
  };
}

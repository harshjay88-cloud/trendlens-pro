/**
 * TrendLens Pro — Bybit Demo proxy server.
 *
 * A minimal, dependency-free relay for the small set of authenticated Bybit
 * Demo Trading calls the frontend needs. The browser never holds an API key or
 * secret; it talks to this server, and this server is the only process that
 * can reach the Bybit Demo REST API.
 *
 * Routes (prefix: /api/bybit)
 *   GET  /status              → environment + readiness (never credentials)
 *   GET  /account/balance     → demo wallet balance
 *   GET  /positions           → demo open positions
 *   GET  /orders              → demo orders
 *   GET  /execution           → demo execution history
 *   POST /order               → place a demo order      (gated)
 *   POST /position/close      → close a demo position   (gated)
 *   POST /position/close-all  → close all demo positions(gated)
 *   POST /leverage            → set demo leverage       (gated)
 *
 * "Gated" means: the server-side BYBIT_DEMO_TRADING_ENABLED flag must be true,
 * the request must carry the x-trendlens-confirm header, and (when
 * BYBIT_PROXY_TOKEN is configured) the matching x-trendlens-proxy-token header.
 */

import http from 'node:http';
import { config, hasCredentials } from './config.js';
import {
  BybitError,
  fetchApiInfo,
  fetchExecutions,
  fetchOpenOrders,
  fetchPositions,
  fetchWalletBalance,
  getInstrument,
  createOrder,
  closePosition,
  setLeverage,
} from './bybitClient.js';

const CONFIRM_HEADER = 'x-trendlens-confirm';
const CONFIRM_VALUE = 'DEMO_ORDER';
const TOKEN_HEADER = 'x-trendlens-proxy-token';

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Headers': `Content-Type, ${CONFIRM_HEADER}, ${TOKEN_HEADER}`,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '600',
  });
  res.end(payload);
};

const applyCors = (req, res) => {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new BybitError('Request body too large.', { status: 413, code: 'BODY_TOO_LARGE' }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new BybitError('Invalid JSON body.', { status: 400, code: 'INVALID_JSON' }));
      }
    });
    req.on('error', reject);
  });

/**
 * Guards every route that can mutate the demo account.
 */
const assertMutationAllowed = (req) => {
  if (!config.tradingEnabled) {
    throw new BybitError(
      'Demo order execution is disabled on the server. Set BYBIT_DEMO_TRADING_ENABLED=true to enable it.',
      { status: 403, code: 'TRADING_DISABLED' }
    );
  }
  if (config.proxyToken) {
    const provided = req.headers[TOKEN_HEADER];
    if (provided !== config.proxyToken) {
      throw new BybitError('Missing or invalid proxy token.', {
        status: 401,
        code: 'PROXY_TOKEN_INVALID',
      });
    }
  }
  if (req.headers[CONFIRM_HEADER] !== CONFIRM_VALUE) {
    throw new BybitError(
      'Order confirmation header missing. This request was not sent to Bybit.',
      { status: 400, code: 'CONSENT_REQUIRED' }
    );
  }
};

const route = async (req, res, pathname, body) => {
  const method = req.method.toUpperCase();

  // ── Status ──────────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/status') {
    let account = null;
    if (hasCredentials()) {
      try {
        const info = await fetchApiInfo();
        account = {
          userID: info?.result?.userID ?? info?.userID ?? null,
          readOnly: (info?.result?.readOnly ?? info?.readOnly) === 1,
        };
      } catch (err) {
        account = { error: err.message };
      }
    }
    return json(res, 200, {
      ok: true,
      environment: 'bybit-demo',
      restBase: 'https://api-demo.bybit.com',
      privateWs: 'wss://stream-demo.bybit.com',
      credentialsConfigured: hasCredentials(),
      tradingEnabled: config.tradingEnabled,
      account,
    });
  }

  // ── Demo reads ──────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/account/balance') {
    const result = await fetchWalletBalance();
    return json(res, 200, { ok: true, source: 'bybit-demo', data: result });
  }

  if (method === 'GET' && pathname === '/positions') {
    const result = await fetchPositions();
    const list = Array.isArray(result.list) ? result.list : [];
    return json(res, 200, {
      ok: true,
      source: 'bybit-demo',
      data: { list: list.filter((p) => Number(p.size) > 0) },
    });
  }

  if (method === 'GET' && pathname === '/orders') {
    const result = await fetchOpenOrders();
    return json(res, 200, { ok: true, source: 'bybit-demo', data: result });
  }

  if (method === 'GET' && pathname === '/execution') {
    const url = new URL(req.url, 'http://localhost');
    const limit = url.searchParams.get('limit') || 50;
    const result = await fetchExecutions(limit);
    return json(res, 200, { ok: true, source: 'bybit-demo', data: result });
  }

  // ── Demo mutations (gated) ──────────────────────────────────────────────
  if (method === 'POST' && pathname === '/order') {
    assertMutationAllowed(req);
    const { symbol, side, qty, orderType, takeProfit, stopLoss } = body;

    if (!symbol || !side || !qty) {
      throw new BybitError('symbol, side and qty are required.', {
        status: 400,
        code: 'INVALID_REQUEST',
      });
    }

    const instrument = await getInstrument(symbol);
    if (!instrument) {
      throw new BybitError(`Symbol ${symbol} is not listed on Bybit linear.`, {
        status: 400,
        code: 'UNSUPPORTED_SYMBOL',
      });
    }
    if (instrument.status !== 'Trading') {
      throw new BybitError(`Symbol ${symbol} is not tradable (status: ${instrument.status}).`, {
        status: 400,
        code: 'SYMBOL_NOT_TRADABLE',
      });
    }

    const result = await createOrder({
      symbol,
      side: side === 'buy' ? 'Buy' : 'Sell',
      qty,
      orderType: orderType || 'Market',
      takeProfit,
      stopLoss,
    });

    return json(res, 200, {
      ok: true,
      source: 'bybit-demo',
      acknowledged: true,
      orderId: result.orderId ?? null,
      orderLinkId: result.orderLinkId ?? null,
      orderStatus: result.orderStatus ?? null,
      data: result,
    });
  }

  if (method === 'POST' && pathname === '/position/close') {
    assertMutationAllowed(req);
    const { symbol, qty, side } = body;
    if (!symbol || !qty) {
      throw new BybitError('symbol and qty are required.', {
        status: 400,
        code: 'INVALID_REQUEST',
      });
    }
    const result = await closePosition({
      symbol,
      qty,
      side: side === 'Buy' ? 'Sell' : 'Buy',
    });
    return json(res, 200, {
      ok: true,
      source: 'bybit-demo',
      acknowledged: true,
      orderId: result.orderId ?? null,
      orderStatus: result.orderStatus ?? null,
      data: result,
    });
  }

  if (method === 'POST' && pathname === '/position/close-all') {
    assertMutationAllowed(req);
    const result = await fetchPositions();
    const open = (Array.isArray(result.list) ? result.list : []).filter(
      (p) => Number(p.size) > 0
    );
    const closed = [];
    const failed = [];
    for (const position of open) {
      try {
        const res = await closePosition({
          symbol: position.symbol,
          qty: position.size,
          side: position.side,
        });
        closed.push({ symbol: position.symbol, orderId: res.orderId ?? null });
      } catch (err) {
        failed.push({ symbol: position.symbol, error: err.message });
      }
    }
    return json(res, 200, {
      ok: failed.length === 0,
      source: 'bybit-demo',
      closed,
      failed,
      message: `Closed ${closed.length} of ${open.length} demo positions.`,
    });
  }

  if (method === 'POST' && pathname === '/leverage') {
    assertMutationAllowed(req);
    const { symbol, leverage } = body;
    if (!symbol || !leverage) {
      throw new BybitError('symbol and leverage are required.', {
        status: 400,
        code: 'INVALID_REQUEST',
      });
    }
    const instrument = await getInstrument(symbol);
    if (!instrument) {
      throw new BybitError(`Symbol ${symbol} is not listed on Bybit linear.`, {
        status: 400,
        code: 'UNSUPPORTED_SYMBOL',
      });
    }
    const result = await setLeverage({
      symbol,
      buyLeverage: leverage,
      sellLeverage: leverage,
    });
    return json(res, 200, {
      ok: true,
      source: 'bybit-demo',
      acknowledged: true,
      data: result,
    });
  }

  return json(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Unknown proxy route.' });
};

/**
 * Build the proxy HTTP server without starting it.
 * Exported so the test suite can bind an ephemeral port.
 */
export const createProxyServer = () =>
  http.createServer(async (req, res) => {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Headers': `Content-Type, ${CONFIRM_HEADER}, ${TOKEN_HEADER}`,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '600',
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.replace(/^\/api\/bybit/, '').replace(/\/+$/, '') || '/';

    try {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      await route(req, res, pathname, body);
    } catch (err) {
      const status = err instanceof BybitError ? err.status : 500;
      const code = err instanceof BybitError ? err.code : 'INTERNAL_ERROR';
      // Never log request bodies or headers: they can carry credentials.
      console.error(`[trendlens-proxy] ${req.method} ${pathname} -> ${status} ${code}`);
      json(res, status, { ok: false, code, message: err.message });
    }
  });


import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(here, '..');

// The proxy reads its configuration at import time, so the environment has to
// be set before the module is loaded.
process.env.BYBIT_DEMO_TRADING_ENABLED = 'false';
process.env.BYBIT_DEMO_API_KEY = '';
process.env.BYBIT_DEMO_API_SECRET = '';

const { createProxyServer } = await import(pathToFileURL(path.join(serverDir, 'app.js')).href);

let server;
let base;

before(async () => {
  server = createProxyServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}/api/bybit`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const post = (pathname, body, headers = {}) =>
  fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

describe('proxy status', () => {
  test('reports the demo environment and never returns credentials', async () => {
    const res = await fetch(`${base}/status`);
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.environment, 'bybit-demo');
    assert.equal(payload.restBase, 'https://api-demo.bybit.com');
    assert.equal(payload.privateWs, 'wss://stream-demo.bybit.com');
    assert.equal(payload.credentialsConfigured, false);
    assert.equal(payload.tradingEnabled, false);
    assert.equal('apiKey' in payload, false);
    assert.equal('apiSecret' in payload, false);
  });
});

describe('order execution is disabled by default', () => {
  test('a confirmed order request is refused and nothing reaches Bybit', async () => {
    const res = await post(
      '/order',
      { symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' },
      { 'x-trendlens-confirm': 'DEMO_ORDER' }
    );
    assert.equal(res.status, 403);
    const payload = await res.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.code, 'TRADING_DISABLED');
  });

  test('closing positions is refused too', async () => {
    const res = await post(
      '/position/close',
      { symbol: 'BTCUSDT', qty: '0.001' },
      { 'x-trendlens-confirm': 'DEMO_ORDER' }
    );
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, 'TRADING_DISABLED');
  });

  test('setting leverage is refused too', async () => {
    const res = await post(
      '/leverage',
      { symbol: 'BTCUSDT', leverage: 5 },
      { 'x-trendlens-confirm': 'DEMO_ORDER' }
    );
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, 'TRADING_DISABLED');
  });
});

describe('demo reads require server-side credentials', () => {
  for (const pathname of ['/account/balance', '/positions', '/orders', '/execution']) {
    test(`${pathname} reports missing credentials instead of inventing data`, async () => {
      const res = await fetch(`${base}${pathname}`);
      assert.equal(res.status, 503);
      const payload = await res.json();
      assert.equal(payload.ok, false);
      assert.equal(payload.code, 'MISSING_CREDENTIALS');
      assert.equal(payload.data, undefined);
    });
  }
});

describe('routing', () => {
  test('unknown routes return 404', async () => {
    const res = await fetch(`${base}/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).code, 'NOT_FOUND');
  });
});

describe('endpoint pinning', () => {
  test('the bybit client module contains no mainnet or testnet private base', () => {
    const source = readFileSync(path.join(serverDir, 'bybitClient.js'), 'utf8');
    const privateBases = source.match(/https:\/\/[a-z-]*\.bybit\.com/g) || [];
    const unique = [...new Set(privateBases)];
    assert.deepEqual(unique.sort(), [
      'https://api-demo.bybit.com',
      'https://api.bybit.com',
    ]);
    // The public base may only ever be used for unauthenticated market data.
    const publicUsages = source.split('BYBIT_PUBLIC_REST_BASE').length - 1;
    assert.ok(publicUsages >= 1);
    assert.equal(/requestDemo\([^)]*BYBIT_PUBLIC_REST_BASE/.test(source), false);
  });

  test('no request path lets a client choose the endpoint', () => {
    const source = readFileSync(path.join(serverDir, 'app.js'), 'utf8');
    assert.equal(/req\.query|req\.body\.endpoint|body\.endpoint|body\.base/.test(source), false);
  });
});

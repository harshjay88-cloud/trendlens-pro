import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchBybitTickers,
  fetchBybitKlines,
  placeBybitDemoOrder,
  closeBybitPosition,
  closeAllBybitPositions,
  fetchBybitPositions,
  fetchBybitDemoBalance,
  fetchBybitDemoOrders,
  fetchBybitDemoExecutions,
  testBybitApiConnection,
  analyzeBybitMarketConfluence,
  getBybitProxyBase,
  resolveBybitInterval,
} from '../bybitService.js';

const PROXY = getBybitProxyBase();

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('public market data (unauthenticated, real Bybit)', () => {
  it('returns a success envelope with parsed tickers', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        retCode: 0,
        result: {
          list: [
            {
              symbol: 'BTCUSDT',
              lastPrice: '81000.50',
              price24hPcnt: '0.0123',
              highPrice24h: '82000',
              lowPrice24h: '79000',
              volume24h: '1000',
            },
          ],
        },
      })
    );

    const res = await fetchBybitTickers();
    expect(res.ok).toBe(true);
    expect(res.data.BTCUSDT.price).toBe(81000.5);
    expect(res.source).toBe('bybit-public');
  });

  it('surfaces an upstream failure instead of returning an empty map', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ retCode: 10001, retMsg: 'bad request' }));
    const res = await fetchBybitTickers();
    expect(res.ok).toBe(false);
    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
  });

  it('orders klines oldest → newest', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        retCode: 0,
        result: {
          list: [
            ['2000', '3', '4', '2', '3.5', '10'],
            ['1000', '2', '3', '1', '2.5', '8'],
          ],
        },
      })
    );

    const res = await fetchBybitKlines('BTCUSDT', '15', 50);
    expect(res.ok).toBe(true);
    expect(res.data[0].t).toBe(1000);
    expect(res.data[1].t).toBe(2000);
    expect(res.data[0].c).toBe(2.5);
  });

  it('refuses an unmappable symbol without touching the network', async () => {
    const res = await fetchBybitKlines('NOT A SYMBOL', '15', 50);
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps application timeframes to Bybit intervals', () => {
    expect(resolveBybitInterval('15')).toBe('15');
    expect(resolveBybitInterval('60')).toBe('60');
    expect(resolveBybitInterval('1D')).toBe('D');
  });
});

describe('demo connection probe', () => {
  it('reports an unreachable proxy instead of failing silently', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await testBybitApiConnection();
    expect(res.ok).toBe(false);
    expect(res.code).toBe('PROXY_UNREACHABLE');
  });

  it('reports missing server credentials', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, environment: 'bybit-demo', credentialsConfigured: false })
    );
    const res = await testBybitApiConnection();
    expect(res.ok).toBe(false);
    expect(res.code).toBe('MISSING_CREDENTIALS');
  });

  it('reports a working demo connection', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        environment: 'bybit-demo',
        credentialsConfigured: true,
        tradingEnabled: false,
        account: { userID: 12345, readOnly: false },
      })
    );
    const res = await testBybitApiConnection();
    expect(res.ok).toBe(true);
    expect(res.envType).toBe('demo');
    expect(res.userID).toBe(12345);
    expect(res.tradingEnabled).toBe(false);
  });
});

describe('demo reads go through the proxy', () => {
  it('reads the wallet balance from the proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, source: 'bybit-demo', data: { result: { list: [] } } }));
    const res = await fetchBybitDemoBalance();
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(`${PROXY}/account/balance`);
  });

  it('reads positions from the proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: { list: [] } }));
    const res = await fetchBybitPositions();
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(`${PROXY}/positions`);
  });

  it('reads orders and executions from the proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: { list: [] } }));
    await fetchBybitDemoOrders();
    await fetchBybitDemoExecutions({ limit: 10 });
    expect(fetchMock.mock.calls[0][0]).toBe(`${PROXY}/orders`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${PROXY}/execution?limit=10`);
  });
});

describe('demo order execution', () => {
  it('posts to the proxy with the confirmation header and returns the acknowledged id', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, source: 'bybit-demo', acknowledged: true, orderId: 'order-123', orderStatus: 'New' })
    );

    const res = await placeBybitDemoOrder({
      symbol: 'BTCUSDT',
      side: 'Buy',
      qty: '0.001',
      takeProfit: '90000',
      stopLoss: '70000',
    });

    expect(res.ok).toBe(true);
    expect(res.orderId).toBe('order-123');
    expect(res.acknowledged).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PROXY}/order`);
    expect(init.method).toBe('POST');
    expect(init.headers['x-trendlens-confirm']).toBe('DEMO_ORDER');
    expect(JSON.parse(init.body).symbol).toBe('BTCUSDT');
    expect(JSON.parse(init.body).side).toBe('Buy');
  });

  it('never invents an order id when the proxy rejects the request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: false, code: 'TRADING_DISABLED', message: 'Demo order execution is disabled on the server.' }, 403)
    );

    const res = await placeBybitDemoOrder({ symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
    expect(res.ok).toBe(false);
    expect(res.orderId).toBeNull();
    expect(res.error).toMatch(/disabled on the server/i);
  });

  it('never invents an order id when the proxy is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await placeBybitDemoOrder({ symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
    expect(res.ok).toBe(false);
    expect(res.orderId).toBeNull();
    expect(res.code).toBe('PROXY_UNREACHABLE');
  });

  it('refuses an unmappable symbol without sending anything', async () => {
    const res = await placeBybitDemoOrder({ symbol: 'GOLD FUTURES', side: 'Buy', qty: '1' });
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closes a position through the proxy', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, acknowledged: true, orderId: 'close-1' })
    );
    const res = await closeBybitPosition({ symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
    expect(res.ok).toBe(true);
    expect(res.orderId).toBe('close-1');
    expect(fetchMock.mock.calls[0][0]).toBe(`${PROXY}/position/close`);
  });

  it('closes all positions through the proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, closed: [], failed: [] }));
    const res = await closeAllBybitPositions();
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(`${PROXY}/position/close-all`);
  });

  it('never sends a private request to mainnet or testnet', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: { list: [] } }));
    await fetchBybitPositions();
    await fetchBybitDemoBalance();
    await fetchBybitDemoOrders();
    await fetchBybitDemoExecutions();
    await placeBybitDemoOrder({ symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
    await closeBybitPosition({ symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
    await closeAllBybitPositions();

    for (const [url] of fetchMock.mock.calls) {
      expect(String(url).startsWith(PROXY)).toBe(true);
      expect(String(url)).not.toContain('api.bybit.com');
      expect(String(url)).not.toContain('api-testnet.bybit.com');
    }
  });
});

describe('confluence analysis never fabricates a direction or a floor score', () => {
  const makeCandles = (count, start, step) =>
    Array.from({ length: count }, (_, i) => ({
      t: i,
      o: start + i * step,
      h: start + i * step + step * 0.5,
      l: start + i * step - step * 0.5,
      c: start + (i + 1) * step,
      v: 1000 + i,
    }));

  const makeDownCandles = (count, start, step) =>
    Array.from({ length: count }, (_, i) => {
      const o = start - i * step;
      const c = o - step;
      return {
        t: i,
        o,
        c,
        h: o + step * 0.5,
        l: c - step * 0.5,
        v: 1000 + i,
      };
    });

  it('returns WAIT when there is not enough history', () => {
    const res = analyzeBybitMarketConfluence(makeCandles(10, 100, 1));
    expect(res.direction).toBe('WAIT');
    expect(res.score).toBeNull();
    expect(res.reason).toMatch(/Insufficient candle history/i);
  });

  it('returns WAIT for an empty series', () => {
    expect(analyzeBybitMarketConfluence([]).direction).toBe('WAIT');
  });

  it('does not apply a minimum score floor', () => {
    const res = analyzeBybitMarketConfluence(makeCandles(60, 100, 1));
    expect(res.score).not.toBeNull();
    expect(res.score).toBeLessThan(82);
  });

  it('reports BUY on a clean uptrend and SELL on a clean downtrend', () => {
    const up = analyzeBybitMarketConfluence(makeCandles(60, 100, 2));
    expect(up.direction).toBe('BUY');
    expect(Array.isArray(up.evidence)).toBe(true);
    expect(up.evidence.length).toBeGreaterThan(0);

    const down = analyzeBybitMarketConfluence(makeDownCandles(60, 400, 2));
    expect(down.direction).toBe('SELL');
  });

  it('is deterministic for the same input', () => {
    const candles = makeCandles(60, 100, 2);
    const a = analyzeBybitMarketConfluence(candles);
    const b = analyzeBybitMarketConfluence(candles);
    expect(a.direction).toBe(b.direction);
    expect(a.score).toBe(b.score);
  });
});

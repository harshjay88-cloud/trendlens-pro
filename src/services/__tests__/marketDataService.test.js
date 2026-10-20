import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  BYBIT_PUBLIC_REST_BASE,
  BYBIT_PUBLIC_WS_BASE,
  ERROR_CODES,
  FEED_STATUS,
  createRealtimeCandleFeed,
  feedStatusLabel,
  fetchCandles,
  getFeedStatus,
  klineTopic,
  mergeCandles,
  parseRestKlines,
  parseWsMessage,
  validateInterval,
  validateMarketSymbol,
} from '../marketDataService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');

// ── Helpers ────────────────────────────────────────────────────────────────

/** A Bybit REST kline row: [start, open, high, low, close, volume, turnover]. */
const row = (time, o, h, l, c, v = 100, t = 1000) => [String(time), String(o), String(h), String(l), String(c), String(v), String(t)];

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

/** Minimal WebSocket double. */
class MockWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.sent = [];
    this.closeCalls = 0;
    this.closed = false;
    MockWebSocket.instances.push(this);
  }

  send(payload) {
    this.sent.push(typeof payload === 'string' ? payload : JSON.stringify(payload));
  }

  close() {
    this.closeCalls += 1;
    this.closed = true;
    if (this.onclose) this.onclose({ code: 1000, reason: 'test' });
  }

  // ── test drivers ────────────────────────────────────────────────────────
  open() {
    if (this.onopen) this.onopen();
  }

  emit(payload) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(payload) });
  }

  fail(err) {
    if (this.onerror) this.onerror(err || new Error('socket error'));
  }
}

/** Deterministic timer harness so reconnect/heartbeat behaviour is testable. */
function createTimerHarness() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();

  const schedule = (fn, delay, repeat) => {
    const id = nextId++;
    timers.set(id, { fn, delay, repeat, nextAt: now + delay });
    return id;
  };

  return {
    setTimeoutImpl: (fn, delay) => schedule(fn, delay, false),
    setIntervalImpl: (fn, delay) => schedule(fn, delay, true),
    clearTimeoutImpl: (id) => timers.delete(id),
    clearIntervalImpl: (id) => timers.delete(id),
    get size() {
      return timers.size;
    },
    /** Run every timer whose next execution is due. */
    tick(ms = 1000) {
      now += ms;
      for (const [id, timer] of [...timers.entries()]) {
        while (timer.nextAt <= now) {
          timer.nextAt += timer.delay;
          timer.fn();
        }
      }
    },
  };
}

beforeEach(() => {
  MockWebSocket.instances = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── 1. Valid candle parsing ────────────────────────────────────────────────

describe('candle parsing', () => {
  it('parses a Bybit REST row into a candle', () => {
    const candles = parseRestKlines([row(1700000000000, 100, 110, 90, 105)], {
      interval: '15',
      now: 1700000000000,
    });

    expect(candles).toHaveLength(1);
    expect(candles[0]).toMatchObject({
      time: 1700000000000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 100,
      source: 'bybit-public',
    });
  });

  it('rejects malformed rows instead of producing NaN candles', () => {
    const candles = parseRestKlines(
      [
        ['not-a-time', '1', '2', '3', '4'],
        [String(1700000000000), 'x', '2', '3', '4'],
        [String(1700000000000), '1', '2', '3', '0'],
        [String(1700000000000), '1', '2', '9', '4'],
        row(1700000000000, 1, 2, 0.5, 1.5),
      ],
      { interval: '15', now: 1700000000000 }
    );

    expect(candles).toHaveLength(1);
    expect(candles[0].time).toBe(1700000000000);
  });

  it('parses a websocket kline payload', () => {
    const parsed = parseWsMessage(
      JSON.stringify({
        topic: 'kline.15.BTCUSDT',
        type: 'snapshot',
        ts: 1700000000000,
        data: [
          {
            start: 1700000000000,
            end: 1700000900000,
            interval: '15',
            open: '50000',
            high: '50200',
            low: '49900',
            close: '50100',
            volume: '150.5',
            turnover: '7525000.00',
            confirm: false,
          },
        ],
      })
    );

    expect(parsed.type).toBe('kline');
    expect(parsed.candles).toHaveLength(1);
    expect(parsed.candles[0]).toMatchObject({
      time: 1700000000000,
      open: 50000,
      high: 50200,
      low: 49900,
      close: 50100,
      volume: 150.5,
      confirmed: false,
    });
  });

  it('ignores control frames and unparseable payloads', () => {
    expect(parseWsMessage('{"success":true,"ret_msg":"subscribe","op":"subscribe"}').type).toBe('ack');
    expect(parseWsMessage('{"success":true,"ret_msg":"pong","op":"ping"}').type).toBe('pong');
    expect(parseWsMessage('not json').type).toBe('invalid');
    expect(parseWsMessage('{"topic":"tickers.BTCUSDT","data":{}}').type).toBe('unknown');
    expect(parseWsMessage('{"topic":"kline.15.BTCUSDT","data":[]}').candles).toHaveLength(0);
  });
});

// ── 2. Correct timestamp ordering ──────────────────────────────────────────

describe('timestamp ordering', () => {
  it('returns REST candles oldest → newest even though Bybit returns newest first', () => {
    const candles = parseRestKlines(
      [row(3000, 3, 3, 3, 3), row(1000, 1, 1, 1, 1), row(2000, 2, 2, 2, 2)],
      { interval: '15', now: 4000 }
    );

    expect(candles.map((c) => c.time)).toEqual([1000, 2000, 3000]);
  });

  it('de-duplicates candles that share a start time', () => {
    const candles = parseRestKlines(
      [row(2000, 2, 2, 2, 2), row(1000, 1, 1, 1, 1), row(2000, 2, 2, 2, 2.5)],
      { interval: '15', now: 4000 }
    );

    expect(candles.map((c) => c.time)).toEqual([1000, 2000]);
    expect(candles[1].close).toBe(2.5);
  });

  it('merges two series into one ordered, unique series', () => {
    const existing = [
      { time: 1000, open: 1, high: 1, low: 1, close: 1, volume: 0, confirmed: true },
      { time: 2000, open: 2, high: 2, low: 2, close: 2, volume: 0, confirmed: true },
    ];
    const incoming = [
      { time: 1500, open: 1.5, high: 1.5, low: 1.5, close: 1.5, volume: 0, confirmed: true },
      { time: 2000, open: 2, high: 2, low: 2, close: 2.5, volume: 0, confirmed: true },
    ];

    const merged = mergeCandles(existing, incoming);
    expect(merged.map((c) => c.time)).toEqual([1000, 1500, 2000]);
    expect(merged[2].close).toBe(2.5);
  });
});

// ── 3. Forming candles update without duplicate bars ───────────────────────

describe('forming candle updates', () => {
  it('marks the still-running candle as forming and the closed one as confirmed', () => {
    const interval = 900_000;
    const now = 1_700_000_000_000;
    const formingTime = now - 1000; // started 1s ago, interval has not elapsed
    const closedTime = now - interval - 1000;

    const candles = parseRestKlines(
      [row(formingTime, 1, 2, 0.5, 1.5), row(closedTime, 1, 2, 0.5, 1.4)],
      { interval: '15', now }
    );

    // Chronological order: the closed candle is older, the forming one newer.
    expect(candles.map((c) => c.time)).toEqual([closedTime, formingTime]);
    expect(candles[0].confirmed).toBe(true);
    expect(candles[1].confirmed).toBe(false);
  });

  it('updates the forming candle in place instead of appending a duplicate bar', () => {
    const start = 1_700_000_000_000;
    const snapshot = parseRestKlines([row(start, 100, 100, 100, 100)], {
      interval: '15',
      now: start + 1000,
    });

    const update = {
      time: start,
      open: 100,
      high: 105,
      low: 99,
      close: 104,
      volume: 12,
      confirmed: false,
      source: 'bybit-public',
    };

    const merged = mergeCandles(snapshot, [update]);

    expect(merged).toHaveLength(1);
    expect(merged[0].close).toBe(104);
    expect(merged[0].high).toBe(105);
    expect(merged[0].confirmed).toBe(false);
  });

  it('never re-opens a candle that was already confirmed', () => {
    const closed = { time: 1000, open: 1, high: 2, low: 0.5, close: 1.8, volume: 5, confirmed: true };
    const lateForming = { ...closed, close: 1.2, confirmed: false };

    const merged = mergeCandles([closed], [lateForming]);

    expect(merged).toHaveLength(1);
    expect(merged[0].confirmed).toBe(true);
    expect(merged[0].close).toBe(1.8);
  });
});

// ── 4. Confirmed candles close correctly ───────────────────────────────────

describe('confirmed candles', () => {
  it('marks a websocket candle as confirmed when confirm is true', () => {
    const parsed = parseWsMessage(
      JSON.stringify({
        topic: 'kline.1.BTCUSDT',
        data: [
          {
            start: 1000,
            end: 61000,
            interval: '1',
            open: '50000',
            high: '50100',
            low: '49900',
            close: '50050',
            volume: '10',
            confirm: true,
          },
        ],
      })
    );

    expect(parsed.candles[0].confirmed).toBe(true);
  });

  it('closes the bar when the exchange sends confirm:true and opens the next one separately', () => {
    const forming = {
      time: 1000, open: 100, high: 101, low: 99, close: 100.5, volume: 1, confirmed: false,
    };
    const closed = { ...forming, high: 102, close: 101.5, confirmed: true };

    const afterConfirm = mergeCandles([forming], [closed]);
    expect(afterConfirm).toHaveLength(1);
    expect(afterConfirm[0].confirmed).toBe(true);
    expect(afterConfirm[0].close).toBe(101.5);

    const nextBar = {
      time: 61000, open: 101.5, high: 102, low: 101, close: 101.8, volume: 2, confirmed: false,
    };
    const afterNext = mergeCandles(afterConfirm, [nextBar]);
    expect(afterNext).toHaveLength(2);
    expect(afterNext.map((c) => c.time)).toEqual([1000, 61000]);
  });
});

// ── 5. Invalid symbols are rejected ────────────────────────────────────────

describe('symbol and timeframe validation', () => {
  it('accepts the instruments the app offers', () => {
    expect(validateMarketSymbol('BTC/USDT').symbol).toBe('BTCUSDT');
    expect(validateMarketSymbol('XAU/USD').symbol).toBe('XAUUSDT');
    expect(validateMarketSymbol('EUR/USD').symbol).toBe('EURUSDUSDT');
    expect(validateMarketSymbol('USD/JPY').symbol).toBe('USDJPYUSDT');
    expect(validateMarketSymbol('BTCUSDT').symbol).toBe('BTCUSDT');
  });

  it('rejects an instrument Bybit does not list', () => {
    const result = validateMarketSymbol('NASDAQ 100');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.UNSUPPORTED_SYMBOL);
  });

  it('rejects an empty symbol', () => {
    expect(validateMarketSymbol('').ok).toBe(false);
    expect(validateMarketSymbol(undefined).ok).toBe(false);
  });

  it('rejects an unsupported timeframe', () => {
    expect(validateInterval('15').ok).toBe(true);
    expect(validateInterval('D').ok).toBe(true);
    expect(validateInterval('7').ok).toBe(false);
    expect(validateInterval('').ok).toBe(false);
    expect(validateInterval('7').code).toBe(ERROR_CODES.INVALID_INTERVAL);
  });

  it('never requests anything for an invalid symbol', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchCandles({ symbol: 'NASDAQ 100', interval: '15', fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.UNSUPPORTED_SYMBOL);
    expect(result.candles).toHaveLength(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never requests anything for an invalid timeframe', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchCandles({ symbol: 'BTCUSDT', interval: '7', fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.INVALID_INTERVAL);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

// ── REST behaviour ─────────────────────────────────────────────────────────

describe('fetchCandles', () => {
  it('requests the public kline endpoint and returns chronological candles', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        retCode: 0,
        result: {
          list: [row(2000, 2, 2, 2, 2), row(1000, 1, 1, 1, 1)],
        },
      })
    );

    const result = await fetchCandles({ symbol: 'BTCUSDT', interval: '15', limit: 50, fetchImpl });

    expect(result.ok).toBe(true);
    expect(result.candles.map((c) => c.time)).toEqual([1000, 2000]);
    expect(result.source).toBe('bybit-public');
    expect(result.status).toBe(FEED_STATUS.LIVE);

    const url = fetchImpl.mock.calls[0][0];
    expect(url.startsWith(`${BYBIT_PUBLIC_REST_BASE}/v5/market/kline`)).toBe(true);
    expect(url).toContain('symbol=BTCUSDT');
    expect(url).toContain('interval=15');
    expect(url).toContain('limit=50');
  });

  it('reports an unreachable endpoint without inventing candles', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await fetchCandles({ symbol: 'BTCUSDT', interval: '15', fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.UPSTREAM_UNREACHABLE);
    expect(result.candles).toHaveLength(0);
    expect(result.status).toBe(FEED_STATUS.DISCONNECTED);
  });

  it('reports a Bybit rejection', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ retCode: 10001, retMsg: 'bad symbol' }));
    const result = await fetchCandles({ symbol: 'BTCUSDT', interval: '15', fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.BYBIT_REJECTED);
    expect(result.candles).toHaveLength(0);
  });

  it('reports an empty series', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ retCode: 0, result: { list: [] } }));
    const result = await fetchCandles({ symbol: 'BTCUSDT', interval: '15', fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.EMPTY_SERIES);
    expect(result.candles).toHaveLength(0);
  });
});

// ── 6. Disconnects do not generate fake prices ─────────────────────────────

describe('websocket feed', () => {
  const klineFrame = (close, confirm = false, start = 1000) => ({
    topic: 'kline.15.BTCUSDT',
    type: 'snapshot',
    data: [
      {
        start,
        end: start + 900000,
        interval: '15',
        open: '100',
        high: '110',
        low: '90',
        close: String(close),
        volume: '10',
        confirm,
      },
    ],
  });

  it('subscribes to the public kline topic on open', () => {
    const timers = createTimerHarness();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      ...timers,
    });

    feed.start();
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(BYBIT_PUBLIC_WS_BASE);

    MockWebSocket.instances[0].open();
    const subscribeFrame = JSON.parse(MockWebSocket.instances[0].sent[0]);
    expect(subscribeFrame).toEqual({ op: 'subscribe', args: ['kline.15.BTCUSDT'] });

    feed.stop();
  });

  it('emits candles and reports LIVE when a kline frame arrives', () => {
    const timers = createTimerHarness();
    const onCandles = vi.fn();
    const onStatus = vi.fn();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      onCandles,
      onStatus,
      ...timers,
    });

    feed.start();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].emit(klineFrame(105));

    expect(onCandles).toHaveBeenCalledTimes(1);
    expect(onCandles.mock.calls[0][0][0]).toMatchObject({ close: 105, confirmed: false });
    expect(onStatus).toHaveBeenCalledWith(FEED_STATUS.LIVE);

    feed.stop();
  });

  it('never emits a candle when the socket errors or closes', () => {
    const timers = createTimerHarness();
    const onCandles = vi.fn();
    const onStatus = vi.fn();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      onCandles,
      onStatus,
      ...timers,
    });

    feed.start();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].fail(new Error('socket failure'));
    MockWebSocket.instances[0].close();

    expect(onCandles).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith(FEED_STATUS.RECONNECTING);

    feed.stop();
  });

  it('reconnects after an unexpected close and re-subscribes', () => {
    const timers = createTimerHarness();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      reconnectDelayMs: 1000,
      ...timers,
    });

    feed.start();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].close();

    expect(MockWebSocket.instances).toHaveLength(1);

    timers.tick(1500);
    expect(MockWebSocket.instances).toHaveLength(2);

    MockWebSocket.instances[1].open();
    expect(JSON.parse(MockWebSocket.instances[1].sent[0])).toEqual({
      op: 'subscribe',
      args: ['kline.15.BTCUSDT'],
    });

    feed.stop();
  });

  it('cleans up: unsubscribes, closes the socket and releases every timer', () => {
    const timers = createTimerHarness();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      ...timers,
    });

    feed.start();
    MockWebSocket.instances[0].open();
    expect(timers.size).toBeGreaterThan(0); // heartbeat timer is running

    feed.stop();

    const socket = MockWebSocket.instances[0];
    expect(socket.closeCalls).toBe(1);
    const unsubscribe = socket.sent.map((s) => JSON.parse(s)).find((m) => m.op === 'unsubscribe');
    expect(unsubscribe).toEqual({ op: 'unsubscribe', args: ['kline.15.BTCUSDT'] });
    expect(timers.size).toBe(0);
  });

  it('does not reconnect after stop()', () => {
    const timers = createTimerHarness();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      reconnectDelayMs: 1000,
      ...timers,
    });

    feed.start();
    MockWebSocket.instances[0].open();
    feed.stop();

    timers.tick(5000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('sends a heartbeat ping on the configured interval', () => {
    const timers = createTimerHarness();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      heartbeatMs: 20000,
      ...timers,
    });

    feed.start();
    MockWebSocket.instances[0].open();

    timers.tick(21000);
    const pings = MockWebSocket.instances[0].sent.map((s) => JSON.parse(s)).filter((m) => m.op === 'ping');
    expect(pings.length).toBeGreaterThanOrEqual(1);

    feed.stop();
  });

  it('refuses to open a feed for an invalid symbol', () => {
    const timers = createTimerHarness();
    const onStatus = vi.fn();
    const feed = createRealtimeCandleFeed({
      symbol: 'NASDAQ 100',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      onStatus,
      ...timers,
    });

    feed.start();
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(onStatus).toHaveBeenCalledWith(FEED_STATUS.DISCONNECTED);
  });
});

// ── 7. Stale market data is visibly identified ──────────────────────────────

describe('feed freshness', () => {
  it('reports LIVE while messages keep arriving', () => {
    expect(getFeedStatus(1000, 1000 + 5000, 15000, true)).toBe(FEED_STATUS.LIVE);
  });

  it('reports STALE when the last message is older than the stale window', () => {
    expect(getFeedStatus(1000, 1000 + 20000, 15000, true)).toBe(FEED_STATUS.STALE);
  });

  it('reports DISCONNECTED when the socket is not connected', () => {
    expect(getFeedStatus(1000, 1000 + 100, 15000, false)).toBe(FEED_STATUS.DISCONNECTED);
  });

  it('reports CONNECTING before the first message arrives', () => {
    expect(getFeedStatus(null, 1000, 15000, true)).toBe(FEED_STATUS.CONNECTING);
  });

  it('exposes a human readable label for every state', () => {
    expect(feedStatusLabel(FEED_STATUS.LIVE)).toBe('LIVE');
    expect(feedStatusLabel(FEED_STATUS.STALE)).toBe('STALE');
    expect(feedStatusLabel(FEED_STATUS.DISCONNECTED)).toBe('DISCONNECTED');
    expect(feedStatusLabel(FEED_STATUS.RECONNECTING)).toBe('RECONNECTING');
  });

  it('reports the feed state from the live feed object', () => {
    const timers = createTimerHarness();
    const feed = createRealtimeCandleFeed({
      symbol: 'BTCUSDT',
      interval: '15',
      WebSocketImpl: MockWebSocket,
      now: () => 1000,
      ...timers,
    });

    feed.start();
    expect(feed.getState().status).toBe(FEED_STATUS.CONNECTING);

    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].emit({
      topic: 'kline.15.BTCUSDT',
      data: [
        { start: 1000, end: 910000, interval: '15', open: '1', high: '2', low: '0.5', close: '1.5', volume: '1', confirm: false },
      ],
    });

    expect(feed.getState().status).toBe(FEED_STATUS.LIVE);
    expect(feed.getState().lastMessageAt).toBe(1000);

    feed.stop();
    expect(feed.getState().status).toBe(FEED_STATUS.DISCONNECTED);
  });
});

// ── 8 & 10. Chart integration and "no private requests" guarantees ─────────

describe('chart integration', () => {
  const chartPath = path.join(repoRoot, 'src', 'components', 'common', 'TrendLensUltraChart.jsx');
  const chartSource = readFileSync(chartPath, 'utf8');

  it('loads candles through the public market data service', () => {
    expect(chartSource).toContain("from '../../services/marketDataService.js'");
    expect(chartSource).toContain('await fetchCandles(');
  });

  it('no longer contains an inline synthetic candle generator', () => {
    expect(chartSource).not.toContain('synthBars');
    expect(chartSource).not.toContain('High-fidelity multi-year macroeconomic price cycle generator');
  });

  it('never mixes a REST poll and the websocket into two price sources', () => {
    // The old 2.5s REST "live candle syncer" is gone.
    expect(chartSource).not.toContain('syncLiveMarket');
  });

  it('keeps simulated data in its own module', () => {
    const simulationPath = path.join(repoRoot, 'src', 'services', 'simulationData.js');
    const simulationSource = readFileSync(simulationPath, 'utf8');
    expect(simulationSource).toContain("source: 'simulation'");
    expect(chartSource).toContain("from '../../services/simulationData.js'");
  });

  it('uses the public websocket and never a private one', () => {
    expect(chartSource).toContain('createRealtimeCandleFeed');
    expect(chartSource).not.toContain('stream.bybit.com/v5/private');
  });
});

describe('no authenticated exchange access', () => {
  it('the market data service contains no private endpoint and no signing', () => {
    const source = readFileSync(
      path.join(repoRoot, 'src', 'services', 'marketDataService.js'),
      'utf8'
    );
    expect(source).not.toContain('X-BAPI-API-KEY');
    expect(source).not.toContain('X-BAPI-SIGN');
    expect(source).not.toContain('v5/order');
    expect(source).not.toContain('v5/position');
    expect(source).not.toContain('/v5/private');
    expect(source).not.toContain('api-demo.bybit.com');
  });

  it('builds only public kline topics', () => {
    expect(klineTopic('BTCUSDT', '15')).toBe('kline.15.BTCUSDT');
    expect(BYBIT_PUBLIC_WS_BASE).toBe('wss://stream.bybit.com/v5/public/linear');
  });

  it('the phase 0 trading gate is still closed by default', () => {
    const modeStore = readFileSync(
      path.join(repoRoot, 'src', 'store', 'tradingModeStore.js'),
      'utf8'
    );
    expect(modeStore).toContain('autoTradeEnabled: false');
    expect(modeStore).toContain('orderConsentGiven: false');
  });
});

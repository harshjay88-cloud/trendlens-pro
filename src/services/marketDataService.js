/**
 * TrendLens Pro — Public market data service.
 *
 * This module is the SINGLE source of candles for the application.
 *
 * It talks to Bybit's PUBLIC, UNAUTHENTICATED market-data endpoints only:
 *   REST : GET https://api.bybit.com/v5/market/kline
 *   WS   : wss://stream.bybit.com/v5/public/linear   topic kline.{interval}.{symbol}
 *
 * It never performs a private (authenticated) request, never signs anything
 * and never places an order.
 *
 * Design rules enforced here:
 *  - candles are always returned in ascending chronological order;
 *  - a candle is uniquely keyed by its start time, so updates never duplicate
 *    a bar;
 *  - a closed candle is never re-opened by a later forming update;
 *  - failures are reported as failures. Nothing is synthesised to hide them.
 *
 * Every network dependency is injectable so the whole module can be tested
 * with mocked REST responses and mocked WebSocket messages.
 */

import { resolveBybitSymbol } from '../config/tradingMode.js';

export const BYBIT_PUBLIC_REST_BASE = 'https://api.bybit.com';
export const BYBIT_PUBLIC_WS_BASE = 'wss://stream.bybit.com/v5/public/linear';
export const BYBIT_PUBLIC_CATEGORY = 'linear';

/** Kline intervals supported by Bybit v5. */
export const BYBIT_KLINE_INTERVALS = Object.freeze([
  '1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W', 'M',
]);

/** Duration of each interval in milliseconds. */
export const INTERVAL_MS = Object.freeze({
  '1': 60_000,
  '3': 180_000,
  '5': 300_000,
  '15': 900_000,
  '30': 1_800_000,
  '60': 3_600_000,
  '120': 7_200_000,
  '240': 14_400_000,
  '360': 21_600_000,
  '720': 43_200_000,
  'D': 86_400_000,
  'W': 604_800_000,
  'M': 2_592_000_000,
});

export const FEED_STATUS = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  CONNECTING: 'CONNECTING',
  LIVE: 'LIVE',
  STALE: 'STALE',
  RECONNECTING: 'RECONNECTING',
  DISCONNECTED: 'DISCONNECTED',
});

/** A feed with no message for this long is considered stale. */
export const STALE_AFTER_MS = 15_000;

export const ERROR_CODES = Object.freeze({
  UNSUPPORTED_SYMBOL: 'UNSUPPORTED_SYMBOL',
  INVALID_INTERVAL: 'INVALID_INTERVAL',
  UPSTREAM_UNREACHABLE: 'UPSTREAM_UNREACHABLE',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  BAD_UPSTREAM_RESPONSE: 'BAD_UPSTREAM_RESPONSE',
  BYBIT_REJECTED: 'BYBIT_REJECTED',
  EMPTY_SERIES: 'EMPTY_SERIES',
  INVALID_CANDLE: 'INVALID_CANDLE',
});

const SOURCE = 'bybit-public';

const toNumber = (value) => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate and normalise a market symbol for Bybit linear perpetuals.
 * @returns {{ ok: boolean, symbol: string, code: string, message: string }}
 */
export function validateMarketSymbol(input) {
  const resolved = resolveBybitSymbol(input);
  if (!resolved.ok) {
    return { ok: false, symbol: '', code: ERROR_CODES.UNSUPPORTED_SYMBOL, message: resolved.message };
  }
  if (!/^[A-Z0-9]{3,20}USDT$/.test(resolved.symbol)) {
    return {
      ok: false,
      symbol: '',
      code: ERROR_CODES.UNSUPPORTED_SYMBOL,
      message: `Symbol "${input}" does not map to a Bybit USDT perpetual.`,
    };
  }
  return { ok: true, symbol: resolved.symbol, code: 'OK', message: 'Resolved.' };
}

/**
 * Validate a kline interval.
 * @returns {{ ok: boolean, interval: string, code: string, message: string }}
 */
export function validateInterval(interval) {
  const value = String(interval ?? '').trim().toUpperCase();
  if (!value) {
    return { ok: false, interval: '', code: ERROR_CODES.INVALID_INTERVAL, message: 'No timeframe supplied.' };
  }
  if (!BYBIT_KLINE_INTERVALS.includes(value)) {
    return {
      ok: false,
      interval: '',
      code: ERROR_CODES.INVALID_INTERVAL,
      message: `Timeframe "${interval}" is not supported by Bybit. Supported: ${BYBIT_KLINE_INTERVALS.join(', ')}.`,
    };
  }
  return { ok: true, interval: value, code: 'OK', message: 'Resolved.' };
}

/**
 * Build the public WebSocket topic for a kline stream.
 */
export function klineTopic(symbol, interval) {
  return `kline.${interval}.${symbol}`;
}

// ── Candle normalisation ───────────────────────────────────────────────────

/**
 * Normalise one REST kline row.
 * Bybit rows are: [start, open, high, low, close, volume, turnover].
 */
export function normalizeRestKline(row, { interval, now }) {
  if (!Array.isArray(row) || row.length < 6) return null;

  const time = toNumber(row[0]);
  const open = toNumber(row[1]);
  const high = toNumber(row[2]);
  const low = toNumber(row[3]);
  const close = toNumber(row[4]);
  const volume = toNumber(row[5]);

  if (time === null || time <= 0) return null;
  if (open === null || high === null || low === null || close === null) return null;
  if (open <= 0 || high <= 0 || low <= 0 || close <= 0) return null;
  if (high < low) return null;

  const intervalMs = INTERVAL_MS[interval] ?? 0;
  // A candle whose interval has not elapsed yet is still forming.
  const confirmed = intervalMs > 0 ? time + intervalMs <= now : true;

  return {
    time,
    open,
    high,
    low,
    close,
    volume: volume ?? 0,
    turnover: toNumber(row[6]) ?? 0,
    confirmed,
    source: SOURCE,
  };
}

/**
 * Normalise one WebSocket kline object.
 */
export function normalizeWsKline(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const time = toNumber(raw.start);
  const open = toNumber(raw.open);
  const high = toNumber(raw.high);
  const low = toNumber(raw.low);
  const close = toNumber(raw.close);

  if (time === null || time <= 0) return null;
  if (open === null || high === null || low === null || close === null) return null;
  if (open <= 0 || high <= 0 || low <= 0 || close <= 0) return null;
  if (high < low) return null;

  return {
    time,
    open,
    high,
    low,
    close,
    volume: toNumber(raw.volume) ?? 0,
    turnover: toNumber(raw.turnover) ?? 0,
    confirmed: raw.confirm === true,
    source: SOURCE,
  };
}

/**
 * Parse a Bybit REST kline list into chronological, de-duplicated candles.
 * Bybit returns the newest candle first; this always returns oldest → newest.
 */
export function parseRestKlines(rows, { interval, now = Date.now() } = {}) {
  if (!Array.isArray(rows)) return [];
  const candles = [];
  for (const row of rows) {
    const candle = normalizeRestKline(row, { interval, now });
    if (candle) candles.push(candle);
  }
  return mergeCandles([], candles);
}

/**
 * Merge candle sets, keyed by start time.
 * Incoming candles win, EXCEPT that a confirmed candle is never downgraded
 * back to forming by a later update.
 * The result is always chronologically ordered and free of duplicates.
 */
export function mergeCandles(existing = [], incoming = []) {
  const map = new Map();
  for (const candle of existing) {
    if (candle && Number.isFinite(candle.time)) map.set(candle.time, candle);
  }
  for (const candle of incoming) {
    if (!candle || !Number.isFinite(candle.time)) continue;
    const previous = map.get(candle.time);
    if (previous && previous.confirmed && !candle.confirmed) continue;
    map.set(candle.time, candle);
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

// ── REST ───────────────────────────────────────────────────────────────────

/**
 * Fetch historical candles from the public Bybit REST endpoint.
 *
 * @param {object} options
 * @param {string} options.symbol        e.g. 'BTC/USDT' or 'BTCUSDT'
 * @param {string} options.interval      e.g. '15'
 * @param {number} [options.limit=200]   1..1000
 * @param {Function} [options.fetchImpl] injectable fetch
 * @param {number} [options.now]         injectable clock (ms)
 */
export async function fetchCandles({
  symbol,
  interval,
  limit = 200,
  fetchImpl = globalThis.fetch,
  now = Date.now(),
} = {}) {
  const symbolCheck = validateMarketSymbol(symbol);
  if (!symbolCheck.ok) {
    return {
      ok: false,
      code: symbolCheck.code,
      error: symbolCheck.message,
      candles: [],
      status: FEED_STATUS.DISCONNECTED,
      source: SOURCE,
    };
  }

  const intervalCheck = validateInterval(interval);
  if (!intervalCheck.ok) {
    return {
      ok: false,
      code: intervalCheck.code,
      error: intervalCheck.message,
      candles: [],
      status: FEED_STATUS.DISCONNECTED,
      source: SOURCE,
    };
  }

  const capped = Math.min(1000, Math.max(1, Math.floor(Number(limit) || 200)));
  const url = `${BYBIT_PUBLIC_REST_BASE}/v5/market/kline?category=${BYBIT_PUBLIC_CATEGORY}` +
    `&symbol=${symbolCheck.symbol}&interval=${intervalCheck.interval}&limit=${capped}`;

  let response;
  try {
    response = await fetchImpl(url);
  } catch (err) {
    return {
      ok: false,
      code: ERROR_CODES.UPSTREAM_UNREACHABLE,
      error: `The Bybit public market data endpoint is unreachable: ${err.message}`,
      candles: [],
      status: FEED_STATUS.DISCONNECTED,
      source: SOURCE,
    };
  }

  if (!response || !response.ok) {
    const status = response ? response.status : 0;
    return {
      ok: false,
      code: ERROR_CODES.UPSTREAM_ERROR,
      error: `The Bybit public market data endpoint returned HTTP ${status}.`,
      candles: [],
      status: FEED_STATUS.DISCONNECTED,
      source: SOURCE,
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      ok: false,
      code: ERROR_CODES.BAD_UPSTREAM_RESPONSE,
      error: `The Bybit public market data endpoint returned an unreadable response: ${err.message}`,
      candles: [],
      status: FEED_STATUS.DISCONNECTED,
      source: SOURCE,
    };
  }

  if (!payload || payload.retCode !== 0) {
    return {
      ok: false,
      code: ERROR_CODES.BYBIT_REJECTED,
      error: payload?.retMsg || `Bybit rejected the kline request (retCode ${payload?.retCode}).`,
      candles: [],
      status: FEED_STATUS.DISCONNECTED,
      source: SOURCE,
    };
  }

  const candles = parseRestKlines(payload.result?.list, {
    interval: intervalCheck.interval,
    now,
  });

  if (candles.length === 0) {
    return {
      ok: false,
      code: ERROR_CODES.EMPTY_SERIES,
      error: `Bybit returned no usable candles for ${symbolCheck.symbol} (${intervalCheck.interval}).`,
      candles: [],
      status: FEED_STATUS.DISCONNECTED,
      source: SOURCE,
    };
  }

  return {
    ok: true,
    code: 'OK',
    error: null,
    symbol: symbolCheck.symbol,
    interval: intervalCheck.interval,
    candles,
    fetchedAt: now,
    status: FEED_STATUS.LIVE,
    source: SOURCE,
  };
}

// ── WebSocket ──────────────────────────────────────────────────────────────

/**
 * Parse a raw WebSocket frame from the public Bybit stream.
 * @returns {{ type: string, candles: Array, topic: string, success: boolean }}
 */
export function parseWsMessage(raw) {
  let message;
  try {
    message = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { type: 'invalid', candles: [], topic: '', success: false };
  }
  if (!message || typeof message !== 'object') {
    return { type: 'invalid', candles: [], topic: '', success: false };
  }

  // Control frames: subscribe acknowledgements and pong replies.
  if (message.op) {
    const isPong = message.op === 'pong' || message.ret_msg === 'pong';
    return {
      type: isPong ? 'pong' : 'ack',
      candles: [],
      topic: '',
      success: message.success !== false,
    };
  }

  if (typeof message.topic !== 'string' || !message.topic.startsWith('kline.')) {
    return { type: 'unknown', candles: [], topic: message.topic || '', success: true };
  }

  const rows = Array.isArray(message.data) ? message.data : [];
  const candles = rows.map(normalizeWsKline).filter(Boolean);

  return {
    type: 'kline',
    candles,
    topic: message.topic,
    snapshotType: message.type || 'snapshot',
    success: true,
  };
}

/**
 * Create a public WebSocket kline feed.
 *
 * The feed owns its socket, heartbeat and reconnect timer. `stop()` releases
 * every listener, timer and subscription.
 *
 * @param {object} options
 * @param {Function} [options.WebSocketImpl] injectable WebSocket constructor
 */
export function createRealtimeCandleFeed({
  symbol,
  interval,
  url = BYBIT_PUBLIC_WS_BASE,
  WebSocketImpl = globalThis.WebSocket,
  onCandles = () => {},
  onStatus = () => {},
  onError = () => {},
  heartbeatMs = 20_000,
  reconnectDelayMs = 3_000,
  maxReconnectDelayMs = 30_000,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
  now = () => Date.now(),
} = {}) {
  const symbolCheck = validateMarketSymbol(symbol);
  const intervalCheck = validateInterval(interval);
  const topic = symbolCheck.ok && intervalCheck.ok
    ? klineTopic(symbolCheck.symbol, intervalCheck.interval)
    : '';

  let socket = null;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let stopped = true;
  let reconnectAttempts = 0;
  let lastMessageAt = null;
  let connected = false;
  let status = FEED_STATUS.IDLE;

  const setStatus = (next) => {
    if (status === next) return;
    status = next;
    onStatus(next);
  };

  const clearTimers = () => {
    if (heartbeatTimer !== null) {
      clearIntervalImpl(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (reconnectTimer !== null) {
      clearTimeoutImpl(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const send = (message) => {
    if (!socket) return false;
    try {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    connected = false;
    setStatus(FEED_STATUS.RECONNECTING);
    const delay = Math.min(maxReconnectDelayMs, reconnectDelayMs * 2 ** reconnectAttempts);
    reconnectAttempts += 1;
    reconnectTimer = setTimeoutImpl(() => {
      reconnectTimer = null;
      open();
    }, delay);
  };

  const open = () => {
    if (stopped) return;
    if (!topic) {
      setStatus(FEED_STATUS.DISCONNECTED);
      return;
    }
    if (typeof WebSocketImpl !== 'function') {
      onError(new Error('No WebSocket implementation is available in this environment.'));
      setStatus(FEED_STATUS.DISCONNECTED);
      return;
    }

    setStatus(reconnectAttempts > 0 ? FEED_STATUS.RECONNECTING : FEED_STATUS.CONNECTING);

    try {
      socket = new WebSocketImpl(url);
    } catch (err) {
      onError(err);
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      if (stopped) return;
      connected = true;
      reconnectAttempts = 0;
      send({ op: 'subscribe', args: [topic] });

      heartbeatTimer = setIntervalImpl(() => {
        send({ op: 'ping' });
      }, heartbeatMs);
    };

    socket.onmessage = (event) => {
      if (stopped) return;
      const raw = typeof event === 'string' ? event : event?.data;
      const parsed = parseWsMessage(raw);
      if (parsed.type === 'kline' && parsed.candles.length) {
        lastMessageAt = now();
        onCandles(parsed.candles, { topic: parsed.topic, snapshotType: parsed.snapshotType });
        setStatus(FEED_STATUS.LIVE);
      }
    };

    socket.onerror = (event) => {
      // An error never produces a candle. It only reports a problem.
      onError(event instanceof Error ? event : new Error('WebSocket error'));
    };

    socket.onclose = () => {
      connected = false;
      if (heartbeatTimer !== null) {
        clearIntervalImpl(heartbeatTimer);
        heartbeatTimer = null;
      }
      socket = null;
      if (stopped) {
        setStatus(FEED_STATUS.DISCONNECTED);
        return;
      }
      scheduleReconnect();
    };
  };

  return {
    topic,

    start() {
      if (!stopped) return;
      stopped = false;
      status = FEED_STATUS.IDLE;
      open();
    },

    /** Release the subscription, the socket, the heartbeat and the timers. */
    stop() {
      stopped = true;
      connected = false;
      clearTimers();
      if (socket) {
        try {
          if (topic) socket.send(JSON.stringify({ op: 'unsubscribe', args: [topic] }));
        } catch {
          /* the socket may already be gone */
        }
        try {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          socket.close();
        } catch {
          /* ignore */
        }
        socket = null;
      }
      setStatus(FEED_STATUS.DISCONNECTED);
    },

    getState() {
      let current = status;
      if (!stopped && current === FEED_STATUS.LIVE) {
        current = getFeedStatus(lastMessageAt, now(), STALE_AFTER_MS, connected);
      }
      return {
        status: current,
        lastMessageAt,
        connected,
        reconnectAttempts,
        topic,
      };
    },
  };
}

/**
 * Derive the feed status from freshness and connectivity.
 * @returns {string} one of FEED_STATUS
 */
export function getFeedStatus(lastMessageAt, now = Date.now(), staleAfterMs = STALE_AFTER_MS, connected = true) {
  if (!connected) return FEED_STATUS.DISCONNECTED;
  if (lastMessageAt === null || lastMessageAt === undefined) return FEED_STATUS.CONNECTING;
  if (now - lastMessageAt > staleAfterMs) return FEED_STATUS.STALE;
  return FEED_STATUS.LIVE;
}

/**
 * Human-readable label for a feed status.
 */
export function feedStatusLabel(status) {
  switch (status) {
    case FEED_STATUS.LIVE:
      return 'LIVE';
    case FEED_STATUS.STALE:
      return 'STALE';
    case FEED_STATUS.CONNECTING:
    case FEED_STATUS.LOADING:
      return 'CONNECTING';
    case FEED_STATUS.RECONNECTING:
      return 'RECONNECTING';
    case FEED_STATUS.DISCONNECTED:
      return 'DISCONNECTED';
    default:
      return 'IDLE';
  }
}

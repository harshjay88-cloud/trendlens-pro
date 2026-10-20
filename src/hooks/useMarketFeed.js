import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FEED_STATUS,
  createRealtimeCandleFeed,
  fetchCandles,
  getFeedStatus,
  mergeCandles,
  validateInterval,
  validateMarketSymbol,
  STALE_AFTER_MS,
} from '../services/marketDataService.js';

/**
 * useMarketFeed — one authoritative candle stream for a component.
 *
 * The hook owns:
 *  - the historical snapshot fetched from the public Bybit REST endpoint;
 *  - the public WebSocket kline subscription that keeps the last candle fresh;
 *  - the LIVE / STALE / DISCONNECTED state derived from message freshness.
 *
 * It never synthesises candles. When the exchange cannot be reached the
 * returned `candles` array is empty and `status` reports the failure.
 *
 * @param {object} options
 * @param {string} options.symbol        e.g. 'BTC/USD'
 * @param {string} options.interval      e.g. '15'
 * @param {number} [options.limit=200]   number of historical bars
 * @param {boolean} [options.enabled=true]
 */
export default function useMarketFeed({
  symbol,
  interval,
  limit = 200,
  enabled = true,
  WebSocketImpl,
  fetchImpl,
  staleAfterMs = STALE_AFTER_MS,
} = {}) {
  const [candles, setCandles] = useState([]);
  const [status, setStatus] = useState(FEED_STATUS.IDLE);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const candlesRef = useRef([]);
  const feedRef = useRef(null);
  const lastMessageRef = useRef(null);

  const symbolCheck = useMemo(() => validateMarketSymbol(symbol), [symbol]);
  const intervalCheck = useMemo(() => validateInterval(interval), [interval]);
  const isValid = symbolCheck.ok && intervalCheck.ok;

  const applyCandles = useCallback((incoming) => {
    const merged = mergeCandles(candlesRef.current, incoming);
    candlesRef.current = merged;
    setCandles(merged);
  }, []);

  // ── Historical snapshot ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isValid) {
      candlesRef.current = [];
      setCandles([]);
      setIsLoading(false);
      setLastUpdated(null);
      lastMessageRef.current = null;
      if (!enabled) {
        setStatus(FEED_STATUS.IDLE);
        setError(null);
      } else {
        setStatus(FEED_STATUS.DISCONNECTED);
        setError(
          symbolCheck.ok
            ? intervalCheck.message
            : symbolCheck.message
        );
      }
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setStatus(FEED_STATUS.LOADING);
    setError(null);

    fetchCandles({
      symbol: symbolCheck.symbol,
      interval: intervalCheck.interval,
      limit,
      fetchImpl,
    })
      .then((result) => {
        if (cancelled) return;
        setIsLoading(false);
        if (!result.ok) {
          candlesRef.current = [];
          setCandles([]);
          setError(result.error);
          setStatus(FEED_STATUS.DISCONNECTED);
          return;
        }
        candlesRef.current = result.candles;
        setCandles(result.candles);
        lastMessageRef.current = result.fetchedAt;
        setLastUpdated(result.fetchedAt);
        setStatus(FEED_STATUS.LIVE);
      })
      .catch((err) => {
        if (cancelled) return;
        setIsLoading(false);
        candlesRef.current = [];
        setCandles([]);
        setError(err.message);
        setStatus(FEED_STATUS.DISCONNECTED);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, isValid, symbolCheck.symbol, intervalCheck.interval, limit, fetchImpl]);

  // ── Realtime WebSocket feed ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isValid) return undefined;

    const feed = createRealtimeCandleFeed({
      symbol: symbolCheck.symbol,
      interval: intervalCheck.interval,
      WebSocketImpl,
      onCandles: (incoming) => {
        applyCandles(incoming);
        lastMessageRef.current = Date.now();
        setLastUpdated(lastMessageRef.current);
      },
      onStatus: (nextStatus) => {
        setStatus((current) => {
          // A snapshot that is already fresh should not be downgraded by a
          // transient CONNECTING status.
          if (nextStatus === FEED_STATUS.CONNECTING && current === FEED_STATUS.LIVE) {
            return current;
          }
          return nextStatus;
        });
      },
      onError: () => {
        // Errors never produce candles. They only surface as a stale feed.
      },
    });

    feedRef.current = feed;
    feed.start();

    return () => {
      feed.stop();
      feedRef.current = null;
    };
  }, [enabled, isValid, symbolCheck.symbol, intervalCheck.interval, applyCandles, WebSocketImpl]);

  // ── Freshness watchdog ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isValid) return undefined;
    const timer = setInterval(() => {
      const feed = feedRef.current;
      const connected = feed ? feed.getState().connected : true;
      const next = getFeedStatus(lastMessageRef.current, Date.now(), staleAfterMs, connected);
      setStatus((current) => (current === next ? current : next));
    }, 2000);
    return () => clearInterval(timer);
  }, [enabled, isValid, staleAfterMs]);

  return {
    candles,
    status,
    error,
    isLoading,
    lastUpdated,
    isValid,
    symbol: symbolCheck.ok ? symbolCheck.symbol : null,
    interval: intervalCheck.ok ? intervalCheck.interval : null,
  };
}

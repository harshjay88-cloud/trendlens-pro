import React, { useState, useEffect } from 'react';
import { Flame, RefreshCw, ArrowUpRight, X } from 'lucide-react';
import {
  placeBybitDemoOrder,
  fetchBybitTickers,
  fetchBybitKlines,
  analyzeBybitMarketConfluence,
} from '../../services/bybitService.js';
import { useTradingModeStore, TRADING_MODES, MODE_LABELS } from '../../store/tradingModeStore.js';
import './HeatmapScannerModal.css';

/**
 * Asset definitions only. Prices, changes, confluence scores and setup types
 * are all derived from live Bybit market data at runtime — nothing is seeded
 * with a fabricated value.
 *
 * NAS100 was removed: Bybit does not list a NAS100 linear perpetual, so it
 * could never be traded from here.
 */
const ASSET_DEFS = [
  { symbol: 'BTCUSDT', display: 'BTC/USDT', category: 'Crypto' },
  { symbol: 'ETHUSDT', display: 'ETH/USDT', category: 'Crypto' },
  { symbol: 'SOLUSDT', display: 'SOL/USDT', category: 'Crypto' },
  { symbol: 'XAUUSDT', display: 'XAU/USD (Gold)', category: 'Metals' },
  { symbol: 'EURUSDUSDT', display: 'EUR/USD', category: 'Forex' },
  { symbol: 'GBPUSDUSDT', display: 'GBP/USD', category: 'Forex' },
];

const NO_L2 = 'Unavailable (no L2 feed)';

const emptyAsset = (def) => ({
  ...def,
  price: null,
  changePct: null,
  confluenceScore: null,
  setupType: 'SCANNING',
  actionText: 'Fetching market data…',
  trend: null,
  cvdDelta: NO_L2,
  whalePrints: NO_L2,
  isTopPick: false,
});

export default function HeatmapScannerModal({ isOpen, onClose, onSelectAsset, onNotify }) {
  const tradingMode = useTradingModeStore();
  const [assets, setAssets] = useState(ASSET_DEFS.map(emptyAsset));
  const [isScanning, setIsScanning] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [executingOrder, setExecutingOrder] = useState(null);

  /**
   * Load real market data for every tracked asset and evaluate the confluence
   * rules over real Bybit candles.
   */
  const loadScannerData = async () => {
    setIsScanning(true);
    const [tickerRes, ...klineResults] = await Promise.all([
      fetchBybitTickers(),
      ...ASSET_DEFS.map((a) => fetchBybitKlines(a.symbol, '15', 50)),
    ]);

    const tickers = tickerRes.ok ? tickerRes.data || {} : {};

    const next = ASSET_DEFS.map((def, idx) => {
      const ticker = tickers[def.symbol];
      const klineRes = klineResults[idx];
      const candles = klineRes && klineRes.ok ? klineRes.data : [];

      if (!candles || candles.length < 20) {
        return {
          ...def,
          price: ticker ? ticker.price : null,
          changePct: ticker ? +(ticker.pcnt24h * 100).toFixed(2) : null,
          confluenceScore: null,
          setupType: 'NO DATA',
          actionText: 'Not enough Bybit candle history to evaluate the rules.',
          trend: null,
          cvdDelta: NO_L2,
          whalePrints: NO_L2,
          isTopPick: false,
        };
      }

      const analysis = analyzeBybitMarketConfluence(candles, ticker);
      const price = candles[candles.length - 1].c;

      return {
        ...def,
        price,
        changePct: ticker ? +(ticker.pcnt24h * 100).toFixed(2) : null,
        confluenceScore: analysis.score,
        setupType: analysis.direction === 'BUY' ? 'BUY' : analysis.direction === 'SELL' ? 'SELL' : 'WAIT',
        actionText: analysis.reason,
        trend: analysis.direction === 'WAIT' ? 'NEUTRAL' : analysis.direction,
        cvdDelta: NO_L2,
        whalePrints: NO_L2,
        isTopPick: false,
      };
    });

    const ranked = [...next].sort(
      (a, b) => (b.confluenceScore ?? -1) - (a.confluenceScore ?? -1)
    );
    if (ranked[0] && ranked[0].setupType !== 'WAIT' && ranked[0].setupType !== 'NO DATA') {
      ranked[0].isTopPick = true;
    }

    setAssets(ranked);
    setIsScanning(false);
    if (onNotify) {
      onNotify(
        tickerRes.ok
          ? `⚡ Heatmap refreshed from live Bybit market data (${ASSET_DEFS.length} instruments).`
          : '⚠️ Heatmap refresh failed: the public Bybit market data endpoint is unavailable.'
      );
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadScannerData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = () => {
    loadScannerData();
  };

  const handleExecuteBybit = async (asset) => {
    if (tradingMode.mode !== TRADING_MODES.BYBIT_DEMO) {
      if (onNotify) {
        onNotify(`⛔ No order was sent — switch the trading mode to ${MODE_LABELS.BYBIT_DEMO} first (currently ${MODE_LABELS[tradingMode.mode]}).`);
      }
      return;
    }
    if (!tradingMode.canPlaceExchangeOrders()) {
      if (onNotify) {
        onNotify('⛔ No order was sent — automated demo trading is not enabled for this session.');
      }
      return;
    }

    setExecutingOrder(asset.symbol);
    try {
      const isBuy = asset.setupType === 'BUY';
      const qty = asset.symbol.includes('BTC') ? 0.001 : asset.symbol.includes('ETH') ? 0.01 : 0.1;

      const res = await placeBybitDemoOrder({
        symbol: asset.symbol,
        side: isBuy ? 'Buy' : 'Sell',
        qty
      });

      if (res.ok && res.orderId) {
        if (onNotify) {
          onNotify(`✅ Bybit Demo acknowledged order ${res.orderId}: ${isBuy ? 'BUY' : 'SELL'} ${qty} ${asset.display}.`);
        }
      } else {
        if (onNotify) {
          onNotify(`⛔ No order was sent: ${res.error || 'the demo backend refused the request'}`);
        }
      }
    } catch (err) {
      if (onNotify) onNotify(`⛔ No order was sent: ${err.message}`);
    } finally {
      setExecutingOrder(null);
    }
  };

  const filtered = filterCategory === 'All' ? assets : assets.filter(a => a.category === filterCategory);
  const topAsset = assets.reduce(
    (max, a) => ((a.confluenceScore ?? -1) > (max.confluenceScore ?? -1) ? a : max),
    assets[0]
  );

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '—';
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: price > 100 ? 2 : 4 })}`;
  };

  return (
    <div className="modal-backdrop-window" onClick={onClose}>
      <div className="tl-tool-window heatmap-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tl-window-header">
          <div className="tl-window-title">
            <Flame size={16} color="#FF6B00" />
            <span>MULTI-ASSET CONFLUENCE HEATMAP SCANNER</span>
            <span className="tl-window-badge" style={{ color: '#FF6B00', borderColor: '#FF6B00', background: 'rgba(255, 107, 0, 0.12)' }}>
              INSTITUTIONAL RADAR
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className={`tl-scan-refresh-btn ${isScanning ? 'spinning' : ''}`}
              onClick={handleScan}
              title="Rescan markets now"
            >
              <RefreshCw size={13} />
              <span>Rescan</span>
            </button>
            <button type="button" className="tl-window-close" onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="tl-window-body">
          {/* Top Pick Banner */}
          <div className="tl-top-pick-card">
            <div className="tl-top-pick-left">
              <span className="tl-crown-badge">👑 #1 HIGHEST CONFLUENCE SETUP</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <b className="tl-top-asset-name">{topAsset?.display}</b>
                <span className="tl-top-asset-score">
                  {topAsset?.confluenceScore ?? '—'}/100 CONFLUENCE
                </span>
              </div>
              <p className="tl-top-asset-reason">
                {topAsset?.setupType} · {topAsset?.actionText}
              </p>
            </div>
            <div className="tl-top-pick-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (onSelectAsset) onSelectAsset(topAsset.symbol);
                  onClose();
                }}
              >
                Load into Chart ➔
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ background: '#00e676', color: '#0a0d13', border: 'none', fontWeight: 800 }}
                onClick={() => handleExecuteBybit(topAsset)}
                disabled={executingOrder === topAsset.symbol || topAsset.setupType === 'WAIT'}
              >
                {executingOrder === topAsset.symbol ? 'Sending...' : '⚡ Bybit Demo Order'}
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div className="tl-filter-tabs">
              {['All', 'Crypto', 'Metals', 'Forex'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`tl-filter-tab ${filterCategory === cat ? 'active' : ''}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#8592a6' }}>
              Rules evaluated on live Bybit candles · no order-flow feed connected
            </span>
          </div>

          {/* Asset Scanner Table */}
          <div className="tl-scanner-table-wrap">
            <table className="tl-scanner-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Price</th>
                  <th>Trend / Bias</th>
                  <th>CVD Delta</th>
                  <th>Whale Order Flow</th>
                  <th>Confluence Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => {
                  const isTop = asset.symbol === topAsset?.symbol;
                  const isBull = asset.trend === 'BUY';
                  const isBear = asset.trend === 'SELL';
                  return (
                    <tr key={asset.symbol} className={isTop ? 'top-row' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isTop && <span title="Top Pick">👑</span>}
                          <b style={{ color: '#e8ecf3' }}>{asset.display}</b>
                        </div>
                      </td>
                      <td>
                        <b style={{ fontFamily: 'var(--font-mono, monospace)', color: '#fff' }}>
                          {formatPrice(asset.price)}
                        </b>
                      </td>
                      <td>
                        <span className={`tl-trend-pill ${isBull ? 'bull' : isBear ? 'bear' : ''}`}>
                          {isBull ? '▲ ' : isBear ? '▼ ' : ''}{asset.trend || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.68rem', color: '#aab3c3' }}>{asset.cvdDelta}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.68rem', color: '#aab3c3' }}>{asset.whalePrints}</span>
                      </td>
                      <td>
                        <div className="tl-score-cell">
                          <div className="tl-score-bar-bg">
                            <div
                              className="tl-score-bar-fill"
                              style={{
                                width: `${asset.confluenceScore ?? 0}%`,
                                background: (asset.confluenceScore ?? 0) >= 90 ? '#00e676' : (asset.confluenceScore ?? 0) >= 80 ? '#00D4FF' : '#e9b949'
                              }}
                            />
                          </div>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: (asset.confluenceScore ?? 0) >= 90 ? '#00e676' : '#00D4FF'
                          }}>
                            {asset.confluenceScore ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            className="tl-action-icon-btn"
                            title="Load on chart"
                            onClick={() => {
                              if (onSelectAsset) onSelectAsset(asset.symbol);
                              onClose();
                            }}
                          >
                            <ArrowUpRight size={13} />
                          </button>
                          <button
                            type="button"
                            className="tl-action-icon-btn buy-btn"
                            title="Send Bybit Demo order"
                            onClick={() => handleExecuteBybit(asset)}
                            disabled={executingOrder === asset.symbol || asset.setupType === 'WAIT'}
                          >
                            ⚡
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="tl-window-footer">
          <span style={{ fontSize: '0.68rem', color: '#8592a6', marginRight: 'auto' }}>
            ● Public Bybit market data · exchange orders require an enabled Bybit Demo session
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

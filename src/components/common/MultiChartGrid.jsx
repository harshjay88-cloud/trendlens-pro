import React, { useState } from 'react';
import { Maximize2, Zap, Cpu, TrendingUp, TrendingDown, Eye, Activity, Shield } from 'lucide-react';
import './MultiChartGrid.css';

const BOT_COINS = [
  { symbol: 'BTCUSD', pair: 'BTC/USD', name: 'Bitcoin', defaultPx: 82061.40, bias: 'BULLISH', score: 96, reason: 'Asian Low Sweep + Bullish FVG', pnl: '+48.2%' },
  { symbol: 'ETHUSD', pair: 'ETH/USD', name: 'Ethereum', defaultPx: 2640.80, bias: 'BULLISH', score: 94, reason: 'H4 Orderblock Mitigation', pnl: '+32.1%' },
  { symbol: 'SOLUSD', pair: 'SOL/USD', name: 'Solana', defaultPx: 184.50, bias: 'BULLISH', score: 95, reason: 'MSS Break of Structure', pnl: '+64.5%' },
  { symbol: 'BNBUSD', pair: 'BNB/USD', name: 'Binance Coin', defaultPx: 592.10, bias: 'NEUTRAL', score: 88, reason: 'Consolidation near Equilibrium', pnl: '+12.4%' },
  { symbol: 'XRPUSD', pair: 'XRP/USD', name: 'Ripple', defaultPx: 0.5420, bias: 'BULLISH', score: 92, reason: 'Whale Iceberg Absorption', pnl: '+18.9%' },
  { symbol: 'DOGEUSD', pair: 'DOGE/USD', name: 'Dogecoin', defaultPx: 0.1420, bias: 'BULLISH', score: 91, reason: 'M15 Imbalance Mitigation', pnl: '+24.6%' },
  { symbol: 'ADAUSD', pair: 'ADA/USD', name: 'Cardano', defaultPx: 0.3540, bias: 'BULLISH', score: 93, reason: 'Liquidity Pool Purged', pnl: '+15.2%' },
  { symbol: 'AVAXUSD', pair: 'AVAX/USD', name: 'Avalanche', defaultPx: 28.40, bias: 'BULLISH', score: 95, reason: 'Bookmap Wall Defended', pnl: '+41.8%' },
  { symbol: 'LINKUSD', pair: 'LINK/USD', name: 'Chainlink', defaultPx: 12.10, bias: 'BULLISH', score: 94, reason: 'POC Value Area Retest', pnl: '+29.3%' },
  { symbol: 'SUIUSD', pair: 'SUI/USD', name: 'Sui Network', defaultPx: 2.15, bias: 'BULLISH', score: 97, reason: 'Strong Institutional Markup', pnl: '+82.4%' },
];

export default function MultiChartGrid({
  gridLayout = 'bot10', // '2x1', '2x2', '3x2', '4x2', '4x4', 'bot10'
  prices = {},
  onSelectCoin,
  onCloseGrid
}) {
  const [activeCoinTab, setActiveCoinTab] = useState(null);

  const getGridClass = () => {
    switch (gridLayout) {
      case '2x1': return 'grid-2x1';
      case '2x2': return 'grid-2x2';
      case '3x2': return 'grid-3x2';
      case '4x2': return 'grid-4x2';
      case '4x4': return 'grid-4x4';
      case 'bot10':
      default: return 'grid-bot10';
    }
  };

  const displayCoins = gridLayout === '2x1'
    ? BOT_COINS.slice(0, 2)
    : gridLayout === '2x2'
    ? BOT_COINS.slice(0, 4)
    : gridLayout === '3x2'
    ? BOT_COINS.slice(0, 6)
    : gridLayout === '4x2'
    ? BOT_COINS.slice(0, 8)
    : BOT_COINS;

  return (
    <div className="multi-chart-overlay">
      <div className="multi-chart-header">
        <div className="multi-chart-title">
          <Cpu size={16} color="var(--gold)" />
          <span>Institutional Multi-Chart Parallel Matrix (16 Charts / 10-Coin Bot Active)</span>
          <span className="multi-active-pill">200 Parallel WebSocket Connections</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Showing <b>{displayCoins.length} Parallel Live Charts</b>
          </span>
          <button className="btn btn-sm btn-ghost" onClick={onCloseGrid} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
            Back to Single Engine
          </button>
        </div>
      </div>

      <div className={`multi-chart-grid ${getGridClass()}`}>
        {displayCoins.map(coin => {
          const liveData = prices[coin.pair] || {};
          const currentPx = liveData.price || coin.defaultPx;
          const changePct = liveData.changePct || (coin.bias === 'BULLISH' ? +1.42 : -0.65);
          const isUp = changePct >= 0;

          return (
            <div key={coin.symbol} className="mini-chart-card card" onClick={() => onSelectCoin && onSelectCoin(coin.symbol)}>
              <div className="mini-chart-top">
                <div className="mini-coin-info">
                  <span className="mini-coin-symbol">{coin.pair}</span>
                  <span className="mini-coin-name">{coin.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mini-coin-px">
                    {currentPx > 100 ? currentPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPx.toFixed(4)}
                  </div>
                  <div className={`mini-coin-chg ${isUp ? 'positive' : 'negative'}`}>
                    {isUp ? '+' : ''}{typeof changePct === 'number' ? changePct.toFixed(2) : changePct}%
                  </div>
                </div>
              </div>

              {/* Dynamic Live SVG Candlestick Sparkline */}
              <div className="mini-chart-canvas-wrap">
                <svg viewBox="0 0 280 90" className="mini-sparkline">
                  <defs>
                    <linearGradient id={`grad-${coin.symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isUp ? '#089981' : '#f23645'} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={isUp ? '#089981' : '#f23645'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Subtle Grid Lines */}
                  <line x1="0" y1="22" x2="280" y2="22" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
                  <line x1="0" y1="45" x2="280" y2="45" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
                  <line x1="0" y1="68" x2="280" y2="68" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />

                  {/* 14 Simulated Live Price Bars */}
                  {[
                    { x: 15, o: 55, h: 62, l: 48, c: 52 },
                    { x: 35, o: 52, h: 58, l: 45, c: 46 },
                    { x: 55, o: 46, h: 54, l: 42, c: 50 },
                    { x: 75, o: 50, h: 65, l: 48, c: 62 },
                    { x: 95, o: 62, h: 70, l: 58, c: 68 },
                    { x: 115, o: 68, h: 72, l: 60, c: 63 },
                    { x: 135, o: 63, h: 66, l: 52, c: 54 },
                    { x: 155, o: 54, h: 59, l: 48, c: 50 },
                    { x: 175, o: 50, h: 64, l: 49, c: 60 },
                    { x: 195, o: 60, h: 74, l: 58, c: 70 },
                    { x: 215, o: 70, h: 78, l: 65, c: 75 },
                    { x: 235, o: 75, h: 84, l: 72, c: 80 },
                    { x: 255, o: 80, h: 86, l: 76, c: isUp ? 83 : 74 },
                  ].map((b, idx) => {
                    const up = b.c >= b.o;
                    const col = up ? '#089981' : '#f23645';
                    const yTop = 90 - Math.max(b.o, b.c);
                    const yH = Math.max(3, Math.abs(b.c - b.o));
                    return (
                      <g key={idx}>
                        <line x1={b.x} y1={90 - b.h} x2={b.x} y2={90 - b.l} stroke={col} strokeWidth="1" />
                        <rect x={b.x - 4} y={yTop} width="8" height={yH} fill={col} rx="1" />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Bot Confluence & Strategy Footer */}
              <div className="mini-chart-footer">
                <div className="mini-strategy-tag">
                  <span className={`mini-bias-pill ${coin.bias === 'BULLISH' ? 'buy' : 'neutral'}`}>
                    {coin.bias} {coin.score}%
                  </span>
                  <span className="mini-reason">{coin.reason}</span>
                </div>
                <button
                  type="button"
                  className="btn-open-engine"
                  title="Expand to Full Dedicated Engine"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectCoin) onSelectCoin(coin.symbol);
                    if (onCloseGrid) onCloseGrid();
                  }}
                >
                  <Maximize2 size={12} />
                  <span>Trade</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

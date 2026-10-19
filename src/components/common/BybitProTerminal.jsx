import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, ChevronDown, Layers, Zap,
  Settings, Maximize2, Minimize2, Shield, Clock, ExternalLink
} from 'lucide-react';
import TradingViewLeftToolbar from './TradingViewLeftToolbar.jsx';
import TrendLensUltraChart from './TrendLensUltraChart.jsx';
import { useDemoAccountStore } from '../../store/index.js';
import './BybitProTerminal.css';

export default function BybitProTerminal({
  symbol = 'BTCUSD',
  asset = 'BTC/USD',
  prices = {},
  onSelectSymbol,
  onSwitchPage
}) {
  const { account, openDemoTrade, closeDemoTrade } = useDemoAccountStore();
  const [subEngine, setSubEngine] = useState('tradingview'); // 'ultra', 'tradingview', 'depth'
  const [timeframe, setTimeframe] = useState('15');
  const [bottomTab, setBottomTab] = useState('positions'); // 'positions', 'orders', 'history'
  const [orderSide, setOrderSide] = useState('buy');
  const [orderType, setOrderType] = useState('Market');
  const [leverage, setLeverage] = useState(10);
  const [marginInput, setMarginInput] = useState(200);

  const curData = prices[asset] || { price: 82061.40, changePct: 0.60, high: 83155.00, low: 81475.10 };
  const currentPrice = typeof curData.price === 'number' ? curData.price : 82061.40;
  const isUp = (curData.changePct || 0) >= 0;

  // Generate dynamic live orderbook depth levels around currentPrice
  const spreadStep = currentPrice > 1000 ? 0.8 : currentPrice > 1 ? 0.002 : 0.0001;
  const asks = [
    { p: currentPrice + spreadStep * 5, q: '0.002', t: '2.840', d: 65 },
    { p: currentPrice + spreadStep * 4, q: '0.001', t: '2.838', d: 45 },
    { p: currentPrice + spreadStep * 3, q: '0.002', t: '2.837', d: 70 },
    { p: currentPrice + spreadStep * 2, q: '0.008', t: '2.835', d: 90 },
    { p: currentPrice + spreadStep * 1, q: '0.001', t: '2.827', d: 35 },
  ];
  const bids = [
    { p: currentPrice - spreadStep * 1, q: '4.414', t: '4.414', d: 85 },
    { p: currentPrice - spreadStep * 2, q: '0.001', t: '4.415', d: 30 },
    { p: currentPrice - spreadStep * 3, q: '0.002', t: '4.417', d: 55 },
    { p: currentPrice - spreadStep * 4, q: '0.001', t: '4.418', d: 40 },
    { p: currentPrice - spreadStep * 5, q: '0.002', t: '4.420', d: 60 },
  ];

  const handleQuickOrder = (buy) => {
    const isBuy = buy;
    const slP = isBuy ? currentPrice * 0.992 : currentPrice * 1.008;
    const tpP = isBuy ? currentPrice * 1.020 : currentPrice * 0.980;
    openDemoTrade({
      asset,
      buy: isBuy,
      entry: currentPrice,
      sl: +slP.toFixed(2),
      tp1: +tpP.toFixed(2),
      score: 94,
      reason: 'Bybit Fast Pro Market Execution',
      lotSize: 1.0,
      marginUsdt: marginInput,
      leverage,
      pipMultiplier: currentPrice > 100 ? 10 : 10000,
      force: true
    });
  };

  return (
    <div className="bybit-terminal-container">
      {/* 1. Top Bybit Pro Ticker Header (Replicating Bybit Screenshot 4) */}
      <div className="bybit-topbar">
        <div className="bybit-top-left">
          <div className="bybit-logo-badge">
            <span style={{ color: '#f7a600', fontSize: '1.2rem', fontWeight: 900 }}>BYBIT</span>
            <span className="bybit-demo-pill">Demo Trading</span>
          </div>

          {/* Asset Selector */}
          <div className="bybit-pair-badge" onClick={() => onSwitchPage && onSwitchPage('overview')}>
            <b>{symbol.replace('/', '')}</b>
            <span style={{ fontSize: '0.65rem', color: '#787b86' }}>Perpetual</span>
            <ChevronDown size={12} color="#787b86" />
          </div>

          <div className={`bybit-live-px ${isUp ? 'up' : 'dn'}`}>
            {currentPrice > 1000 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPrice.toFixed(4)}
          </div>
        </div>

        {/* 24h Metrics Rail */}
        <div className="bybit-metrics-rail">
          <div>
            <span>24H CHANGE</span>
            <b style={{ color: isUp ? '#089981' : '#f23645' }}>
              {isUp ? '+' : ''}{(curData.changePct || 0).toFixed(2)}%
            </b>
          </div>
          <div>
            <span>24H HIGH</span>
            <b>{curData.high ? curData.high.toLocaleString() : '---'}</b>
          </div>
          <div>
            <span>24H LOW</span>
            <b>{curData.low ? curData.low.toLocaleString() : '---'}</b>
          </div>
          <div>
            <span>24H TURNOVER</span>
            <b>$4.08B</b>
          </div>
          <div>
            <span>FUNDING RATE</span>
            <b style={{ color: '#f7a600' }}>0.0092% / 01:55:30</b>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Chart (Center) + Order Book & Trade Panel (Right) */}
      <div className="bybit-middle-row">
        {/* Left Vertical Drawing Toolbar */}
        <TradingViewLeftToolbar
          onSelectTool={(tool) => console.log('Tool:', tool)}
          onClearDrawings={() => {}}
        />

        {/* Main Chart Column */}
        <div className="bybit-chart-column">
          {/* Chart Subheader (Standard / TradingView / Depth tabs & Timeframes) */}
          <div className="bybit-chart-subheader">
            <div className="bybit-chart-modes">
              <button
                className={`bybit-mode-tab ${subEngine === 'tradingview' ? 'active' : ''}`}
                onClick={() => setSubEngine('tradingview')}
              >
                TradingView
              </button>
              <button
                className={`bybit-mode-tab ${subEngine === 'ultra' ? 'active' : ''}`}
                onClick={() => setSubEngine('ultra')}
              >
                Ultra Engine (SMC)
              </button>
              <button
                className={`bybit-mode-tab ${subEngine === 'depth' ? 'active' : ''}`}
                onClick={() => setSubEngine('depth')}
              >
                Depth
              </button>
            </div>

            {/* Timeframe Buttons */}
            <div className="bybit-tf-bar">
              {['1s', '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'].map(tf => (
                <button
                  key={tf}
                  className={`bybit-tf-btn ${timeframe === tf ? 'active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Floating On-Chart Long & Short Buttons (Exact Bybit Screenshot 4) */}
          <div className="bybit-chart-floating-trade">
            <button
              className="bybit-float-long-btn"
              onClick={() => handleQuickOrder(true)}
              title="Instant Market Long Order"
            >
              <span>Market Long</span>
              <span>${currentPrice.toLocaleString()}</span>
            </button>
            <button
              className="bybit-float-short-btn"
              onClick={() => handleQuickOrder(false)}
              title="Instant Market Short Order"
            >
              <span>Market Short</span>
              <span>${currentPrice.toLocaleString()}</span>
            </button>
          </div>

          {/* Main Chart Viewport */}
          <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
            {subEngine === 'ultra' ? (
              <TrendLensUltraChart
                asset={asset}
                initialPrice={currentPrice}
                category="Crypto"
                timeframe={timeframe}
                engineMode="ultra"
              />
            ) : (
              <iframe
                key={`${symbol}-${timeframe}`}
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${symbol}&interval=${timeframe}&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=131722&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="TradingView Chart"
              />
            )}
          </div>
        </div>

        {/* Right Sidebar: Order Book & Trade Execution Panel (Bybit Screenshot 4) */}
        <div className="bybit-right-panel">
          {/* Order Book Column */}
          <div className="bybit-orderbook">
            <div className="bybit-ob-header">
              <span>Order Book</span>
              <span style={{ fontSize: '0.62rem', color: '#787b86' }}>0.1</span>
            </div>

            <div className="bybit-ob-cols">
              <span>Price(USDT)</span>
              <span style={{ textAlign: 'right' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {/* Asks (Sells in Red) */}
            <div className="bybit-ob-list">
              {asks.map((a, i) => (
                <div key={i} className="bybit-ob-row ask">
                  <div className="bar" style={{ width: `${a.d}%` }} />
                  <span>{a.p.toFixed(2)}</span>
                  <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{a.q}</span>
                  <span style={{ textAlign: 'right', color: '#787b86' }}>{a.t}</span>
                </div>
              ))}

              {/* Mid Current Price */}
              <div className="bybit-ob-mid">
                <span style={{ color: isUp ? '#089981' : '#f23645' }}>
                  {currentPrice.toFixed(2)} {isUp ? '▲' : '▼'}
                </span>
                <span style={{ fontSize: '0.62rem', color: '#787b86' }}>Index 82,063.00</span>
              </div>

              {/* Bids (Buys in Green) */}
              {bids.map((b, i) => (
                <div key={i} className="bybit-ob-row bid">
                  <div className="bar" style={{ width: `${b.d}%` }} />
                  <span>{b.p.toFixed(2)}</span>
                  <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{b.q}</span>
                  <span style={{ textAlign: 'right', color: '#787b86' }}>{b.t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trade Execution Column */}
          <div className="bybit-trade-exec">
            {/* Leverage & Margin Mode */}
            <div className="bybit-leverage-bar">
              <span style={{ fontWeight: 700 }}>Cross</span>
              <b style={{ color: '#f7a600', cursor: 'pointer' }}>{leverage}.00x</b>
            </div>

            {/* Order Types */}
            <div className="bybit-order-type-tabs">
              {['Limit', 'Market', 'Chase Limit'].map(t => (
                <span
                  key={t}
                  className={`bybit-type-tab ${orderType === t ? 'active' : ''}`}
                  onClick={() => setOrderType(t)}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Order Value Input */}
            <div className="bybit-input-group">
              <span style={{ color: '#787b86', fontSize: '0.62rem' }}>Order Margin (USDT)</span>
              <div className="bybit-input-box">
                <input
                  type="number"
                  value={marginInput}
                  onChange={(e) => setMarginInput(parseFloat(e.target.value) || 100)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', width: '100%', outline: 'none', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '0.68rem', color: '#787b86' }}>USDT</span>
              </div>
            </div>

            {/* Position Size Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#787b86', fontSize: '0.65rem' }}>
              <span>Position Value</span>
              <b style={{ color: '#ffffff' }}>${(marginInput * leverage).toLocaleString()} USDT</b>
            </div>

            {/* Buy Long & Sell Short Action Buttons */}
            <div className="bybit-btn-row">
              <button
                className="bybit-long-submit"
                onClick={() => handleQuickOrder(true)}
              >
                Long (Demo)
              </button>
              <button
                className="bybit-short-submit"
                onClick={() => handleQuickOrder(false)}
              >
                Short (Demo)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Positions & Orders Panel (Bybit Screenshot 4) */}
      <div className="bybit-bottom-panel">
        <div className="bybit-bottom-tabs">
          <div className="bybit-tab-group">
            <span
              className={`bybit-btab ${bottomTab === 'positions' ? 'active' : ''}`}
              onClick={() => setBottomTab('positions')}
            >
              Positions ({account.openPosition ? '1' : '0'})
            </span>
            <span
              className={`bybit-btab ${bottomTab === 'orders' ? 'active' : ''}`}
              onClick={() => setBottomTab('orders')}
            >
              Open Orders (0)
            </span>
            <span
              className={`bybit-btab ${bottomTab === 'history' ? 'active' : ''}`}
              onClick={() => setBottomTab('history')}
            >
              Trade History ({account.closedTrades?.length || 0})
            </span>
          </div>

          <div>
            {account.openPosition && (
              <button
                className="bybit-close-all-btn"
                onClick={() => closeDemoTrade(currentPrice, 'Manual Terminal Close')}
              >
                Close Position
              </button>
            )}
          </div>
        </div>

        {/* Live Positions Table */}
        <div className="bybit-positions-table-wrap">
          <table className="bybit-pos-table">
            <thead>
              <tr>
                <th>Contracts</th>
                <th>Qty</th>
                <th>Entry Price</th>
                <th>Mark Price</th>
                <th>Liq. Price</th>
                <th>Unrealized P&amp;L</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {account.openPosition ? (
                <tr>
                  <td style={{ color: account.openPosition.type === 'BUY' ? '#089981' : '#f23645', fontWeight: 800 }}>
                    {account.openPosition.asset} {account.openPosition.type} {account.openPosition.leverage}x
                  </td>
                  <td>{account.openPosition.lotSize}</td>
                  <td>${account.openPosition.entryPrice}</td>
                  <td>${currentPrice.toFixed(2)}</td>
                  <td style={{ color: '#f7a600' }}>
                    ${account.openPosition.type === 'BUY'
                      ? (account.openPosition.entryPrice * 0.90).toFixed(2)
                      : (account.openPosition.entryPrice * 1.10).toFixed(2)}
                  </td>
                  <td style={{ color: account.unrealizedPnL >= 0 ? '#089981' : '#f23645', fontWeight: 800 }}>
                    {account.unrealizedPnL >= 0 ? '+' : ''}${account.unrealizedPnL.toFixed(2)} USD
                  </td>
                  <td>
                    <button
                      className="bybit-close-all-btn"
                      onClick={() => closeDemoTrade(currentPrice, 'Market Close')}
                    >
                      Market Close
                    </button>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#565866' }}>
                    No active positions. Click Market Long or Market Short to enter a trade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

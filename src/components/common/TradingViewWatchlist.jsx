import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Sliders, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import './TradingViewWatchlist.css';

const WATCHLIST_SECTIONS = [
  {
    category: 'CRYPTO',
    label: 'Cryptocurrency (Bybit V5)',
    items: [
      { sym: 'BTCUSD', name: 'BTC/USD', label: 'BTC', cat: 'Crypto', color: '#f7931a' },
      { sym: 'ETHUSD', name: 'ETH/USD', label: 'ETH', cat: 'Crypto', color: '#627eea' },
      { sym: 'SOLUSD', name: 'SOL/USD', label: 'SOL', cat: 'Crypto', color: '#14f195' },
      { sym: 'BNBUSD', name: 'BNB/USD', label: 'BNB', cat: 'Crypto', color: '#f3ba2f' },
      { sym: 'XRPUSD', name: 'XRP/USD', label: 'XRP', cat: 'Crypto', color: '#23292f' },
      { sym: 'DOGEUSD', name: 'DOGE/USD', label: 'DOGE', cat: 'Crypto', color: '#c2a633' },
      { sym: 'ADAUSD', name: 'ADA/USD', label: 'ADA', cat: 'Crypto', color: '#0033ad' },
      { sym: 'AVAXUSD', name: 'AVAX/USD', label: 'AVAX', cat: 'Crypto', color: '#e84142' },
      { sym: 'LINKUSD', name: 'LINK/USD', label: 'LINK', cat: 'Crypto', color: '#375bd2' },
      { sym: 'NEARUSD', name: 'NEAR/USD', label: 'NEAR', cat: 'Crypto', color: '#000000' }
    ]
  },
  {
    category: 'METALS',
    label: 'Metals & Energy',
    items: [
      { sym: 'XAUUSD', name: 'XAU/USD', label: 'Gold Spot', cat: 'Metals', color: '#f0a800' },
      { sym: 'XAGUSD', name: 'XAG/USD', label: 'Silver Spot', cat: 'Metals', color: '#c0c0c0' },
      { sym: 'USOIL', name: 'USOIL', label: 'WTI Crude Oil', cat: 'Commodities', color: '#8b8e9b' }
    ]
  },
  {
    category: 'FOREX',
    label: 'Forex Majors',
    items: [
      { sym: 'EURUSD', name: 'EUR/USD', label: 'EUR/USD', cat: 'Forex', color: '#2962ff' },
      { sym: 'GBPUSD', name: 'GBP/USD', label: 'GBP/USD', cat: 'Forex', color: '#f23645' },
      { sym: 'USDJPY', name: 'USD/JPY', label: 'USD/JPY', cat: 'Forex', color: '#e9b949' }
    ]
  },
  {
    category: 'INDICES',
    label: 'Global Indices',
    items: [
      { sym: 'SPX500', name: 'SPX500', label: 'S&P 500', cat: 'Indices', color: '#f23645' },
      { sym: 'NAS100', name: 'NAS100', label: 'Nasdaq 100', cat: 'Indices', color: '#2962ff' },
      { sym: 'US30', name: 'US30', label: 'Dow Jones 30', cat: 'Indices', color: '#089981' }
    ]
  }
];

export default function TradingViewWatchlist({
  prices = {},
  selectedSymbol = 'BTCUSD',
  onSelectSymbol,
  onOpenBot
}) {
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (cat) => {
    setCollapsedSections(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const currentPairMap = {
    'BTCUSD': 'BTC/USD',
    'ETHUSD': 'ETH/USD',
    'SOLUSD': 'SOL/USD',
    'BNBUSD': 'BNB/USD',
    'XRPUSD': 'XRP/USD',
    'DOGEUSD': 'DOGE/USD',
    'ADAUSD': 'ADA/USD',
    'AVAXUSD': 'AVAX/USD',
    'LINKUSD': 'LINK/USD',
    'NEARUSD': 'NEAR/USD',
    'XAUUSD': 'XAU/USD',
    'XAGUSD': 'XAG/USD',
    'USOIL': 'USOIL',
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'SPX500': 'SPX500',
    'NAS100': 'NAS100',
    'US30': 'US30'
  };

  const selectedPair = currentPairMap[selectedSymbol] || selectedSymbol;
  const activeData = prices[selectedPair] || { price: 81978.43, changePct: 0.04, high: 82500, low: 81200 };

  return (
    <div className="tv-watchlist-drawer">
      {/* Header */}
      <div className="tv-wl-header">
        <div className="tv-wl-title-wrap">
          <span>Watchlist</span>
          <ChevronDown size={14} />
        </div>
        <div className="tv-wl-actions">
          <button className="tv-wl-btn" title="Add Symbol (+)">
            <Plus size={15} />
          </button>
          <button className="tv-wl-btn" title="Advanced Filter">
            <Sliders size={14} />
          </button>
        </div>
      </div>

      {/* Columns Header */}
      <div className="tv-wl-cols">
        <span>Symbol</span>
        <span style={{ textAlign: 'right' }}>Last</span>
        <span style={{ textAlign: 'right' }}>Chg%</span>
      </div>

      {/* Watchlist Sections List */}
      <div className="tv-wl-list">
        {WATCHLIST_SECTIONS.map((sec) => {
          const isCollapsed = collapsedSections[sec.category];
          return (
            <div key={sec.category} className="tv-wl-section">
              <div className="tv-wl-section-header" onClick={() => toggleSection(sec.category)}>
                <span>{sec.label}</span>
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </div>

              {!isCollapsed && sec.items.map((item) => {
                const data = prices[item.name] || {};
                const px = typeof data.price === 'number' ? data.price : (item.name === 'BTC/USD' ? 82000 : 100);
                const chg = typeof data.changePct === 'number' ? data.changePct : 0;
                const isSelected = selectedSymbol === item.sym;
                const isUp = chg >= 0;

                const fmtPx = px > 1000
                  ? px.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : px > 1
                    ? px.toFixed(2)
                    : px.toFixed(4);

                return (
                  <div
                    key={item.sym}
                    className={`tv-wl-row ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectSymbol(item.sym)}
                  >
                    <div className="tv-wl-sym-cell">
                      <span className="tv-wl-dot" style={{ background: item.color }} />
                      <span>{item.label}</span>
                    </div>
                    <div className="tv-wl-px-cell">{fmtPx}</div>
                    <div className={`tv-wl-chg-cell ${isUp ? 'up' : 'dn'}`}>
                      {isUp ? '+' : ''}{chg.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Selected Asset Bottom Details Card (TradingView Style) */}
      <div className="tv-wl-card">
        <div className="tv-wl-card-top">
          <div>
            <div className="tv-wl-card-sym">{selectedPair}</div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted, #787b86)' }}>Bybit Real-time Feed</div>
          </div>
          <div className={`tv-wl-chg-cell ${activeData.changePct >= 0 ? 'up' : 'dn'}`} style={{ fontSize: '0.78rem' }}>
            {activeData.changePct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{activeData.changePct >= 0 ? '+' : ''}{(activeData.changePct || 0).toFixed(2)}%</span>
          </div>
        </div>

        <div className="tv-wl-card-px">
          {typeof activeData.price === 'number'
            ? activeData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '---'}
        </div>

        <div className="tv-wl-card-stats">
          <div>
            <span style={{ display: 'block', fontSize: '0.58rem', color: '#5d606b' }}>24H HIGH</span>
            <b style={{ color: 'var(--signal-buy, #089981)' }}>{activeData.high ? activeData.high.toLocaleString() : '---'}</b>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.58rem', color: '#5d606b' }}>24H LOW</span>
            <b style={{ color: 'var(--signal-sell, #f23645)' }}>{activeData.low ? activeData.low.toLocaleString() : '---'}</b>
          </div>
        </div>

        {onOpenBot && (
          <button
            type="button"
            onClick={onOpenBot}
            style={{
              background: 'var(--brand, #2962ff)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 10px',
              fontWeight: 700,
              fontSize: '0.70rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <span>🤖 Run AI Confluence Bot</span>
          </button>
        )}
      </div>
    </div>
  );
}

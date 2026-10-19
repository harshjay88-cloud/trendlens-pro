import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Sliders, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import './TradingViewWatchlist.css';

const WATCHLIST_SECTIONS = [
  {
    category: 'CRYPTO_MAJORS',
    label: 'Crypto Bluechips & L1s',
    items: [
      { sym: 'BTCUSD', name: 'BTC/USD', label: 'BTC', cat: 'Crypto', color: '#f7931a' },
      { sym: 'ETHUSD', name: 'ETH/USD', label: 'ETH', cat: 'Crypto', color: '#627eea' },
      { sym: 'SOLUSD', name: 'SOL/USD', label: 'SOL', cat: 'Crypto', color: '#14f195' },
      { sym: 'BNBUSD', name: 'BNB/USD', label: 'BNB', cat: 'Crypto', color: '#f3ba2f' },
      { sym: 'XRPUSD', name: 'XRP/USD', label: 'XRP', cat: 'Crypto', color: '#23292f' },
      { sym: 'ADAUSD', name: 'ADA/USD', label: 'ADA', cat: 'Crypto', color: '#0033ad' },
      { sym: 'AVAXUSD', name: 'AVAX/USD', label: 'AVAX', cat: 'Crypto', color: '#e84142' },
      { sym: 'SUIUSD', name: 'SUI/USD', label: 'SUI', cat: 'Crypto', color: '#4da2ff' },
      { sym: 'NEARUSD', name: 'NEAR/USD', label: 'NEAR', cat: 'Crypto', color: '#000000' },
      { sym: 'APTUSD', name: 'APT/USD', label: 'APT', cat: 'Crypto', color: '#2ed8a7' },
      { sym: 'TONUSD', name: 'TON/USD', label: 'TON', cat: 'Crypto', color: '#0088cc' },
      { sym: 'DOTUSD', name: 'DOT/USD', label: 'DOT', cat: 'Crypto', color: '#e6007a' },
      { sym: 'LTCUSD', name: 'LTC/USD', label: 'LTC', cat: 'Crypto', color: '#345d9d' },
      { sym: 'FTMUSD', name: 'FTM/USD', label: 'FTM', cat: 'Crypto', color: '#1969ff' },
      { sym: 'ICPUSD', name: 'ICP/USD', label: 'ICP', cat: 'Crypto', color: '#29abe2' },
      { sym: 'KASUSD', name: 'KAS/USD', label: 'KAS', cat: 'Crypto', color: '#70c7ba' },
      { sym: 'SEIUSD', name: 'SEI/USD', label: 'SEI', cat: 'Crypto', color: '#9a1d2f' }
    ]
  },
  {
    category: 'CRYPTO_DEFI_AI',
    label: 'DeFi, AI & Meme Tokens',
    items: [
      { sym: 'LINKUSD', name: 'LINK/USD', label: 'LINK', cat: 'Crypto', color: '#375bd2' },
      { sym: 'UNIUSD', name: 'UNI/USD', label: 'UNI', cat: 'Crypto', color: '#ff007a' },
      { sym: 'AAVEUSD', name: 'AAVE/USD', label: 'AAVE', cat: 'Crypto', color: '#b6509e' },
      { sym: 'INJUSD', name: 'INJ/USD', label: 'INJ', cat: 'Crypto', color: '#00b4d8' },
      { sym: 'TIAUSD', name: 'TIA/USD', label: 'TIA', cat: 'Crypto', color: '#7b2cbf' },
      { sym: 'RENDERUSD', name: 'RENDER/USD', label: 'RENDER', cat: 'Crypto', color: '#e53935' },
      { sym: 'TAOUSD', name: 'TAO/USD', label: 'TAO', cat: 'Crypto', color: '#212529' },
      { sym: 'FETUSD', name: 'FET/USD', label: 'FET', cat: 'Crypto', color: '#1d3557' },
      { sym: 'DOGEUSD', name: 'DOGE/USD', label: 'DOGE', cat: 'Crypto', color: '#c2a633' },
      { sym: 'SHIBUSD', name: 'SHIB/USD', label: 'SHIB', cat: 'Crypto', color: '#ffa409' },
      { sym: 'PEPEUSD', name: 'PEPE/USD', label: 'PEPE', cat: 'Crypto', color: '#43a047' },
      { sym: 'WIFUSD', name: 'WIF/USD', label: 'WIF', cat: 'Crypto', color: '#e07a5f' }
    ]
  },
  {
    category: 'FOREX_MAJORS',
    label: 'Forex Majors',
    items: [
      { sym: 'EURUSD', name: 'EUR/USD', label: 'EUR/USD', cat: 'Forex', color: '#2962ff' },
      { sym: 'GBPUSD', name: 'GBP/USD', label: 'GBP/USD', cat: 'Forex', color: '#f23645' },
      { sym: 'USDJPY', name: 'USD/JPY', label: 'USD/JPY', cat: 'Forex', color: '#e9b949' },
      { sym: 'AUDUSD', name: 'AUD/USD', label: 'AUD/USD', cat: 'Forex', color: '#089981' },
      { sym: 'USDCAD', name: 'USD/CAD', label: 'USD/CAD', cat: 'Forex', color: '#ab47bc' },
      { sym: 'USDCHF', name: 'USD/CHF', label: 'USD/CHF', cat: 'Forex', color: '#e53935' },
      { sym: 'NZDUSD', name: 'NZD/USD', label: 'NZD/USD', cat: 'Forex', color: '#00acc1' }
    ]
  },
  {
    category: 'FOREX_CROSSES',
    label: 'Forex Crosses & Exotics',
    items: [
      { sym: 'EURJPY', name: 'EUR/JPY', label: 'EUR/JPY', cat: 'Forex', color: '#2962ff' },
      { sym: 'GBPJPY', name: 'GBP/JPY', label: 'GBP/JPY', cat: 'Forex', color: '#f23645' },
      { sym: 'EURGBP', name: 'EUR/GBP', label: 'EUR/GBP', cat: 'Forex', color: '#7b1fa2' },
      { sym: 'AUDJPY', name: 'AUD/JPY', label: 'AUD/JPY', cat: 'Forex', color: '#e9b949' },
      { sym: 'CADJPY', name: 'CAD/JPY', label: 'CAD/JPY', cat: 'Forex', color: '#43a047' },
      { sym: 'USDTRY', name: 'USD/TRY', label: 'USD/TRY', cat: 'Forex', color: '#d32f2f' },
      { sym: 'USDZAR', name: 'USD/ZAR', label: 'USD/ZAR', cat: 'Forex', color: '#f57c00' },
      { sym: 'USDMXN', name: 'USD/MXN', label: 'USD/MXN', cat: 'Forex', color: '#388e3c' }
    ]
  },
  {
    category: 'METALS',
    label: 'Commodities & Metals',
    items: [
      { sym: 'XAUUSD', name: 'XAU/USD', label: 'Gold Spot', cat: 'Metals', color: '#f0a800' },
      { sym: 'XAGUSD', name: 'XAG/USD', label: 'Silver Spot', cat: 'Metals', color: '#c0c0c0' },
      { sym: 'USOIL', name: 'USOIL', label: 'WTI Crude Oil', cat: 'Commodities', color: '#8b8e9b' }
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
    'SUIUSD': 'SUI/USD',
    'APTUSD': 'APT/USD',
    'TONUSD': 'TON/USD',
    'DOTUSD': 'DOT/USD',
    'LTCUSD': 'LTC/USD',
    'MATICUSD': 'MATIC/USD',
    'ATOMUSD': 'ATOM/USD',
    'FTMUSD': 'FTM/USD',
    'ALGOUSD': 'ALGO/USD',
    'ICPUSD': 'ICP/USD',
    'KASUSD': 'KAS/USD',
    'SEIUSD': 'SEI/USD',
    'ARBUSD': 'ARB/USD',
    'OPUSD': 'OP/USD',
    'STRKUSD': 'STRK/USD',
    'IMXUSD': 'IMX/USD',
    'UNIUSD': 'UNI/USD',
    'AAVEUSD': 'AAVE/USD',
    'MKRUSD': 'MKR/USD',
    'INJUSD': 'INJ/USD',
    'TIAUSD': 'TIA/USD',
    'RUNEUSD': 'RUNE/USD',
    'PENDLEUSD': 'PENDLE/USD',
    'JUPUSD': 'JUP/USD',
    'ENAUSD': 'ENA/USD',
    'PYTHUSD': 'PYTH/USD',
    'ONDOUSD': 'ONDO/USD',
    'RENDERUSD': 'RENDER/USD',
    'TAOUSD': 'TAO/USD',
    'FETUSD': 'FET/USD',
    'FILUSD': 'FIL/USD',
    'WLDUSD': 'WLD/USD',
    'JASMYUSD': 'JASMY/USD',
    'STXUSD': 'STX/USD',
    'ORDIUSD': 'ORDI/USD',
    'SHIBUSD': 'SHIB/USD',
    'PEPEUSD': 'PEPE/USD',
    'WIFUSD': 'WIF/USD',
    'BONKUSD': 'BONK/USD',
    'FLOKIUSD': 'FLOKI/USD',
    'NOTUSD': 'NOT/USD',
    'XAUUSD': 'XAU/USD',
    'XAGUSD': 'XAG/USD',
    'XPTUSD': 'XPT/USD',
    'USOIL': 'WTI/OIL',
    'BRENTOIL': 'BRENT/OIL',
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'AUDUSD': 'AUD/USD',
    'USDCAD': 'USD/CAD',
    'USDCHF': 'USD/CHF',
    'NZDUSD': 'NZD/USD',
    'EURGBP': 'EUR/GBP',
    'EURJPY': 'EUR/JPY',
    'EURAUD': 'EUR/AUD',
    'EURCAD': 'EUR/CAD',
    'EURCHF': 'EUR/CHF',
    'EURNZD': 'EUR/NZD',
    'GBPJPY': 'GBP/JPY',
    'GBPAUD': 'GBP/AUD',
    'GBPCAD': 'GBP/CAD',
    'GBPCHF': 'GBP/CHF',
    'GBPNZD': 'GBP/NZD',
    'AUDJPY': 'AUD/JPY',
    'CADJPY': 'CAD/JPY',
    'CHFJPY': 'CHF/JPY',
    'NZDJPY': 'NZD/JPY',
    'AUDCAD': 'AUD/CAD',
    'AUDCHF': 'AUD/CHF',
    'AUDNZD': 'AUD/NZD',
    'CADCHF': 'CAD/CHF',
    'NZDCAD': 'NZD/CAD',
    'NZDCHF': 'NZD/CHF',
    'USDTRY': 'USD/TRY',
    'USDZAR': 'USD/ZAR',
    'USDMXN': 'USD/MXN',
    'USDSGD': 'USD/SGD',
    'USDHKD': 'USD/HKD',
    'USDSEK': 'USD/SEK',
    'USDNOK': 'USD/NOK',
    'USDCNH': 'USD/CNH',
    'EURTRY': 'EUR/TRY',
    'USDINR': 'USD/INR',
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

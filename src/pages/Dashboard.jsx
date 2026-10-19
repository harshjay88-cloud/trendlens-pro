import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuthStore, useSignalStore, useThemeStore } from '../store/index.js';
import { useMarketStore } from '../store/marketStore.js';
import { MOCK_DAILY_TARGET, MOCK_ORDER_FLOW } from '../utils/mockData.js';
import {
  TrendingUp, TrendingDown, Zap, Target, Activity,
  Maximize2, Minimize2, Columns, LayoutGrid, Cpu, LineChart, Sparkles, XCircle, List, Sliders, Bell, Download, PlayCircle, PenTool
} from 'lucide-react';
import TrendLensUltraChart from '../components/common/TrendLensUltraChart.jsx';
import AiCoachChat from '../components/common/AiCoachChat.jsx';
import TradingViewLeftToolbar from '../components/common/TradingViewLeftToolbar.jsx';
import TradingViewWatchlist from '../components/common/TradingViewWatchlist.jsx';
import { ScalpTapeReader, OrderImbalanceMeter, ScalpStatsWidget } from '../components/common/ScalpEngineWidgets.jsx';
import { KillzoneScheduleWidget, DailyRangeVwapWidget, DayConfluenceWidget } from '../components/common/DayTradingWidgets.jsx';
import { MacroAlignmentWidget, SwingRiskRewardWidget, CotWhaleAccumulationWidget } from '../components/common/SwingEngineWidgets.jsx';
import MultiChartGrid from '../components/common/MultiChartGrid.jsx';
import BarReplayToolbar from '../components/common/BarReplayToolbar.jsx';
import AlertManagerModal from '../components/modals/AlertManagerModal.jsx';
import ManualProStudio from '../components/common/ManualProStudio.jsx';
import './Dashboard.css';

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon" style={{ '--ic': color }}><Icon size={16} /></div>
      </div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function DailyTargetWidget({ asset, currentPrice, bias = 'BULLISH' }) {
  const isHigh = currentPrice > 100;
  const fmt = (v) => isHigh ? v.toFixed(2) : v.toFixed(4);

  const tp1 = isHigh ? currentPrice + (currentPrice * 0.004) : currentPrice + 0.0030;
  const tp2 = isHigh ? currentPrice + (currentPrice * 0.0075) : currentPrice + 0.0060;
  const tp3 = isHigh ? currentPrice + (currentPrice * 0.012) : currentPrice + 0.0100;
  const s1  = isHigh ? currentPrice - (currentPrice * 0.0035) : currentPrice - 0.0025;
  const s2  = isHigh ? currentPrice - (currentPrice * 0.0065) : currentPrice - 0.0050;

  return (
    <div className="daily-target card">
      <div className="dt-header">
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>Daily Target Engine</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Session Projection · {asset}</div>
        </div>
        <div className={`bias-badge ${bias === 'BULLISH' ? 'buy' : 'sell'}`}>
          {bias === 'BULLISH' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {bias}
        </div>
      </div>
      <div className="dt-price">
        <span className="dt-price-label">Current {asset}</span>
        <span className="dt-price-val">{fmt(currentPrice)}</span>
      </div>
      <div className="dt-levels">
        <div className="dt-targets">
          <div className="dt-section-label">Targets (Magnet Levels)</div>
          <div className="dt-level">
            <span className="dt-level-badge buy">TP1</span>
            <span className="dt-level-price">{fmt(tp1)}</span>
            <span className="dt-level-status" style={{fontSize:'0.68rem', color:'var(--brand)'}}>94%</span>
          </div>
          <div className="dt-level">
            <span className="dt-level-badge buy">TP2</span>
            <span className="dt-level-price">{fmt(tp2)}</span>
            <span className="dt-level-status" style={{fontSize:'0.68rem', color:'var(--brand)'}}>88%</span>
          </div>
          <div className="dt-level">
            <span className="dt-level-badge buy">TP3</span>
            <span className="dt-level-price">{fmt(tp3)}</span>
            <span className="dt-level-status" style={{fontSize:'0.68rem', color:'var(--brand)'}}>72%</span>
          </div>
        </div>
        <div className="dt-support">
          <div className="dt-section-label">Support (Absorption Floor)</div>
          <div className="dt-level">
            <span className="dt-level-badge sell">S1</span>
            <span className="dt-level-price">{fmt(s1)}</span>
          </div>
          <div className="dt-level">
            <span className="dt-level-badge sell">S2</span>
            <span className="dt-level-price">{fmt(s2)}</span>
          </div>
        </div>
      </div>
      <div className="dt-whale">
        <span className="live-dot"></span>
        <span>Whale Activity: </span>
        <span style={{ color: 'var(--signal-buy)', fontWeight: 700 }}>ACCUMULATING (Absorption Verified)</span>
      </div>
    </div>
  );
}

function OrderFlowPanel({ data }) {
  return (
    <div className="orderflow card">
      <div className="of-header">
        <div className="section-label" style={{ marginBottom: 0 }}>Level-2 Order Flow Depth</div>
        <span className="live-dot"></span>
      </div>
      <div className="of-bars">
        <div className="of-bar-wrap">
          <div className="of-bar-label"><span style={{color:'var(--signal-buy)'}}>▲ BUY PRESSURE</span><span>{data.buyPct}%</span></div>
          <div className="of-bar">
            <div className="of-fill buy" style={{ width: data.buyPct + '%' }}></div>
          </div>
        </div>
        <div className="of-bar-wrap">
          <div className="of-bar-label"><span style={{color:'var(--signal-sell)'}}>▼ SELL PRESSURE</span><span>{data.sellPct}%</span></div>
          <div className="of-bar">
            <div className="of-fill sell" style={{ width: data.sellPct + '%' }}></div>
          </div>
        </div>
      </div>
      <div className="of-title">Institutional Tape Prints</div>
      <div className="of-orders">
        {data.bigOrders.map((o, i) => (
          <div key={i} className="of-order">
            <span className="of-time">{o.time}</span>
            <span className={`badge ${o.side === 'BUY' ? 'badge-buy' : 'badge-sell'}`} style={{fontSize:'0.65rem'}}>{o.side}</span>
            <span className="of-size">{o.size.toLocaleString()} lots</span>
            <span className="of-price">{o.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalFeed({ signals, currentAsset }) {
  const matching = signals.filter(s => s.asset === currentAsset);
  const displayList = matching.length > 0 ? matching : signals;

  return (
    <div className="signal-feed card">
      <div className="sf-header">
        <div className="section-label" style={{ marginBottom: 0 }}>
          Signals ({currentAsset})
        </div>
        <span className="badge badge-buy">LIVE</span>
      </div>
      <div className="sf-list">
        {displayList.slice(0, 5).map(sig => (
          <div key={sig.id} className="sf-item">
            <div className="sf-item-header">
              <span className={`badge ${sig.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{sig.direction}</span>
              <span className="sf-asset">{sig.asset}</span>
              <span className="sf-engine">{sig.engine}</span>
            </div>
            <div className="sf-levels">
              <span>Entry: <b>{typeof sig.entry?.min === 'number' ? sig.entry.min.toFixed(2) : sig.entry?.min}</b></span>
              <span>SL: <b style={{color:'var(--signal-sell)'}}>{typeof sig.stopLoss === 'number' ? sig.stopLoss.toFixed(2) : sig.stopLoss}</b></span>
              <span>TP1: <b style={{color:'var(--signal-buy)'}}>{typeof sig.targets?.tp1 === 'number' ? sig.targets.tp1.toFixed(2) : sig.targets?.tp1}</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { signals } = useSignalStore();
  const { theme, setTheme } = useThemeStore();
  const { prices, fetchLiveCrypto } = useMarketStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeEngine, setActiveEngine] = useState('smc_ultra'); // 'smc_ultra', 'scalp', 'day_trading', 'swing_4h'
  const [symbol, setSymbol] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState('60');
  const [isMaximized, setIsMaximized] = useState(false);
  const [chartFocusMode, setChartFocusMode] = useState(false);
  const [chartEngine, setChartEngine] = useState('ultra'); // 'ultra', 'scalper', 'day', 'swing'
  const [sideColTab, setSideColTab] = useState('coach'); // 'coach' or 'signals'
  const [showRightDrawer, setShowRightDrawer] = useState('watchlist'); // 'watchlist', 'coach', or null
  const [activeDrawingTool, setActiveDrawingTool] = useState('crosshair');
  const [activePlan, setActivePlan] = useState(null);
  const [showMultiGrid, setShowMultiGrid] = useState(false);
  const [gridLayout, setGridLayout] = useState('bot10'); // '2x1', '2x2', '3x2', '4x2', '4x4', 'bot10'
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [isBarReplayActive, setIsBarReplayActive] = useState(false);
  const [selectedRange, setSelectedRange] = useState('1D');

  const handleRangeSelect = (range) => {
    setSelectedRange(range);
    if (range === '1D') {
      setTimeframe('15');
    } else if (range === '5D') {
      setTimeframe('60');
    } else if (range === '1M') {
      setTimeframe('120');
    } else if (range === '3M') {
      setTimeframe('240');
    } else if (range === '6M') {
      setTimeframe('D');
    } else if (range === 'YTD') {
      setTimeframe('D');
    } else if (range === '1Y') {
      setTimeframe('D');
    } else if (range === '5Y') {
      setTimeframe('W');
    } else if (range === 'All') {
      setTimeframe('M');
    }
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Timestamp,Open,High,Low,Close,Volume,Signal,Strategy\n" +
      "2026-10-19 23:00,81950.00,82120.00,81900.00,82061.40,14250,BUY,SMC Asian Low Sweep\n" +
      "2026-10-19 22:00,81820.00,82000.00,81750.00,81950.00,12100,BUY,FVG Mitigation Zone\n" +
      "2026-10-19 21:00,81650.00,81880.00,81600.00,81820.00,9800,BUY,Orderblock Defense\n" +
      "2026-10-19 20:00,81700.00,81780.00,81500.00,81650.00,15400,WAIT,Liquidity Absorption\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TrendLens_40K_Bars_${symbol}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEngineSwitch = (eng) => {
    setActiveEngine(eng);
    if (eng === 'smc_ultra') {
      setChartEngine('ultra');
      setTimeframe('60');
    } else if (eng === 'scalp') {
      setChartEngine('scalper');
      setTimeframe('1');
    } else if (eng === 'day_trading') {
      setChartEngine('day');
      setTimeframe('15');
    } else if (eng === 'swing_4h') {
      setChartEngine('swing');
      setTimeframe('240');
    } else if (eng === 'manual_studio') {
      setChartEngine('manual');
      setTimeframe('60');
    }
  };

  // Poll live Bybit market ticker prices across dashboard
  useEffect(() => {
    fetchLiveCrypto();
    const iv = setInterval(fetchLiveCrypto, 4000);
    return () => clearInterval(iv);
  }, [fetchLiveCrypto]);

  // Allow ESC key to exit maximized chart
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  const symbolMap = {
    // Commodities & Metals
    'XAUUSD': 'XAU/USD',
    'XAGUSD': 'XAG/USD',
    'XPTUSD': 'XPT/USD',
    'USOIL':  'WTI/OIL',
    'BRENTOIL': 'BRENT/OIL',

    // ─── FOREX MAJORS & CROSSES (Full 38+ Pairs) ───
    // Majors
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'AUDUSD': 'AUD/USD',
    'USDCAD': 'USD/CAD',
    'USDCHF': 'USD/CHF',
    'NZDUSD': 'NZD/USD',

    // Euro Crosses
    'EURGBP': 'EUR/GBP',
    'EURJPY': 'EUR/JPY',
    'EURAUD': 'EUR/AUD',
    'EURCAD': 'EUR/CAD',
    'EURCHF': 'EUR/CHF',
    'EURNZD': 'EUR/NZD',

    // GBP Crosses
    'GBPJPY': 'GBP/JPY',
    'GBPAUD': 'GBP/AUD',
    'GBPCAD': 'GBP/CAD',
    'GBPCHF': 'GBP/CHF',
    'GBPNZD': 'GBP/NZD',

    // Yen Crosses
    'AUDJPY': 'AUD/JPY',
    'CADJPY': 'CAD/JPY',
    'CHFJPY': 'CHF/JPY',
    'NZDJPY': 'NZD/JPY',

    // Other Crosses
    'AUDCAD': 'AUD/CAD',
    'AUDCHF': 'AUD/CHF',
    'AUDNZD': 'AUD/NZD',
    'CADCHF': 'CAD/CHF',
    'NZDCAD': 'NZD/CAD',
    'NZDCHF': 'NZD/CHF',

    // Exotics & Emerging
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

    // ─── CRYPTOCURRENCIES (Comprehensive Top 55+ Coins) ───
    // Layer 1 & Major Bluechips
    'BTCUSD': 'BTC/USD',
    'ETHUSD': 'ETH/USD',
    'SOLUSD': 'SOL/USD',
    'BNBUSD': 'BNB/USD',
    'XRPUSD': 'XRP/USD',
    'ADAUSD': 'ADA/USD',
    'AVAXUSD': 'AVAX/USD',
    'SUIUSD': 'SUI/USD',
    'NEARUSD': 'NEAR/USD',
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

    // Layer 2 & Scaling
    'ARBUSD': 'ARB/USD',
    'OPUSD': 'OP/USD',
    'STRKUSD': 'STRK/USD',
    'IMXUSD': 'IMX/USD',

    // DeFi & Infrastructure
    'LINKUSD': 'LINK/USD',
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

    // AI & Data / DePIN
    'RENDERUSD': 'RENDER/USD',
    'TAOUSD': 'TAO/USD',
    'FETUSD': 'FET/USD',
    'FILUSD': 'FIL/USD',
    'WLDUSD': 'WLD/USD',
    'JASMYUSD': 'JASMY/USD',
    'STXUSD': 'STX/USD',
    'ORDIUSD': 'ORDI/USD',

    // Meme & High-Beta
    'DOGEUSD': 'DOGE/USD',
    'SHIBUSD': 'SHIB/USD',
    'PEPEUSD': 'PEPE/USD',
    'WIFUSD': 'WIF/USD',
    'BONKUSD': 'BONK/USD',
    'FLOKIUSD': 'FLOKI/USD',
    'NOTUSD': 'NOT/USD',

    // Major Indices
    'NAS100': 'NAS100',
    'US30': 'US30',
    'SPX500': 'SPX500',
    'GER40': 'GER40',
  };

  const currentAsset = symbolMap[symbol] || 'XAU/USD';
  const assetData = prices[currentAsset] || { price: 2645.82, change: 12.34, changePct: 0.47 };
  const currentPrice = assetData.price ?? 2645.82;
  const currentChange = assetData.change ?? 12.34;
  const currentPct = assetData.changePct ?? 0.47;

  const activeCount = signals.filter(s => s.status === 'active' || s.status.includes('tp')).length;

  const ALL_TIMEFRAMES = [
    // Seconds (HFT / Micro-Scalp)
    { label: '1s',  val: '1S',  cat: '⚡ Seconds (Micro-Scalp)' },
    { label: '3s',  val: '3S',  cat: '⚡ Seconds (Micro-Scalp)' },
    { label: '5s',  val: '5S',  cat: '⚡ Seconds (Micro-Scalp)' },
    { label: '10s', val: '10S', cat: '⚡ Seconds (Micro-Scalp)' },
    { label: '30s', val: '30S', cat: '⚡ Seconds (Micro-Scalp)' },
    // Minutes (Intraday & Scalp)
    { label: '1m',  val: '1',   cat: '⏱️ Minutes (Intraday)' },
    { label: '3m',  val: '3',   cat: '⏱️ Minutes (Intraday)' },
    { label: '5m',  val: '5',   cat: '⏱️ Minutes (Intraday)' },
    { label: '15m', val: '15',  cat: '⏱️ Minutes (Intraday)' },
    { label: '30m', val: '30',  cat: '⏱️ Minutes (Intraday)' },
    { label: '45m', val: '45',  cat: '⏱️ Minutes (Intraday)' },
    // Hours (Swing Structure)
    { label: '1h',  val: '60',  cat: '📈 Hours (Swing Structure)' },
    { label: '2h',  val: '120', cat: '📈 Hours (Swing Structure)' },
    { label: '3h',  val: '180', cat: '📈 Hours (Swing Structure)' },
    { label: '4h',  val: '240', cat: '📈 Hours (Swing Structure)' },
    { label: '12h', val: '720', cat: '📈 Hours (Swing Structure)' },
    // Days & Macro
    { label: '1D',  val: 'D',   cat: '📅 Days & Macro' },
    { label: '3D',  val: '3D',  cat: '📅 Days & Macro' },
    { label: '1W',  val: 'W',   cat: '📅 Days & Macro' },
    { label: '30D', val: 'M',   cat: '📅 Days & Macro' },
  ];

  const engineQuickTFs = activeEngine === 'scalp'
    ? ['1s', '5s', '1m', '3m', '5m']
    : activeEngine === 'day_trading'
    ? ['5m', '15m', '30m', '1h']
    : activeEngine === 'swing_4h'
    ? ['1h', '2h', '4h', '1D', '1W']
    : ['15m', '1h', '4h', '1D'];

  return (
    <div className="app-layout">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="app-main">
        {/* Top 4 Dedicated Engine Selector Bar */}
        <div className="dash-view-selector-bar">
          <div className="dash-view-tabs">
            <button
              type="button"
              className={`dash-view-tab ${activeEngine === 'smc_ultra' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('smc_ultra')}
              title="Institutional SMC Ultra Engine (Order Blocks, FVG, Liquidity Sweeps)"
            >
              <Cpu size={15} />
              <span>🎯 SMC Ultra Engine</span>
            </button>
            <button
              type="button"
              className={`dash-view-tab ${activeEngine === 'scalp' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('scalp')}
              title="High-Frequency Flow Scalper (M1 / M5 Micro-Orderflow Imbalance)"
            >
              <Zap size={15} />
              <span>⚡ Fast Scalp Engine (M1/M5)</span>
            </button>
            <button
              type="button"
              className={`dash-view-tab ${activeEngine === 'day_trading' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('day_trading')}
              title="Intraday Session Engine (Asian, London, NY Killzones & VWAP)"
            >
              <Activity size={15} />
              <span>☀️ Day Trading Engine (M15/H1)</span>
            </button>
            <button
              type="button"
              className={`dash-view-tab ${activeEngine === 'swing_4h' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('swing_4h')}
              title="4-Hours Macro Swing Engine (H4 / D1 Multi-Day Structure)"
            >
              <TrendingUp size={15} />
              <span>📈 4-Hours Swing Engine (H4/D1)</span>
            </button>
            <button
              type="button"
              className={`dash-view-tab ${activeEngine === 'manual_studio' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('manual_studio')}
              title="TradingView Pro Manual Studio (50+ Indicators, VPVR, Renko, 18 Tools)"
            >
              <PenTool size={15} />
              <span>🎨 Manual Pro Studio (Full Kit)</span>
            </button>
          </div>

          <div className="dash-view-actions">
            {/* Multi-Chart Matrix (16 Charts / 10-Coin Bot) */}
            <button
              type="button"
              className={`btn btn-sm ${showMultiGrid ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setShowMultiGrid(!showMultiGrid)}
              title="Parallel Multi-Chart Grid (16 Charts / 10-Coin Bot Matrix)"
              style={{ fontSize: '0.74rem', gap: 5, padding: '4px 9px', color: '#ffffff' }}
            >
              <LayoutGrid size={14} />
              <span>{showMultiGrid ? 'Single Engine' : '10-Coin Matrix'}</span>
            </button>

            {/* Bar Replay Simulation Toggle */}
            <button
              type="button"
              className={`btn btn-sm ${isBarReplayActive ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setIsBarReplayActive(!isBarReplayActive)}
              title="Bar Replay: Replay Historical Candles Bar-by-Bar"
              style={{ fontSize: '0.74rem', gap: 5, padding: '4px 9px', color: '#ffffff' }}
            >
              <PlayCircle size={14} />
              <span>Bar Replay</span>
            </button>

            {/* Multi-Condition Technical Alerts */}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setShowAlertModal(true)}
              title="Multi-Condition Alerts (1,000 Alerts Capacity)"
              style={{ fontSize: '0.74rem', gap: 5, padding: '4px 9px', color: '#ffffff' }}
            >
              <Bell size={14} />
              <span>1,000 Alerts</span>
            </button>

            {/* Export 40K Historical Bars */}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleExportData}
              title="Export 40K Historical Bars & Technical Indicators to CSV"
              style={{ fontSize: '0.74rem', gap: 5, padding: '4px 8px', color: '#ffffff' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            {/* Theme Toggles */}
            <div className="theme-quick-toggles">
              <button
                type="button"
                className={`theme-pill ${theme === 'tl-dark' ? 'active' : ''}`}
                onClick={() => setTheme('tl-dark')}
                title="TradingView Dark (#131722)"
              >
                🌑 Dark
              </button>
              <button
                type="button"
                className={`theme-pill ${theme === 'tl-black-red' ? 'active' : ''}`}
                onClick={() => setTheme('tl-black-red')}
                title="Black & Red Pro Theme (#060608 + #f23645)"
              >
                🔴 Black &amp; Red
              </button>
              <button
                type="button"
                className={`theme-pill ${theme === 'tl-light' ? 'active' : ''}`}
                onClick={() => setTheme('tl-light')}
                title="Clean Light Mode (#ffffff)"
              >
                ☀️ Light
              </button>
            </div>
          </div>
        </div>

        {/* Engine Status Sub-Header */}
        <div className="engine-status-bar">
          <div className="engine-status-left">
            <span className="engine-status-pulse"></span>
            <span className="engine-status-title">
              {activeEngine === 'smc_ultra' && 'INSTITUTIONAL SMC ULTRA · ORDER BLOCKS · FVG MITIGATION · LIQUIDITY SWEEPS · BOOKMAP INFERNO HEATMAP'}
              {activeEngine === 'scalp' && 'MICRO-ORDERFLOW FLOW SCALPER · M1/M5 FAST TICKS · TAPE MOMENTUM · BOOKMAP WALL DEFENSE'}
              {activeEngine === 'day_trading' && 'INTRADAY KILLZONE ENGINE · ASIAN/LONDON/NY SESSIONS · VWAP BANDS · EQUILIBRIUM RETRACEMENTS'}
              {activeEngine === 'swing_4h' && '4-HOURS MACRO SWING ENGINE · H4/D1 MULTI-DAY STRUCTURE · 1:3+ R:R ASYMMETRIC TARGETS'}
              {activeEngine === 'manual_studio' && 'TRADINGVIEW PRO MANUAL STUDIO · 50+ TECHNICAL INDICATORS · VOLUME PROFILE VPVR / POC · HEIKIN ASHI / RENKO · 18 DRAWING TOOLS'}
            </span>
          </div>
          <div className="engine-status-right">
            <span className="engine-tag-pill">AI Confluence: 96%</span>
            <span className="engine-tag-pill live">STREAMING LIVE</span>
          </div>
        </div>

        {/* Bar Replay Toolbar if active */}
        {isBarReplayActive && (
          <BarReplayToolbar
            isActive={isBarReplayActive}
            onClose={() => setIsBarReplayActive(false)}
            onStepForward={() => {}}
            onReset={() => {}}
          />
        )}

        {/* Main View: Multi-Chart Grid OR Manual Pro Studio OR Dedicated Engine */}
        {showMultiGrid ? (
          <MultiChartGrid
            gridLayout={gridLayout}
            prices={prices}
            onSelectCoin={(coinSym) => {
              setSymbol(coinSym);
              setShowMultiGrid(false);
            }}
            onCloseGrid={() => setShowMultiGrid(false)}
          />
        ) : activeEngine === 'manual_studio' ? (
          <ManualProStudio
            asset={currentAsset}
            symbol={symbol}
            prices={prices}
            initialPrice={currentPrice}
            theme={theme}
            onSelectSymbol={(newSym) => {
              setSymbol(newSym);
            }}
          />
        ) : (
        <div className="dashboard-content">
          {/* Greeting */}
          <div className="dash-greeting">
            <div>
              <h2>Welcome back, <span className="text-brand">{user?.username}</span> {user?.avatar}</h2>
              <p>Institutional Order Flow &amp; AI Intelligence Dashboard.</p>
            </div>
            <div className={`bias-badge ${MOCK_DAILY_TARGET.bias === 'BULLISH' ? 'buy' : 'sell'} big`}>
              {MOCK_DAILY_TARGET.bias === 'BULLISH' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              Session Bias: {MOCK_DAILY_TARGET.bias}
            </div>
          </div>

          {/* Stats Row */}
          <div className="dash-stats">
            <StatCard
              label={`Live ${currentAsset}`}
              value={currentPrice > 100 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPrice.toFixed(4)}
              sub={`${currentChange >= 0 ? '+' : ''}${currentChange.toFixed(2)} (${currentPct >= 0 ? '+' : ''}${currentPct}%)`}
              icon={TrendingUp}
              color="var(--brand)"
            />
            <StatCard
              label="Active Signals"
              value={`${activeCount}`}
              sub="Multi-engine algorithmic feed"
              icon={Zap}
              color="var(--signal-buy)"
            />
            <StatCard
              label="Your Win Rate"
              value={`${user?.stats?.winRate}%`}
              sub="GoldVIP verified performance"
              icon={Target}
              color="var(--signal-neutral)"
            />
            <StatCard
              label="Total Pips"
              value={`+${user?.stats?.pips}`}
              sub={`${user?.stats?.streak} day winning streak 🔥`}
              icon={Activity}
              color="var(--gold)"
            />
          </div>

          {/* Chart + Feed Area */}
          <div className={`dash-main-row ${chartFocusMode ? 'focus-chart' : ''}`}>
            {/* Chart Wrap */}
            <div className={`dash-chart-wrap ${isMaximized ? 'maximized' : ''}`}>
              <div className="chart-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Active Engine Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#ffffff'
                  }}>
                    {activeEngine === 'smc_ultra' && <><Cpu size={14} color="var(--brand)" /> <span>SMC Ultra (Institutional)</span></>}
                    {activeEngine === 'scalp' && <><Zap size={14} color="var(--signal-buy)" /> <span>Flow Scalper (M1/M5)</span></>}
                    {activeEngine === 'day_trading' && <><Activity size={14} color="var(--signal-neutral)" /> <span>Intraday Day Trader</span></>}
                    {activeEngine === 'swing_4h' && <><TrendingUp size={14} color="var(--gold)" /> <span>4H Macro Swing</span></>}
                  </div>

                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      maxWidth: '260px'
                    }}
                  >
                    <optgroup label="Commodities & Metals">
                      <option value="XAUUSD">XAU/USD · Gold Spot</option>
                      <option value="XAGUSD">XAG/USD · Silver Spot</option>
                      <option value="XPTUSD">XPT/USD · Platinum Spot</option>
                      <option value="USOIL">USOIL · WTI Crude Oil</option>
                      <option value="BRENTOIL">BRENT · Brent Crude Oil</option>
                    </optgroup>
                    <optgroup label="Forex — Majors (7 Pairs)">
                      <option value="EURUSD">EUR/USD · Euro / US Dollar</option>
                      <option value="GBPUSD">GBP/USD · British Pound / USD</option>
                      <option value="USDJPY">USD/JPY · US Dollar / Yen</option>
                      <option value="AUDUSD">AUD/USD · Australian Dollar</option>
                      <option value="USDCAD">USD/CAD · US Dollar / CAD</option>
                      <option value="USDCHF">USD/CHF · US Dollar / Swiss Franc</option>
                      <option value="NZDUSD">NZD/USD · New Zealand Dollar</option>
                    </optgroup>
                    <optgroup label="Forex — Euro Crosses">
                      <option value="EURGBP">EUR/GBP · Euro / British Pound</option>
                      <option value="EURJPY">EUR/JPY · Euro / Japanese Yen</option>
                      <option value="EURAUD">EUR/AUD · Euro / Aussie</option>
                      <option value="EURCAD">EUR/CAD · Euro / Canadian Dollar</option>
                      <option value="EURCHF">EUR/CHF · Euro / Swiss Franc</option>
                      <option value="EURNZD">EUR/NZD · Euro / New Zealand Dollar</option>
                    </optgroup>
                    <optgroup label="Forex — GBP Crosses">
                      <option value="GBPJPY">GBP/JPY · British Pound / Yen</option>
                      <option value="GBPAUD">GBP/AUD · Pound / Aussie</option>
                      <option value="GBPCAD">GBP/CAD · Pound / Canadian Dollar</option>
                      <option value="GBPCHF">GBP/CHF · Pound / Swiss Franc</option>
                      <option value="GBPNZD">GBP/NZD · Pound / New Zealand Dollar</option>
                    </optgroup>
                    <optgroup label="Forex — Yen Crosses">
                      <option value="AUDJPY">AUD/JPY · Aussie / Japanese Yen</option>
                      <option value="CADJPY">CAD/JPY · Canadian Dollar / Yen</option>
                      <option value="CHFJPY">CHF/JPY · Swiss Franc / Yen</option>
                      <option value="NZDJPY">NZD/JPY · New Zealand Dollar / Yen</option>
                    </optgroup>
                    <optgroup label="Forex — Oceania & Other Crosses">
                      <option value="AUDCAD">AUD/CAD · Aussie / Canadian Dollar</option>
                      <option value="AUDCHF">AUD/CHF · Aussie / Swiss Franc</option>
                      <option value="AUDNZD">AUD/NZD · Aussie / Kiwi Dollar</option>
                      <option value="CADCHF">CAD/CHF · CAD / Swiss Franc</option>
                      <option value="NZDCAD">NZD/CAD · Kiwi / Canadian Dollar</option>
                      <option value="NZDCHF">NZD/CHF · Kiwi / Swiss Franc</option>
                    </optgroup>
                    <optgroup label="Forex — Emerging & Exotics">
                      <option value="USDTRY">USD/TRY · US Dollar / Turkish Lira</option>
                      <option value="USDZAR">USD/ZAR · US Dollar / South African Rand</option>
                      <option value="USDMXN">USD/MXN · US Dollar / Mexican Peso</option>
                      <option value="USDSGD">USD/SGD · US Dollar / Singapore Dollar</option>
                      <option value="USDHKD">USD/HKD · US Dollar / Hong Kong Dollar</option>
                      <option value="USDSEK">USD/SEK · US Dollar / Swedish Krona</option>
                      <option value="USDNOK">USD/NOK · US Dollar / Norwegian Krone</option>
                      <option value="USDCNH">USD/CNH · US Dollar / Chinese Yuan</option>
                      <option value="EURTRY">EUR/TRY · Euro / Turkish Lira</option>
                      <option value="USDINR">USD/INR · US Dollar / Indian Rupee</option>
                    </optgroup>
                    <optgroup label="Crypto — Layer 1 & Major Bluechips">
                      <option value="BTCUSD">BTC/USD · Bitcoin</option>
                      <option value="ETHUSD">ETH/USD · Ethereum</option>
                      <option value="SOLUSD">SOL/USD · Solana</option>
                      <option value="BNBUSD">BNB/USD · Binance Coin</option>
                      <option value="XRPUSD">XRP/USD · Ripple</option>
                      <option value="ADAUSD">ADA/USD · Cardano</option>
                      <option value="AVAXUSD">AVAX/USD · Avalanche</option>
                      <option value="SUIUSD">SUI/USD · Sui Network</option>
                      <option value="NEARUSD">NEAR/USD · Near Protocol</option>
                      <option value="APTUSD">APT/USD · Aptos</option>
                      <option value="TONUSD">TON/USD · Toncoin</option>
                      <option value="DOTUSD">DOT/USD · Polkadot</option>
                      <option value="LTCUSD">LTC/USD · Litecoin</option>
                      <option value="MATICUSD">MATIC/USD · Polygon</option>
                      <option value="ATOMUSD">ATOM/USD · Cosmos</option>
                      <option value="FTMUSD">FTM/USD · Fantom / Sonic</option>
                      <option value="ALGOUSD">ALGO/USD · Algorand</option>
                      <option value="ICPUSD">ICP/USD · Internet Computer</option>
                      <option value="KASUSD">KAS/USD · Kaspa</option>
                      <option value="SEIUSD">SEI/USD · Sei Network</option>
                    </optgroup>
                    <optgroup label="Crypto — Layer 2 & Scaling">
                      <option value="ARBUSD">ARB/USD · Arbitrum</option>
                      <option value="OPUSD">OP/USD · Optimism</option>
                      <option value="STRKUSD">STRK/USD · Starknet</option>
                      <option value="IMXUSD">IMX/USD · ImmutableX</option>
                    </optgroup>
                    <optgroup label="Crypto — DeFi & Infrastructure">
                      <option value="LINKUSD">LINK/USD · Chainlink</option>
                      <option value="UNIUSD">UNI/USD · Uniswap</option>
                      <option value="AAVEUSD">AAVE/USD · Aave</option>
                      <option value="MKRUSD">MKR/USD · Maker</option>
                      <option value="INJUSD">INJ/USD · Injective</option>
                      <option value="TIAUSD">TIA/USD · Celestia</option>
                      <option value="RUNEUSD">RUNE/USD · THORChain</option>
                      <option value="PENDLEUSD">PENDLE/USD · Pendle</option>
                      <option value="JUPUSD">JUP/USD · Jupiter</option>
                      <option value="ENAUSD">ENA/USD · Ethena</option>
                      <option value="PYTHUSD">PYTH/USD · Pyth Network</option>
                      <option value="ONDOUSD">ONDO/USD · Ondo Finance</option>
                    </optgroup>
                    <optgroup label="Crypto — AI & Data / DePIN">
                      <option value="RENDERUSD">RENDER/USD · Render Token</option>
                      <option value="TAOUSD">TAO/USD · Bittensor</option>
                      <option value="FETUSD">FET/USD · Artificial Superintelligence</option>
                      <option value="FILUSD">FIL/USD · Filecoin</option>
                      <option value="WLDUSD">WLD/USD · Worldcoin</option>
                      <option value="JASMYUSD">JASMY/USD · JasmyCoin</option>
                      <option value="STXUSD">STX/USD · Stacks</option>
                      <option value="ORDIUSD">ORDI/USD · Ordinals</option>
                    </optgroup>
                    <optgroup label="Crypto — Meme & High-Beta">
                      <option value="DOGEUSD">DOGE/USD · Dogecoin</option>
                      <option value="SHIBUSD">SHIB/USD · Shiba Inu</option>
                      <option value="PEPEUSD">PEPE/USD · Pepe Token</option>
                      <option value="WIFUSD">WIF/USD · dogwifhat</option>
                      <option value="BONKUSD">BONK/USD · Bonk</option>
                      <option value="FLOKIUSD">FLOKI/USD · Floki</option>
                      <option value="NOTUSD">NOT/USD · Notcoin</option>
                    </optgroup>
                    <optgroup label="Major Global Indices">
                      <option value="NAS100">NAS100 · Nasdaq 100</option>
                      <option value="US30">US30 · Dow Jones 30</option>
                      <option value="SPX500">SPX500 · S&amp;P 500</option>
                      <option value="GER40">GER40 · DAX 40 Index</option>
                    </optgroup>
                  </select>
                  <span className="live-dot" title="Live Streaming"></span>
                </div>

                {/* Right controls: Timeframe + Layout & Maximize */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {engineQuickTFs.map(lbl => {
                      const tfObj = ALL_TIMEFRAMES.find(t => t.label === lbl);
                      const isSelected = timeframe === tfObj?.val || timeframe === lbl;
                      return (
                        <button
                          key={lbl}
                          onClick={() => setTimeframe(tfObj ? tfObj.val : lbl)}
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '4px 8px', fontSize: '0.74rem', minWidth: '32px' }}
                        >
                          {lbl}
                        </button>
                      );
                    })}

                    {/* TradingView-style Dropdown Selector for All 1s - 30D Timeframes */}
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      title="Select TradingView Timeframe (1s to 30D)"
                      style={{
                        background: 'var(--bg-card)',
                        color: 'var(--brand)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <optgroup label="⚡ Seconds (Micro-Scalp)">
                        <option value="1S">1s · 1 Second</option>
                        <option value="3S">3s · 3 Seconds</option>
                        <option value="5S">5s · 5 Seconds</option>
                        <option value="10S">10s · 10 Seconds</option>
                        <option value="30S">30s · 30 Seconds</option>
                      </optgroup>
                      <optgroup label="⏱️ Minutes (Intraday)">
                        <option value="1">1m · 1 Minute</option>
                        <option value="3">3m · 3 Minutes</option>
                        <option value="5">5m · 5 Minutes</option>
                        <option value="15">15m · 15 Minutes</option>
                        <option value="30">30m · 30 Minutes</option>
                        <option value="45">45m · 45 Minutes</option>
                      </optgroup>
                      <optgroup label="📈 Hours (Swing Structure)">
                        <option value="60">1h · 1 Hour</option>
                        <option value="120">2h · 2 Hours</option>
                        <option value="180">3h · 3 Hours</option>
                        <option value="240">4h · 4 Hours</option>
                        <option value="720">12h · 12 Hours</option>
                      </optgroup>
                      <optgroup label="📅 Days & Macro (1D - 30D)">
                        <option value="D">1D · 1 Day</option>
                        <option value="3D">3D · 3 Days</option>
                        <option value="W">1W · 1 Week</option>
                        <option value="M">30D · 1 Month</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="chart-ctrl-divider"></div>

                  {/* Priority Chart Focus Toggle */}
                  <button
                    className={`btn btn-sm ${chartFocusMode ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setChartFocusMode(!chartFocusMode)}
                    title={chartFocusMode ? "Split Layout (Show Feed)" : "Priority Chart Mode (Full Width)"}
                    style={{ gap: 6, fontSize: '0.74rem' }}
                  >
                    <Columns size={13} />
                    <span className="btn-label-hide-mobile">{chartFocusMode ? "Split View" : "Full Width"}</span>
                  </button>

                  {/* Active AI Plan Banner if drawn */}
                  {activePlan && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(233,185,73,0.12)', border: '1px solid #e9b949', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', color: '#e9b949' }}>
                      <span>🎯 Drawn: {activePlan.type} · TP {activePlan.target}</span>
                      <button onClick={() => setActivePlan(null)} style={{ background: 'none', border: 'none', color: '#f0566b', cursor: 'pointer', display: 'flex', padding: 0 }} title="Clear Drawn Plan">
                        <XCircle size={13} />
                      </button>
                    </div>
                  )}

                  {/* Maximize Fullscreen Terminal Mode */}
                  <button
                    className={`btn btn-sm ${isMaximized ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setIsMaximized(!isMaximized)}
                    title={isMaximized ? "Exit Fullscreen (ESC)" : "Maximize Chart (Full Screen Terminal)"}
                    style={{ gap: 6, fontSize: '0.74rem' }}
                  >
                    {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span>{isMaximized ? "Exit" : "Maximize"}</span>
                  </button>
                </div>
              </div>

              {/* Full TradingView Terminal Layout: Left Toolbar + Chart Center + Right Drawer + Icon Rail */}
              <div className="tv-terminal-wrapper">
                {/* 1. Left Vertical Drawing Toolbar */}
                <TradingViewLeftToolbar
                  activeTool={activeDrawingTool}
                  onSelectTool={(toolId) => {
                    setActiveDrawingTool(toolId);
                  }}
                  onClearDrawings={() => {
                    window.dispatchEvent(new CustomEvent('trendlens_clear_drawings'));
                  }}
                />

                {/* 2. Center Chart Workspace */}
                <div className="tv-center-workspace">
                  {/* Chart Container: Dedicated Engine High-Resolution Canvas */}
                  <div className="chart-container" style={{ flex: 1, minHeight: '520px', height: '100%', background: 'var(--bg-primary, #131722)' }}>
                    <TrendLensUltraChart
                      asset={currentAsset}
                      initialPrice={currentPrice}
                      category={assetData?.category || 'Metals'}
                      timeframe={ALL_TIMEFRAMES.find(t => t.val === timeframe)?.label || timeframe}
                      range={selectedRange}
                      onRangeChange={handleRangeSelect}
                      activeDrawingTool={activeDrawingTool}
                      onSelectDrawingTool={setActiveDrawingTool}
                      engineMode={chartEngine}
                      activePlan={activePlan}
                    />
                  </div>

                  {/* 3. Bottom Time Toolbar */}
                  <div className="tv-bottom-timebar">
                    <div className="tv-time-shortcuts">
                      {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'].map(range => (
                        <button
                          key={range}
                          className={`tv-time-btn ${selectedRange === range ? 'active' : ''}`}
                          onClick={() => handleRangeSelect(range)}
                          title={`Switch Chart Range to ${range}`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                    <div className="tv-time-clock">
                      <span style={{ color: 'var(--signal-buy, #089981)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal-buy, #089981)' }} />
                        Market Open
                      </span>
                      <span>23:54:11 (UTC)</span>
                    </div>
                  </div>
                </div>

                {/* 4. Right Collapsible Watchlist & Detail Drawer */}
                {showRightDrawer === 'watchlist' && (
                  <TradingViewWatchlist
                    prices={prices}
                    selectedSymbol={symbol}
                    onSelectSymbol={(newSym) => setSymbol(newSym)}
                    onOpenBot={() => window.dispatchEvent(new CustomEvent('trendlens_toggle_bot_panel'))}
                  />
                )}

                {showRightDrawer === 'coach' && (
                  <div className="tv-side-drawer-container">
                    <AiCoachChat
                      currentAsset={currentAsset}
                      currentPrice={currentPrice}
                      category={assetData?.category || 'Metals'}
                      onDrawPlan={(plan) => {
                        setActivePlan(plan);
                        setChartEngine('ultra');
                      }}
                    />
                  </div>
                )}

                {showRightDrawer === 'signals' && (
                  <div className="tv-side-drawer-container" style={{ padding: '12px' }}>
                    <SignalFeed signals={signals} currentAsset={currentAsset} />
                  </div>
                )}

                {/* 5. Rightmost 44px Icon Rail */}
                <div className="tv-right-icon-rail">
                  <button
                    className={`tv-rail-btn ${showRightDrawer === 'watchlist' ? 'active' : ''}`}
                    onClick={() => setShowRightDrawer(showRightDrawer === 'watchlist' ? null : 'watchlist')}
                    title="Watchlist, Details & News"
                  >
                    <List size={16} />
                  </button>
                  <button
                    className={`tv-rail-btn ${showRightDrawer === 'coach' ? 'active' : ''}`}
                    onClick={() => setShowRightDrawer(showRightDrawer === 'coach' ? null : 'coach')}
                    title="AI Trading Coach (Sinhala Narration)"
                  >
                    <Sparkles size={16} />
                  </button>
                  <button
                    className={`tv-rail-btn ${showRightDrawer === 'signals' ? 'active' : ''}`}
                    onClick={() => setShowRightDrawer(showRightDrawer === 'signals' ? null : 'signals')}
                    title="Live Signal Feed"
                  >
                    <Zap size={16} />
                  </button>
                  <button
                    className="tv-rail-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('trendlens_toggle_bot_panel'))}
                    title="10-Coin Institutional AI Bot"
                  >
                    <Cpu size={16} />
                  </button>
                  <div style={{ width: 20, height: 1, background: 'var(--border, #2a2e39)', margin: '4px 0' }} />
                  <button
                    className="tv-rail-btn"
                    onClick={() => {
                      const nextTheme = theme === 'tl-black-red' ? 'tl-dark' : 'tl-black-red';
                      setTheme(nextTheme);
                    }}
                    title={`Toggle Theme: ${theme === 'tl-black-red' ? 'TradingView Dark' : 'Black & Red Pro'}`}
                    style={{ fontSize: '0.90rem' }}
                  >
                    {theme === 'tl-black-red' ? '🔴' : '🌑'}
                  </button>
                  <button
                    className={`tv-rail-btn ${isMaximized ? 'active' : ''}`}
                    onClick={() => setIsMaximized(!isMaximized)}
                    title={isMaximized ? "Exit Fullscreen (ESC)" : "Maximize Terminal"}
                  >
                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row — Engine-Specific Specialized Analytics */}
          <div className="dash-bottom-row">
            {activeEngine === 'smc_ultra' && (
              <>
                <DailyTargetWidget asset={currentAsset} currentPrice={currentPrice} />
                <OrderFlowPanel data={MOCK_ORDER_FLOW} />
                <div className="whale-alerts card">
                  <div className="section-label" style={{ marginBottom: 12 }}>Institutional Whale Alerts ({currentAsset})</div>
                  {[
                    { time: '14:32', msg: `BUYING ABSORPTION @ ${currentPrice > 100 ? (currentPrice * 0.998).toFixed(2) : (currentPrice * 0.998).toFixed(4)} — 15,400 lots`, side: 'BUY' },
                    { time: '14:18', msg: `LARGE BUY ORDER DETECTED @ ${currentPrice > 100 ? (currentPrice * 0.997).toFixed(2) : (currentPrice * 0.997).toFixed(4)} — 22,000 lots`, side: 'BUY' },
                    { time: '13:55', msg: `Sell pressure detected at ${currentPrice > 100 ? (currentPrice * 1.002).toFixed(2) : (currentPrice * 1.002).toFixed(4)} — 8,700 lots`, side: 'SELL' },
                    { time: '13:41', msg: `Institutional iceberg buy filled — 31,200 lots`, side: 'BUY' },
                  ].map((a, i) => (
                    <div key={i} className="whale-alert-item">
                      <div className="whale-alert-top">
                        <span className={`badge ${a.side === 'BUY' ? 'badge-buy' : 'badge-sell'}`} style={{fontSize:'0.65rem'}}>🐋 {a.side}</span>
                        <span className="whale-time">{a.time}</span>
                      </div>
                      <div className="whale-msg">{a.msg}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeEngine === 'scalp' && (
              <>
                <ScalpTapeReader currentPrice={currentPrice} asset={currentAsset} />
                <OrderImbalanceMeter />
                <ScalpStatsWidget />
              </>
            )}

            {activeEngine === 'day_trading' && (
              <>
                <KillzoneScheduleWidget />
                <DailyRangeVwapWidget currentPrice={currentPrice} asset={currentAsset} />
                <DayConfluenceWidget />
              </>
            )}

            {activeEngine === 'swing_4h' && (
              <>
                <MacroAlignmentWidget />
                <SwingRiskRewardWidget currentPrice={currentPrice} />
                <CotWhaleAccumulationWidget />
              </>
            )}
          </div>
        </div>
        )}

        {/* Multi-Condition Price & Technical Alert Modal */}
        <AlertManagerModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          currentPrice={currentPrice}
          asset={currentAsset}
        />
      </main>
    </div>
  );
}

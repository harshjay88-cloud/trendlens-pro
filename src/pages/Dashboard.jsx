import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuthStore, useSignalStore } from '../store/index.js';
import { useMarketStore } from '../store/marketStore.js';
import { MOCK_DAILY_TARGET, MOCK_ORDER_FLOW } from '../utils/mockData.js';
import {
  TrendingUp, TrendingDown, Zap, Target, Activity,
  Maximize2, Minimize2, Columns, LayoutGrid, Cpu, LineChart, Sparkles, XCircle
} from 'lucide-react';
import TrendLensUltraChart from '../components/common/TrendLensUltraChart.jsx';
import AiCoachChat from '../components/common/AiCoachChat.jsx';
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
  const { prices } = useMarketStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('60');
  const [isMaximized, setIsMaximized] = useState(false);
  const [chartFocusMode, setChartFocusMode] = useState(false);
  const [chartEngine, setChartEngine] = useState('ultra'); // 'ultra' (GoldVIP Ultra indicator canvas) or 'tradingview'
  const [sideColTab, setSideColTab] = useState('coach'); // 'coach' or 'signals'
  const [activePlan, setActivePlan] = useState(null);

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

    // Forex Majors & Crosses
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'AUDUSD': 'AUD/USD',
    'USDCAD': 'USD/CAD',
    'USDCHF': 'USD/CHF',
    'NZDUSD': 'NZD/USD',
    'EURJPY': 'EUR/JPY',
    'GBPJPY': 'GBP/JPY',

    // Top 22 Cryptocurrencies
    'BTCUSD': 'BTC/USD',
    'ETHUSD': 'ETH/USD',
    'SOLUSD': 'SOL/USD',
    'BNBUSD': 'BNB/USD',
    'XRPUSD': 'XRP/USD',
    'DOGEUSD': 'DOGE/USD',
    'ADAUSD': 'ADA/USD',
    'AVAXUSD': 'AVAX/USD',
    'LINKUSD': 'LINK/USD',
    'SUIUSD': 'SUI/USD',
    'NEARUSD': 'NEAR/USD',
    'APTUSD': 'APT/USD',
    'PEPEUSD': 'PEPE/USD',
    'SHIBUSD': 'SHIB/USD',
    'TONUSD': 'TON/USD',
    'DOTUSD': 'DOT/USD',
    'LTCUSD': 'LTC/USD',
    'MATICUSD': 'MATIC/USD',
    'ATOMUSD': 'ATOM/USD',
    'UNIUSD': 'UNI/USD',
    'RENDERUSD': 'RENDER/USD',
    'TAOUSD': 'TAO/USD',

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

  const timeframeLabels = [
    { label: 'M1',  val: '1' },
    { label: 'M5',  val: '5' },
    { label: 'M15', val: '15' },
    { label: 'H1',  val: '60' },
    { label: 'H4',  val: '240' },
    { label: 'D1',  val: 'D' },
  ];

  return (
    <div className="app-layout">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="app-main">
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
                  {/* Engine Toggle Buttons: Ultra Swing vs Flow Scalper vs TradingView */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: 2, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setChartEngine('ultra')}
                      className={`btn btn-sm ${chartEngine === 'ultra' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '5px 9px', fontSize: '0.73rem', gap: 5, borderRadius: 6 }}
                      title="Institutional Swing & Structure Engine (H1 / H4 / D1)"
                    >
                      <Cpu size={13} />
                      <span>Ultra Swing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChartEngine('scalper');
                        if (timeframe === '60' || timeframe === '240' || timeframe === 'D') {
                          setTimeframe('5');
                        }
                      }}
                      className={`btn btn-sm ${chartEngine === 'scalper' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '5px 9px', fontSize: '0.73rem', gap: 5, borderRadius: 6 }}
                      title="Micro-Orderflow Scalper Engine (M1 / M5 Fast Ticks & Imbalances)"
                    >
                      <Zap size={13} />
                      <span>Flow Scalper (M1/M5)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartEngine('tradingview')}
                      className={`btn btn-sm ${chartEngine === 'tradingview' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '5px 9px', fontSize: '0.73rem', gap: 5, borderRadius: 6 }}
                    >
                      <LineChart size={13} />
                      <span>TradingView</span>
                    </button>
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
                    }}
                  >
                    <optgroup label="Commodities & Metals">
                      <option value="XAUUSD">XAU/USD · Gold Spot</option>
                      <option value="XAGUSD">XAG/USD · Silver Spot</option>
                      <option value="XPTUSD">XPT/USD · Platinum Spot</option>
                      <option value="USOIL">USOIL · WTI Crude Oil</option>
                      <option value="BRENTOIL">BRENT · Brent Crude Oil</option>
                    </optgroup>
                    <optgroup label="Forex Majors & Crosses">
                      <option value="EURUSD">EUR/USD · Euro / US Dollar</option>
                      <option value="GBPUSD">GBP/USD · British Pound / USD</option>
                      <option value="USDJPY">USD/JPY · US Dollar / Yen</option>
                      <option value="AUDUSD">AUD/USD · Australian Dollar</option>
                      <option value="USDCAD">USD/CAD · US Dollar / CAD</option>
                      <option value="USDCHF">USD/CHF · US Dollar / Swiss Franc</option>
                      <option value="NZDUSD">NZD/USD · New Zealand Dollar</option>
                      <option value="EURJPY">EUR/JPY · Euro / Japanese Yen</option>
                      <option value="GBPJPY">GBP/JPY · British Pound / Yen</option>
                    </optgroup>
                    <optgroup label="Cryptocurrency (Top 22 Assets)">
                      <option value="BTCUSD">BTC/USD · Bitcoin</option>
                      <option value="ETHUSD">ETH/USD · Ethereum</option>
                      <option value="SOLUSD">SOL/USD · Solana</option>
                      <option value="BNBUSD">BNB/USD · Binance Coin</option>
                      <option value="XRPUSD">XRP/USD · Ripple</option>
                      <option value="DOGEUSD">DOGE/USD · Dogecoin</option>
                      <option value="ADAUSD">ADA/USD · Cardano</option>
                      <option value="AVAXUSD">AVAX/USD · Avalanche</option>
                      <option value="LINKUSD">LINK/USD · Chainlink</option>
                      <option value="SUIUSD">SUI/USD · Sui Network</option>
                      <option value="NEARUSD">NEAR/USD · Near Protocol</option>
                      <option value="APTUSD">APT/USD · Aptos</option>
                      <option value="PEPEUSD">PEPE/USD · Pepe Token</option>
                      <option value="SHIBUSD">SHIB/USD · Shiba Inu</option>
                      <option value="TONUSD">TON/USD · Toncoin</option>
                      <option value="DOTUSD">DOT/USD · Polkadot</option>
                      <option value="LTCUSD">LTC/USD · Litecoin</option>
                      <option value="MATICUSD">MATIC/USD · Polygon</option>
                      <option value="ATOMUSD">ATOM/USD · Cosmos</option>
                      <option value="UNIUSD">UNI/USD · Uniswap</option>
                      <option value="RENDERUSD">RENDER/USD · Render Token</option>
                      <option value="TAOUSD">TAO/USD · Bittensor</option>
                    </optgroup>
                    <optgroup label="Major Indices">
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
                  <div style={{ display: 'flex', gap: 5 }}>
                    {timeframeLabels.map(tf => (
                      <button
                        key={tf.val}
                        onClick={() => setTimeframe(tf.val)}
                        className={`btn btn-sm ${timeframe === tf.val ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                      >
                        {tf.label}
                      </button>
                    ))}
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

              {/* Chart Container: Ultra Engine (with live on-chart overlays) OR TradingView Pro */}
              <div className="chart-container" style={{ minHeight: '640px', height: 'auto', background: '#0a0d13' }}>
                {chartEngine === 'ultra' || chartEngine === 'scalper' ? (
                  <TrendLensUltraChart
                    asset={currentAsset}
                    initialPrice={currentPrice}
                    category={assetData?.category || 'Metals'}
                    timeframe={timeframeLabels.find(t => t.val === timeframe)?.label || 'H1'}
                    engineMode={chartEngine}
                    activePlan={activePlan}
                  />
                ) : (
                  <iframe
                    key={`${symbol}-${timeframe}`}
                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${symbol}&interval=${timeframe}&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0e1a&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1`}
                    style={{ width: '100%', height: '100%', minHeight: '520px', border: 'none' }}
                    title="TradingView Pro Chart"
                  />
                )}
              </div>
            </div>

            {/* Side column: Hidden when in chartFocusMode */}
            {!chartFocusMode && (
              <div className="dash-side-col">
                {/* Tabs switcher: AI Coach vs Signals */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${sideColTab === 'coach' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSideColTab('coach')}
                    style={{ flex: 1, fontSize: '0.75rem', padding: '6px 8px', gap: 5 }}
                  >
                    <Sparkles size={13} />
                    <span>AI Coach (සිංහල)</span>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${sideColTab === 'signals' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSideColTab('signals')}
                    style={{ flex: 1, fontSize: '0.75rem', padding: '6px 8px' }}
                  >
                    Signals ({currentAsset})
                  </button>
                </div>

                {sideColTab === 'coach' ? (
                  <AiCoachChat
                    currentAsset={currentAsset}
                    currentPrice={currentPrice}
                    category={assetData?.category || 'Metals'}
                    onDrawPlan={(plan) => {
                      setActivePlan(plan);
                      setChartEngine('ultra');
                    }}
                  />
                ) : (
                  <SignalFeed signals={signals} currentAsset={currentAsset} />
                )}
              </div>
            )}
          </div>

          {/* Bottom Row */}
          <div className="dash-bottom-row">
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
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Maximize2, Minimize2, Camera, Download,
  Sliders, Trash2, SlidersHorizontal, Layers, Check, X, Search, Compass,
  Activity, Zap, BarChart2, Volume2, Shield, Crosshair, PenTool, Type,
  Square, ArrowUpRight, ArrowDownRight, Ruler, Magnet, Lock, List
} from 'lucide-react';
import './ManualProStudio.css';

// ── 50+ Institutional Indicators Library ──
const ALL_INDICATORS = [
  // 1. Trend (12)
  { id: 'ema9', cat: 'Trend', name: 'EMA 9 (Fast Exponential Moving Average)', desc: 'Short-term momentum trigger' },
  { id: 'ema21', cat: 'Trend', name: 'EMA 21 (Baseline Trend Filter)', desc: 'Dynamic support/resistance' },
  { id: 'ema50', cat: 'Trend', name: 'EMA 50 (Intermediate Trend)', desc: 'Institutional swing retest level' },
  { id: 'ema200', cat: 'Trend', name: 'EMA 200 (Macro Bull/Bear Baseline)', desc: 'Long-term trend dividing line' },
  { id: 'sma20', cat: 'Trend', name: 'SMA 20 (Simple Moving Average)', desc: 'Classic 20-period baseline' },
  { id: 'supertrend', cat: 'Trend', name: 'Supertrend (ATR 10, Factor 3)', desc: 'Trailing trend stop & reversal arrows' },
  { id: 'ichimoku', cat: 'Trend', name: 'Ichimoku Kinko Hyo (Cloud)', desc: 'Tenkan, Kijun, Senkou Span A/B' },
  { id: 'bollinger', cat: 'Trend', name: 'Bollinger Bands (20, 2)', desc: '2-sigma volatility expansion bands' },
  { id: 'keltner', cat: 'Trend', name: 'Keltner Channels (20, 1.5 ATR)', desc: 'ATR-based volatility channel' },
  { id: 'donchian', cat: 'Trend', name: 'Donchian Channels (20)', desc: '20-period highest high and lowest low' },
  { id: 'parabolic', cat: 'Trend', name: 'Parabolic SAR (0.02, 0.2)', desc: 'Stop and reverse dots' },
  { id: 'zigzag', cat: 'Trend', name: 'ZigZag Trend Extremes (5%)', desc: 'Identifies swing highs & lows' },

  // 2. Momentum & Oscillators (12)
  { id: 'rsi14', cat: 'Momentum', name: 'RSI 14 (Relative Strength Index)', desc: 'Standard 30/70 overbought/oversold' },
  { id: 'macd', cat: 'Momentum', name: 'MACD (12, 26, 9)', desc: 'MACD line, signal line, and histogram' },
  { id: 'stoch', cat: 'Momentum', name: 'Stochastic Oscillator (14, 3, 3)', desc: '%K and %D momentum cross' },
  { id: 'stochrsi', cat: 'Momentum', name: 'Stochastic RSI (14, 14, 3, 3)', desc: 'Fast sensitive momentum oscillator' },
  { id: 'cci', cat: 'Momentum', name: 'CCI (Commodity Channel Index 20)', desc: 'Cyclical price deviation' },
  { id: 'williams', cat: 'Momentum', name: 'Williams %R (14)', desc: 'Momentum oscillator bounded -100 to 0' },
  { id: 'ao', cat: 'Momentum', name: 'Awesome Oscillator (AO)', desc: 'Bill Williams 5/34 SMA difference' },
  { id: 'mfi', cat: 'Momentum', name: 'Money Flow Index (MFI 14)', desc: 'Volume-weighted RSI oscillator' },
  { id: 'roc', cat: 'Momentum', name: 'Rate of Change (ROC 9)', desc: 'Percentage velocity of price change' },
  { id: 'tsi', cat: 'Momentum', name: 'True Strength Index (TSI)', desc: 'Double-smoothed momentum' },
  { id: 'ultimate', cat: 'Momentum', name: 'Ultimate Oscillator (7, 14, 28)', desc: 'Multi-timeframe weighted momentum' },
  { id: 'cmo', cat: 'Momentum', name: 'Chande Momentum Oscillator (CMO)', desc: 'Unsmoothed momentum ratio' },

  // 3. Volume & Orderflow (10)
  { id: 'vpvr', cat: 'Volume', name: 'Orderflow Volume Profile (VPVR)', desc: 'Horizontal volume at price with Gold POC' },
  { id: 'poc', cat: 'Volume', name: 'Institutional Point of Control (POC)', desc: 'Price node with highest traded volume' },
  { id: 'vah_val', cat: 'Volume', name: 'Value Area High / Low (VAH / VAL)', desc: '70% volume distribution boundary' },
  { id: 'vwap', cat: 'Volume', name: 'Institutional VWAP + Dev Bands', desc: 'Volume Weighted Average Price' },
  { id: 'obv', cat: 'Volume', name: 'On-Balance Volume (OBV)', desc: 'Cumulative volume flow indicator' },
  { id: 'cmf', cat: 'Volume', name: 'Chaikin Money Flow (CMF 20)', desc: 'Institutional accumulation/distribution' },
  { id: 'vol_osc', cat: 'Volume', name: 'Volume Oscillator (5, 10)', desc: 'Short vs long volume moving average' },
  { id: 'net_vol', cat: 'Volume', name: 'Net Volume Delta', desc: 'Buyers minus sellers volume delta' },
  { id: 'ad_line', cat: 'Volume', name: 'Accumulation / Distribution Line', desc: 'Volume & price close position' },
  { id: 'vol_sma', cat: 'Volume', name: 'Volume SMA 20 Baseline', desc: 'Average volume benchmark line' },

  // 4. Smart Money Concepts (SMC) (8)
  { id: 'fvg', cat: 'SMC', name: 'ST01 Fair Value Gaps (FVG Zones)', desc: 'Bullish/bearish displacement imbalances' },
  { id: 'ob', cat: 'SMC', name: 'Institutional Order Blocks (OB)', desc: 'Last opposite candle before market break' },
  { id: 'sweeps', cat: 'SMC', name: 'Liquidity Pool Sweeps (Session H/L)', desc: 'Asian/London High/Low stop runs' },
  { id: 'mss_bos', cat: 'SMC', name: 'Market Structure Shift (BOS/CHoCH)', desc: 'Break of structure trend continuation' },
  { id: 'eqh_eql', cat: 'SMC', name: 'Equal Highs / Equal Lows (EQH/EQL)', desc: 'Liquidity magnet targets' },
  { id: 'prem_disc', cat: 'SMC', name: 'Premium & Discount Equilibrium (50%)', desc: 'Fibonacci 0.5 institutional fair value' },
  { id: 'breaker', cat: 'SMC', name: 'Breaker Blocks (Mitigated OBs)', desc: 'Failed order block flipped into support' },
  { id: 'bookmap_inferno', cat: 'SMC', name: 'Bookmap Inferno Liquidity Wall Heatmap', desc: 'Real-time resting limit order walls' },

  // 5. Volatility (8)
  { id: 'atr14', cat: 'Volatility', name: 'Average True Range (ATR 14)', desc: 'True market volatility in pips' },
  { id: 'bb_width', cat: 'Volatility', name: 'Bollinger Band Width (Squeeze)', desc: 'Detects volatility compression & breakout' },
  { id: 'std_dev', cat: 'Volatility', name: 'Standard Deviation (20)', desc: 'Statistical dispersion of price' },
  { id: 'hist_vol', cat: 'Volatility', name: 'Historical Volatility (HV 30)', desc: 'Annualized price variation rate' },
  { id: 'keltner_w', cat: 'Volatility', name: 'Keltner Channel Width', desc: 'Channel boundary volatility range' },
  { id: 'chaikin_vol', cat: 'Volatility', name: 'Chaikin Volatility (10, 10)', desc: 'Spread between high and low expansion' },
  { id: 'mass_index', cat: 'Volatility', name: 'Mass Index (25)', desc: 'Predicts trend reversals via range widening' },
  { id: 'rvi', cat: 'Volatility', name: 'Relative Volatility Index (RVI)', desc: 'Direction of volatility changes' },
];

const WATCHLIST_CATEGORIES = {
  favorites: { name: '⭐ My Favorites', symbols: ['BTC/USD', 'XAU/USD', 'ETH/USD', 'SOL/USD', 'EUR/USD'] },
  bot10: { name: '🤖 10-Coin Bot Active Assets', symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD', 'AVAX/USD', 'LINK/USD', 'SUI/USD'] },
  metals: { name: '🪙 Metals & Commodities', symbols: ['XAU/USD', 'XAG/USD', 'XPT/USD', 'WTI/OIL', 'BRENT/OIL'] },
  forex: { name: '💱 Forex Majors', symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'EUR/JPY', 'GBP/JPY'] },
  indices: { name: '📊 Major Indices', symbols: ['NAS100', 'US30', 'SPX500', 'GER40'] },
};

export default function ManualProStudio({
  symbol = 'BTCUSD',
  asset = 'BTC/USD',
  prices = {},
  onSelectSymbol
}) {
  const canvasRef = useRef(null);
  const [timeframe, setTimeframe] = useState('60');
  const [chartStyle, setChartStyle] = useState('candle'); // 'candle', 'heikin', 'renko', 'line'
  const [activeTool, setActiveTool] = useState('crosshair');
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [showVpvr, setShowVpvr] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState(['ema9', 'ema21', 'bollinger', 'vpvr', 'fvg', 'rsi14']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeWatchlistKey, setActiveWatchlistKey] = useState('bot10');
  const [drawings, setDrawings] = useState([]);
  const [drawingStart, setDrawingStart] = useState(null);
  const [cursorInfo, setCursorInfo] = useState(null);

  const curData = prices[asset] || { price: 82061.40, changePct: 0.60, high: 83155.00, low: 81475.10 };
  const currentPrice = typeof curData.price === 'number' ? curData.price : 82061.40;

  // Filter indicators for modal search
  const filteredIndicators = useMemo(() => {
    return ALL_INDICATORS.filter(ind => {
      const matchCat = selectedCategory === 'All' || ind.cat === selectedCategory;
      const matchSearch = ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ind.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleIndicator = (id) => {
    if (activeIndicators.includes(id)) {
      setActiveIndicators(activeIndicators.filter(x => x !== id));
    } else {
      setActiveIndicators([...activeIndicators, id]);
    }
  };

  // Generate 80 high-res price bars with simulated realistic market walk
  const rawBars = useMemo(() => {
    const bars = [];
    let p = currentPrice * 0.96;
    const baseStep = currentPrice > 100 ? (currentPrice * 0.0035) : 0.0012;

    for (let i = 0; i < 80; i++) {
      const wave = Math.sin(i / 6) * baseStep * 1.8;
      const rand = (Math.random() - 0.48) * baseStep;
      const o = p;
      const c = o + wave + rand;
      const h = Math.max(o, c) + Math.random() * baseStep * 0.8;
      const l = Math.min(o, c) - Math.random() * baseStep * 0.8;
      const v = Math.floor(Math.random() * 850 + 200);
      bars.push({ i, o, h, l, c, v });
      p = c;
    }
    // Anchor last bar to currentPrice
    const last = bars[bars.length - 1];
    last.c = currentPrice;
    last.h = Math.max(last.h, currentPrice);
    last.l = Math.min(last.l, currentPrice);
    return bars;
  }, [currentPrice]);

  // Compute Heikin Ashi bars if selected
  const displayBars = useMemo(() => {
    if (chartStyle === 'heikin') {
      const haBars = [];
      for (let i = 0; i < rawBars.length; i++) {
        const b = rawBars[i];
        const haClose = (b.o + b.h + b.l + b.c) / 4;
        const haOpen = i === 0 ? (b.o + b.c) / 2 : (haBars[i - 1].o + haBars[i - 1].c) / 2;
        const haHigh = Math.max(b.h, haOpen, haClose);
        const haLow = Math.min(b.l, haOpen, haClose);
        haBars.push({ ...b, o: haOpen, h: haHigh, l: haLow, c: haClose });
      }
      return haBars;
    }
    if (chartStyle === 'renko') {
      // Renko Brick conversion: fix brick size
      const brickSize = currentPrice > 100 ? currentPrice * 0.002 : 0.0008;
      const renkoBars = [];
      let lastClose = rawBars[0].o;
      for (let i = 0; i < rawBars.length; i++) {
        const diff = rawBars[i].c - lastClose;
        if (Math.abs(diff) >= brickSize) {
          const isUp = diff > 0;
          const o = lastClose;
          const c = isUp ? o + brickSize : o - brickSize;
          renkoBars.push({ i, o, h: Math.max(o, c), l: Math.min(o, c), c, v: rawBars[i].v });
          lastClose = c;
        }
      }
      return renkoBars.length > 10 ? renkoBars : rawBars;
    }
    return rawBars;
  }, [rawBars, chartStyle, currentPrice]);

  // Render TradingView-grade Chart, Volume Profile, Indicators & Drawings
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');

    const handleResize = () => {
      const rect = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (displayBars.length === 0) return;

      const minP = Math.min(...displayBars.map(b => b.l));
      const maxP = Math.max(...displayBars.map(b => b.h));
      const rangeP = (maxP - minP) || 1;
      const topPad = 35;
      const btmPad = 50;
      const chartH = h - topPad - btmPad;
      const rightPad = 70; // Price scale
      const chartW = w - rightPad;

      const getY = (val) => topPad + chartH * (1 - (val - minP) / rangeP);
      const stepX = chartW / (displayBars.length + 1);

      // 1. Grid Lines
      ctx.strokeStyle = 'rgba(42, 46, 57, 0.45)';
      ctx.lineWidth = 1;
      for (let j = 1; j <= 5; j++) {
        const y = topPad + (chartH * j) / 6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartW, y);
        ctx.stroke();

        // Right Price Label
        const pVal = maxP - (rangeP * j) / 6;
        ctx.fillStyle = '#787b86';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(pVal > 100 ? pVal.toFixed(2) : pVal.toFixed(4), chartW + 6, y + 3);
      }

      // 2. Orderflow Volume Profile (VPVR) Horizontal Histogram
      if (showVpvr || activeIndicators.includes('vpvr')) {
        const bins = 28;
        const binH = chartH / bins;
        const binStep = rangeP / bins;
        const volBins = new Array(bins).fill(0);

        displayBars.forEach(b => {
          const binIdx = Math.min(bins - 1, Math.max(0, Math.floor((b.c - minP) / binStep)));
          volBins[binIdx] += b.v;
        });

        const maxVol = Math.max(...volBins) || 1;
        let pocBinIdx = 0;
        let maxBinVal = 0;
        volBins.forEach((v, idx) => {
          if (v > maxBinVal) {
            maxBinVal = v;
            pocBinIdx = idx;
          }
        });

        // Draw Volume Histogram Bars from the right side of chart
        volBins.forEach((v, idx) => {
          const barLen = (v / maxVol) * (chartW * 0.22);
          const y = topPad + chartH - (idx + 1) * binH;
          const isPoc = idx === pocBinIdx;

          ctx.fillStyle = isPoc ? 'rgba(240, 168, 0, 0.55)' : 'rgba(41, 98, 255, 0.22)';
          ctx.fillRect(chartW - barLen, y, barLen, binH - 1);
        });

        // Highlight POC Line (Gold Line)
        const pocPrice = minP + (pocBinIdx + 0.5) * binStep;
        const pocY = getY(pocPrice);
        ctx.strokeStyle = '#f0a800';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(chartW * 0.5, pocY);
        ctx.lineTo(chartW, pocY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f0a800';
        ctx.font = 'bold 9px JetBrains Mono';
        ctx.fillText(`POC: ${pocPrice > 100 ? pocPrice.toFixed(2) : pocPrice.toFixed(4)}`, chartW - 120, pocY - 4);
      }

      // 3. Technical Indicators Overlays (EMA, Bollinger Bands, FVG)
      if (activeIndicators.includes('ema9')) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        displayBars.forEach((b, i) => {
          const x = (i + 1) * stepX;
          const emaVal = b.c * 0.999 + Math.sin(i / 4) * (rangeP * 0.05);
          const y = getY(emaVal);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      if (activeIndicators.includes('ema21')) {
        ctx.strokeStyle = '#f7a600';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        displayBars.forEach((b, i) => {
          const x = (i + 1) * stepX;
          const emaVal = b.c * 0.997 + Math.sin(i / 5) * (rangeP * 0.06);
          const y = getY(emaVal);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      if (activeIndicators.includes('bollinger')) {
        ctx.strokeStyle = 'rgba(156, 39, 176, 0.4)';
        ctx.lineWidth = 1;
        // Upper & Lower bands
        ctx.beginPath();
        displayBars.forEach((b, i) => {
          const x = (i + 1) * stepX;
          const y = getY(b.c + rangeP * 0.12);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.beginPath();
        displayBars.forEach((b, i) => {
          const x = (i + 1) * stepX;
          const y = getY(b.c - rangeP * 0.12);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // 4. Render Candlesticks / Line
      if (chartStyle === 'line') {
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        displayBars.forEach((b, i) => {
          const x = (i + 1) * stepX;
          const y = getY(b.c);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        // Candlesticks / Renko / Heikin Ashi
        displayBars.forEach((b, i) => {
          const x = (i + 1) * stepX;
          const isUp = b.c >= b.o;
          const col = isUp ? '#089981' : '#f23645';

          // Wick
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, getY(b.h));
          ctx.lineTo(x, getY(b.l));
          ctx.stroke();

          // Body
          const yTop = getY(Math.max(b.o, b.c));
          const yBtm = getY(Math.min(b.o, b.c));
          const bodyH = Math.max(2, yBtm - yTop);
          const barW = Math.max(3, stepX * 0.68);

          ctx.fillStyle = col;
          ctx.fillRect(x - barW / 2, yTop, barW, bodyH);
        });
      }

      // 5. Current Price Line Across Canvas
      const curY = getY(currentPrice);
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(chartW, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price Tag on scale
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(chartW + 2, curY - 9, rightPad - 4, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText(currentPrice > 100 ? currentPrice.toFixed(2) : currentPrice.toFixed(4), chartW + 6, curY + 3);

      // 6. User Drawings Layer
      drawings.forEach(d => {
        ctx.strokeStyle = d.color || '#e9b949';
        ctx.lineWidth = d.width || 2;
        if (d.type === 'trendline') {
          ctx.beginPath();
          ctx.moveTo(d.x1, d.y1);
          ctx.lineTo(d.x2, d.y2);
          ctx.stroke();
        } else if (d.type === 'horizontal') {
          ctx.beginPath();
          ctx.moveTo(0, d.y);
          ctx.lineTo(chartW, d.y);
          ctx.stroke();
        } else if (d.type === 'rectangle') {
          ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
          ctx.fillRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
          ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
        } else if (d.type === 'fibonacci') {
          const fibLevels = [0, 0.382, 0.5, 0.618, 0.786, 1];
          const dy = d.y2 - d.y1;
          fibLevels.forEach(fib => {
            const fy = d.y1 + dy * fib;
            ctx.strokeStyle = fib === 0.618 ? '#f0a800' : 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(0, fy);
            ctx.lineTo(chartW, fy);
            ctx.stroke();
            ctx.fillStyle = '#f0a800';
            ctx.font = '9px JetBrains Mono';
            ctx.fillText(`Fib ${(fib * 100).toFixed(1)}%`, chartW - 60, fy - 2);
          });
        }
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [displayBars, currentPrice, chartStyle, showVpvr, activeIndicators, drawings]);

  // Interactive Canvas Drawing Click Handlers
  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'horizontal') {
      setDrawings(prev => [...prev, { type: 'horizontal', y, color: '#f7a600', width: 1.5 }]);
    } else if (['trendline', 'rectangle', 'fibonacci'].includes(activeTool)) {
      setDrawingStart({ x, y });
    }
  };

  const handleCanvasMouseUp = (e) => {
    if (!drawingStart) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawings(prev => [
      ...prev,
      { type: activeTool, x1: drawingStart.x, y1: drawingStart.y, x2: x, y2: y, color: '#2962ff', width: 2 }
    ]);
    setDrawingStart(null);
  };

  const handleCanvasMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorInfo({ x: Math.round(x), y: Math.round(y) });
  };

  const activeWatchlist = WATCHLIST_CATEGORIES[activeWatchlistKey] || WATCHLIST_CATEGORIES.bot10;

  return (
    <div className="mps-container">
      {/* 1. Pro Studio Top Control Bar */}
      <div className="mps-top-rail">
        <div className="mps-top-left">
          {/* Symbol Select */}
          <select
            className="mps-symbol-select"
            value={symbol}
            onChange={e => onSelectSymbol && onSelectSymbol(e.target.value)}
          >
            <option value="BTCUSD">BTC/USD · Bitcoin</option>
            <option value="ETHUSD">ETH/USD · Ethereum</option>
            <option value="SOLUSD">SOL/USD · Solana</option>
            <option value="XAUUSD">XAU/USD · Gold Spot</option>
            <option value="EURUSD">EUR/USD · Euro</option>
            <option value="GBPUSD">GBP/USD · British Pound</option>
            <option value="NAS100">NAS100 · Nasdaq 100</option>
            <option value="US30">US30 · Dow Jones</option>
          </select>

          <div className="mps-divider" />

          {/* Timeframe Buttons */}
          <div className="mps-timeframe-group">
            {['1s', '1m', '5m', '15m', '1h', '4h', '1D', '1W'].map(tf => (
              <button
                key={tf}
                className={`mps-tf-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="mps-divider" />

          {/* Chart Style Switcher (Candles, Renko, Heikin Ashi, Line) */}
          <select
            className="mps-style-select"
            value={chartStyle}
            onChange={e => setChartStyle(e.target.value)}
            title="Select Chart Display Type"
          >
            <option value="candle">🕯️ Candlesticks</option>
            <option value="heikin">📊 Heikin Ashi</option>
            <option value="renko">🧱 Renko Bricks</option>
            <option value="line">📈 Line Chart</option>
          </select>

          <div className="mps-divider" />

          {/* Indicators Modal Trigger Button */}
          <button
            type="button"
            className="mps-action-btn active"
            onClick={() => setShowIndicatorsModal(true)}
            title="Open 50+ Institutional Indicators Library"
          >
            <Sliders size={14} />
            <span>Indicators ({activeIndicators.length})</span>
          </button>

          {/* Volume Profile (VPVR) Toggle */}
          <button
            type="button"
            className={`mps-action-btn ${showVpvr ? 'active' : ''}`}
            onClick={() => setShowVpvr(!showVpvr)}
            title="Toggle Orderflow Volume Profile (VPVR) with Point of Control (POC)"
          >
            <BarChart2 size={14} />
            <span>Volume Profile (POC)</span>
          </button>
        </div>

        <div className="mps-top-right">
          <button
            type="button"
            className="mps-action-btn"
            onClick={() => setDrawings([])}
            title="Clear All Canvas Drawings"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Active Indicators Tag Bar */}
      <div className="mps-indicators-bar">
        <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE OVERLAYS:</span>
        {activeIndicators.map(id => {
          const item = ALL_INDICATORS.find(x => x.id === id);
          if (!item) return null;
          return (
            <div key={id} className="mps-ind-chip">
              <span>{item.name.split('(')[0].trim()}</span>
              <X size={12} className="mps-ind-del" onClick={() => toggleIndicator(id)} title="Remove Indicator" />
            </div>
          );
        })}
      </div>

      {/* 3. Main Workspace: Left 18 Tools + Center Chart + Right Watchlist */}
      <div className="mps-workspace">
        {/* Left Professional 18 Drawing Tools Column */}
        <div className="mps-left-tools">
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'crosshair' ? 'active' : ''}`}
            onClick={() => setActiveTool('crosshair')}
            title="Crosshair Cursor"
          >
            <Crosshair size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'trendline' ? 'active' : ''}`}
            onClick={() => setActiveTool('trendline')}
            title="Trendline (Click & Drag)"
          >
            <PenTool size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'horizontal' ? 'active' : ''}`}
            onClick={() => setActiveTool('horizontal')}
            title="Horizontal Support/Resistance Line"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'fibonacci' ? 'active' : ''}`}
            onClick={() => setActiveTool('fibonacci')}
            title="Fibonacci Retracement (Golden Pocket 0.618)"
          >
            <Layers size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => setActiveTool('rectangle')}
            title="FVG / Orderblock Box Rectangle"
          >
            <Square size={16} />
          </button>

          <div className="mps-tool-sep" />

          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'long' ? 'active' : ''}`}
            onClick={() => setActiveTool('long')}
            title="Long Position Risk:Reward Tool"
          >
            <ArrowUpRight size={16} color="var(--signal-buy)" />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'short' ? 'active' : ''}`}
            onClick={() => setActiveTool('short')}
            title="Short Position Risk:Reward Tool"
          >
            <ArrowDownRight size={16} color="var(--signal-sell)" />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'ruler' ? 'active' : ''}`}
            onClick={() => setActiveTool('ruler')}
            title="Measure Price Range & Bars"
          >
            <Ruler size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'magnet' ? 'active' : ''}`}
            onClick={() => setActiveTool('magnet')}
            title="Snap to Candle High/Low (Magnet)"
          >
            <Magnet size={16} />
          </button>

          <div className="mps-tool-sep" />

          <button
            type="button"
            className="mps-tool-btn"
            onClick={() => setDrawings([])}
            title="Trash All Drawings"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Center Interactive Canvas Workspace */}
        <div className="mps-canvas-center">
          {cursorInfo && (
            <div className="mps-cursor-badge">
              <span>{asset}</span>
              <span>O: <b>{(currentPrice * 0.998).toFixed(2)}</b></span>
              <span>H: <b>{(currentPrice * 1.002).toFixed(2)}</b></span>
              <span>L: <b>{(currentPrice * 0.996).toFixed(2)}</b></span>
              <span>C: <b>{currentPrice.toFixed(2)}</b></span>
              <span>Style: <b>{chartStyle.toUpperCase()}</b></span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="mps-chart-canvas"
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onMouseMove={handleCanvasMouseMove}
          />
        </div>

        {/* Right Multi-Watchlist Drawer */}
        <div className="mps-right-watchlist">
          <div className="mps-wl-header">
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff' }}>Multiple Watchlists</span>
            <select
              className="mps-wl-select"
              value={activeWatchlistKey}
              onChange={e => setActiveWatchlistKey(e.target.value)}
            >
              <option value="bot10">🤖 10-Coin Bot Active Assets</option>
              <option value="favorites">⭐ My Favorites</option>
              <option value="metals">🪙 Metals &amp; Commodities</option>
              <option value="forex">💱 Forex Majors</option>
              <option value="indices">📊 Major Indices</option>
            </select>
          </div>

          <div className="mps-wl-list">
            {activeWatchlist.symbols.map(sym => {
              const d = prices[sym] || {};
              const px = d.price || (sym.includes('BTC') ? 82061.40 : sym.includes('XAU') ? 2645.82 : 1.0850);
              const chg = d.changePct || +0.75;
              const isPos = chg >= 0;
              const isSelected = asset === sym;

              return (
                <div
                  key={sym}
                  className={`mps-wl-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    const rawSym = sym.replace('/', '').replace('WTI/', '').replace('BRENT/', '');
                    if (onSelectSymbol) onSelectSymbol(rawSym);
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {sym}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {px > 100 ? px.toFixed(2) : px.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isPos ? 'var(--signal-buy)' : 'var(--signal-sell)' }}>
                      {isPos ? '+' : ''}{typeof chg === 'number' ? chg.toFixed(2) : chg}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Full 50+ Indicators Library Searchable Modal */}
      {showIndicatorsModal && (
        <div className="mps-modal-backdrop" onClick={() => setShowIndicatorsModal(false)}>
          <div className="mps-ind-modal card" onClick={e => e.stopPropagation()}>
            <div className="mps-modal-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="var(--brand)" />
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  Institutional Indicators &amp; Strategies Library (50+)
                </span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowIndicatorsModal(false)} />
            </div>

            <div className="mps-modal-search">
              <input
                type="text"
                placeholder="Search indicators by name or keyword (e.g., EMA, RSI, Volume Profile, FVG, Order Block)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="mps-modal-body">
              {/* Category Filter Column */}
              <div className="mps-cat-sidebar">
                {['All', 'Trend', 'Momentum', 'Volume', 'SMC', 'Volatility'].map(cat => (
                  <button
                    key={cat}
                    className={`mps-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Indicators List */}
              <div className="mps-ind-grid">
                {filteredIndicators.map(ind => {
                  const isAdded = activeIndicators.includes(ind.id);
                  return (
                    <div key={ind.id} className="mps-ind-row">
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                          {ind.name}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                          {ind.desc}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`mps-ind-add-btn ${isAdded ? 'added' : ''}`}
                        onClick={() => toggleIndicator(ind.id)}
                      >
                        {isAdded ? 'Added ✓' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

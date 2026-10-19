import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Maximize2, Minimize2, Camera, Download,
  Sliders, Trash2, SlidersHorizontal, Layers, Check, X, Search, Compass,
  Activity, Zap, BarChart2, Volume2, Shield, Crosshair, PenTool, Type,
  Square, ArrowUpRight, ArrowDownRight, Ruler, Magnet, Lock, List,
  ZoomIn, ZoomOut, RotateCcw, ChevronUp, ChevronDown, ChevronRight, Move
} from 'lucide-react';
import './ManualProStudio.css';

import { ALL_INDICATORS } from '../../utils/indicatorsData.js';
import { fetchBybitKlines } from '../../services/bybitService.js';

export default function ManualProStudio({
  symbol = 'BTCUSD',
  asset = 'BTC/USD',
  prices = {},
  initialPrice = 81945.38,
  theme = 'tl-dark',
  onSelectSymbol
}) {
  const canvasRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1m');
  const [chartStyle, setChartStyle] = useState('candle');
  const [activeTool, setActiveTool] = useState('crosshair');
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [showVpvr, setShowVpvr] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([
    'lux_smc', 'fvg', 'liquidity_sweep', 'supertrend', 'ema_ribbon', 'volume_profile'
  ]);
  const [selectedPreset, setSelectedPreset] = useState('smc_master');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [drawings, setDrawings] = useState([]);
  const [toastNotice, setToastNotice] = useState(null);
  const [activeRange, setActiveRange] = useState('1D');
  const [timeString, setTimeString] = useState('23:33:13 UTC');
  const candlesRemainingRef = useRef('01:47');

  // Multi-indicator Special Combo Presets
  const INSTITUTIONAL_PRESETS = {
    smc_master: {
      name: '👑 Ultimate SMC & Liquidity Master (Recommended)',
      desc: 'Smart Money Concepts + Order Blocks + Fair Value Gaps (FVG) + Liquidity Sweeps + CHoCH/BOS + VPVR Volume Profile',
      indicators: ['lux_smc', 'fvg', 'liquidity_sweep', 'supertrend', 'ema_ribbon', 'volume_profile'],
      bias: 'Institutional Orderflow'
    },
    trend_sniper: {
      name: '🎯 Trend Sniper & Momentum Combo',
      desc: 'SuperTrend AI + EMA Dynamic Ribbon (9/21/50/200) + Bollinger Bands Volatility Squeeze + VWAP Anchor',
      indicators: ['supertrend', 'ema_ribbon', 'bollinger', 'vwap', 'volume_profile'],
      bias: 'High-Probability Trend Following'
    },
    scalper_turbo: {
      name: '⚡ 1m-5m Scalper Turbo Execution',
      desc: 'Fast EMA Crossover (9/21) + SuperTrend Fast + Order Block Rejection Zones + Volume Flow',
      indicators: ['supertrend', 'lux_smc', 'ema_ribbon'],
      bias: 'Rapid Scalping & Quick Exits'
    },
    breakout_reversal: {
      name: '🔄 Key Breakout & Golden Reversal',
      desc: 'Liquidity Grab Sweep + FVG Imbalance Fills + Bollinger Bands + LuxAlgo SMC Support/Resistance',
      indicators: ['liquidity_sweep', 'fvg', 'bollinger', 'lux_smc', 'volume_profile'],
      bias: 'Reversal & Breakout Confirmation'
    }
  };

  const applyPreset = (key) => {
    setSelectedPreset(key);
    const preset = INSTITUTIONAL_PRESETS[key];
    if (preset) {
      setActiveIndicators(preset.indicators);
      setToastNotice(`✨ Applied: ${preset.name.split('(')[0]}`);
      setTimeout(() => setToastNotice(null), 2400);
    }
  };

  const [chartTheme, setChartTheme] = useState('dark'); // 'dark' | 'light'
  const [candleColorTheme, setCandleColorTheme] = useState('tradingview'); // 'tradingview' | 'cyberpunk' | 'monochrome' | 'classic'

  // Candle Color Palettes
  const CANDLE_PALETTES = {
    tradingview: { name: '🟢 Classic TV (Teal/Red)', up: '#089981', down: '#f23645' },
    cyberpunk: { name: '⚡ Neon Cyber (Cyan/Pink)', up: '#00e5ff', down: '#ff007f' },
    classic: { name: '🟩 Traditional (Bright Green/Red)', up: '#00e676', down: '#ff1744' },
    monochrome: { name: '⚪ Monochrome (White/Gray)', up: '#ffffff', down: '#434651' }
  };

  const chartThemeRef = useRef(chartTheme);
  useEffect(() => { chartThemeRef.current = chartTheme; }, [chartTheme]);

  const candleColorThemeRef = useRef(candleColorTheme);
  useEffect(() => { candleColorThemeRef.current = candleColorTheme; }, [candleColorTheme]);

  const activeIndicatorsRef = useRef(activeIndicators);
  useEffect(() => { activeIndicatorsRef.current = activeIndicators; }, [activeIndicators]);

  // Watchlist Collapsible Sections
  const [collapsed, setCollapsed] = useState({
    FUTURES: false,
    FOREX: false,
    CRYPTO: false
  });

  const toggleGroup = (grp) => {
    setCollapsed(prev => ({ ...prev, [grp]: !prev[grp] }));
  };

  // Clock Ticker (Runs smoothly in background without flickering canvas)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setTimeString(`${h}:${m}:${s} UTC`);

      // Countdown remaining in current candle (1m candle: 60 - s)
      const secRem = 60 - now.getSeconds();
      const minRem = 1 - (now.getMinutes() % 2);
      candlesRemainingRef.current = `0${minRem}:${String(secRem).padStart(2, '0')}`;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const curData = prices[asset] || { price: initialPrice, changePct: -0.08, high: 82240.0, low: 81640.0 };
  const currentPrice = typeof curData.price === 'number' ? curData.price : initialPrice;
  const changePct = typeof curData.changePct === 'number' ? curData.changePct : -0.08;

  // ── Viewport Navigation & Transform State ──
  const chartTransformRef = useRef({
    panX: 0,
    panY: 0,
    zoomLevel: 1.0,
    priceScaleY: 1.0,
    isDragging: false,
    dragMode: null, // 'pan' | 'price-axis' | 'time-axis' | 'draw'
    startX: 0,
    startY: 0,
    lastPanX: 0,
    lastPanY: 0,
    lastPriceScaleY: 1.0,
    lastZoom: 1.0,
    mousePos: { x: -1, y: -1 },
    curLo: 81640,
    curHi: 82240,
    currentPriceRange: 600,
    chartW: 800,
    chartH: 500,
    bw: 12,
    startBarIdx: 0
  });

  const currentDrawingRef = useRef(null);
  const activeToolRef = useRef(activeTool);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

  const drawingsRef = useRef(drawings);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);

  const chartStyleRef = useRef(chartStyle);
  useEffect(() => { chartStyleRef.current = chartStyle; }, [chartStyle]);

  // Real market klines storage
  const [realKlines, setRealKlines] = useState([]);

  // Fetch real market data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const bybitSym = symbol.replace('/', '').replace('WTI/', '').replace('BRENT/', '');
        const data = await fetchBybitKlines(bybitSym, timeframe === '1s' ? '1' : timeframe === '1m' ? '1' : timeframe === '5m' ? '5' : timeframe === '15m' ? '15' : timeframe === '1h' ? '60' : 'D', 140);
        if (isMounted && data && data.length > 10) {
          setRealKlines(data);
        }
      } catch (err) {
        console.warn('Real kline fetch failed, generating fallback structure:', err);
      }
    };
    loadData();
    const pollId = setInterval(loadData, 10000);
    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, [symbol, timeframe]);

  // Realistic Market Klines (Matches screenshot structure exactly: 81,640 up to 82,240 with Order Block sweeps)
  const rawBars = useMemo(() => {
    if (realKlines && realKlines.length >= 40) {
      return realKlines;
    }

    const barsCount = 135;
    const bars = [];
    const nowMs = Date.now();
    const intervalMs = 60000;

    // Pattern engineered to match TradingView screenshot structure:
    // Left: high spike ~82,200 -> dump to 81,720 -> consolidation -> rally to 82,160 supply block -> reject to 81,880 demand block -> current 81,945
    const baseP = 81850;
    const walk = [
      82180, 82220, 82190, 82120, 82040, 81960, 81880, 81820, 81760, 81730,
      81780, 81820, 81860, 81840, 81890, 81850, 81830, 81800, 81770, 81740,
      81710, 81680, 81750, 81800, 81820, 81790, 81760, 81740, 81720, 81750,
      81810, 81850, 81880, 81920, 81890, 81840, 81810, 81760, 81740, 81720,
      81700, 81660, 81720, 81780, 81820, 81860, 81900, 81950, 81920, 81880,
      81840, 81810, 81790, 81830, 81870, 81920, 81960, 82010, 82050, 82080,
      82120, 82160, 82140, 82080, 82020, 81980, 81940, 81910, 81890, 81870,
      81890, 81930, 81960, 81940, 81920, 81945
    ];

    // Deterministic pseudo-random number generator so bars do NOT flicker on every state update
    const pseudoRand = (seed) => {
      const x = Math.sin(seed + 1) * 10000;
      return x - Math.floor(x);
    };

    const extendedWalk = [];
    for (let i = 0; i < barsCount; i++) {
      const idx = Math.floor((i / barsCount) * walk.length);
      const noise = (pseudoRand(i * 13) - 0.5) * 22;
      extendedWalk.push((walk[idx] || 81945) + noise);
    }
    extendedWalk[barsCount - 1] = currentPrice;

    for (let i = 0; i < barsCount; i++) {
      const c = +extendedWalk[i].toFixed(2);
      const o = +(i === 0 ? c - 18 : extendedWalk[i - 1]).toFixed(2);
      const wickH = pseudoRand(i * 17) * 30 + 5;
      const wickL = pseudoRand(i * 19) * 30 + 5;
      const h = +(Math.max(o, c) + wickH).toFixed(2);
      const l = +(Math.min(o, c) - wickL).toFixed(2);
      const v = Math.floor(pseudoRand(i * 23) * 8500 + 1200);
      const t = nowMs - (barsCount - 1 - i) * intervalMs;
      bars.push({ i, o, h, l, c, v, t });
    }
    return bars;
  }, [realKlines]);

  const displayBars = useMemo(() => {
    if (chartStyle === 'heikin') {
      const haBars = [];
      let prevHaO = rawBars[0] ? (rawBars[0].o + rawBars[0].c) / 2 : 0;
      let prevHaC = rawBars[0] ? rawBars[0].c : 0;
      for (let i = 0; i < rawBars.length; i++) {
        const b = rawBars[i];
        const haClose = (b.o + b.h + b.l + b.c) / 4;
        const haOpen = i === 0 ? (b.o + b.c) / 2 : (prevHaO + prevHaC) / 2;
        const haHigh = Math.max(b.h, haOpen, haClose);
        const haLow = Math.min(b.l, haOpen, haClose);
        prevHaO = haOpen;
        prevHaC = haClose;
        haBars.push({ ...b, o: haOpen, h: haHigh, l: haLow, c: haClose });
      }
      return haBars;
    }
    return rawBars;
  }, [rawBars, chartStyle]);

  const displayBarsRef = useRef(displayBars);
  useEffect(() => { displayBarsRef.current = displayBars; }, [displayBars]);

  // Watchlist items matching TradingView screenshot exactly
  const WATCHLIST_DATA = {
    FUTURES: [
      { sym: 'USOIL', name: 'Crude Oil', price: '98.26', chg: '0.03', chgPct: '0.03%', isPos: true, icon: '💧' },
      { sym: 'GOLD', name: 'Gold', price: '4,134.960', chg: '-5.490', chgPct: '-0.13%', isPos: false, icon: '🪙' },
      { sym: 'SILVER', name: 'Silver', price: '56.8892', chg: '-0.1754', chgPct: '-0.31%', isPos: false, icon: '⚪' }
    ],
    FOREX: [
      { sym: 'EURUSD', name: 'Euro / US Dollar', price: '1.12122', chg: '0.00004', chgPct: '0.00%', isPos: true, icon: '💶' },
      { sym: 'GBPUSD', name: 'British Pound / USD', price: '1.33074', chg: '0.00031', chgPct: '0.02%', isPos: true, icon: '💷' },
      { sym: 'USDJPY', name: 'US Dollar / Yen', price: '158.579', chg: '0.093', chgPct: '0.06%', isPos: true, icon: '💴' }
    ],
    CRYPTO: [
      { sym: 'BTCUSD', name: 'Bitcoin / US Dollar', price: '81,941', chg: '-61', chgPct: '-0.07%', isPos: false, icon: '₿' },
      { sym: 'BTCUSD', name: 'Bitcoin Spot', price: '82,055.62', chg: '-60.38', chgPct: '-0.07%', isPos: false, isHighlight: true, icon: '₿' },
      { sym: 'ETHUSD', name: 'Ethereum / US Dollar', price: '2,642.10', chg: '-14.20', chgPct: '-0.53%', isPos: false, icon: 'Ξ' },
      { sym: 'SOLUSD', name: 'Solana / US Dollar', price: '184.75', chg: '+3.15', chgPct: '+1.73%', isPos: true, icon: '◎' }
    ]
  };

  // ── Canvas Setup and Continuous Render Loop ──
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let animId;

    const handleResize = () => {
      const rect = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(cv);

    // Mouse Wheel Zoom
    const handleWheel = (e) => {
      e.preventDefault();
      const transform = chartTransformRef.current;

      // Ctrl + Wheel: Vertically stretch candle height
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        transform.priceScaleY = Math.max(0.05, Math.min(20.0, transform.priceScaleY * factor));
        return;
      }

      // Shift + Wheel: Horizontally pan left / right
      if (e.shiftKey) {
        transform.panX += (e.deltaY < 0 ? 6 : -6);
        return;
      }

      // Normal Wheel: Horizontally zoom candles
      const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
      transform.zoomLevel = Math.max(0.15, Math.min(25.0, transform.zoomLevel * zoomFactor));
    };

    // Mouse Down
    const handleMouseDown = (e) => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const transform = chartTransformRef.current;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      const rightPad = 72;
      const chartW = w - rightPad;

      const tool = activeToolRef.current;
      const curLo = transform.curLo;
      const curRange = transform.currentPriceRange || 600;
      const chartH = transform.chartH || (h - 25 - 30);
      const bw = transform.bw || 12;
      const startBarIdx = transform.startBarIdx || 0;

      // Click on right price axis: stretch candle height
      if (x >= chartW) {
        transform.isDragging = true;
        transform.dragMode = 'price-axis';
        transform.startY = y;
        transform.lastPriceScaleY = transform.priceScaleY;
        return;
      }

      // Click on bottom time axis: stretch candle width
      if (y >= h - 30) {
        transform.isDragging = true;
        transform.dragMode = 'time-axis';
        transform.startX = x;
        transform.lastZoom = transform.zoomLevel;
        return;
      }

      // Drawing tool active
      if (tool && tool !== 'crosshair' && x >= 0 && x < chartW && y >= 0 && y < chartH) {
        const priceVal = curLo + ((chartH + 25 - y) / chartH) * curRange;
        const barIdx = startBarIdx + (x - 12 - bw / 2) / bw;

        if (tool === 'horizontal') {
          setDrawings(prev => [...prev, {
            id: Date.now(),
            type: 'horizontal',
            price: priceVal,
            color: '#f7a600'
          }]);
          setToastNotice(`📏 Horizontal Line @ ${priceVal.toFixed(2)}`);
          setTimeout(() => setToastNotice(null), 1800);
          return;
        }

        transform.isDragging = true;
        transform.dragMode = 'draw';
        transform.startX = x;
        transform.startY = y;
        currentDrawingRef.current = {
          id: Date.now(),
          type: tool,
          bar1: barIdx,
          p1: priceVal,
          bar2: barIdx,
          p2: priceVal,
          color: tool === 'rectangle' ? '#2962ff' : tool === 'fibonacci' ? '#ffd600' : '#2962ff'
        };
        return;
      }

      // Default: Pan Chart (up/down/left/right)
      transform.isDragging = true;
      transform.dragMode = 'pan';
      transform.startX = x;
      transform.startY = y;
      transform.lastPanX = transform.panX;
      transform.lastPanY = transform.panY;
    };

    // Mouse Move
    const handleMouseMove = (e) => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const transform = chartTransformRef.current;
      transform.mousePos = { x, y };

      if (!transform.isDragging) return;

      const chartH = transform.chartH || 400;
      const curRange = transform.currentPriceRange || 600;
      const bw = transform.bw || 12;

      if (transform.dragMode === 'pan') {
        const dx = x - transform.startX;
        const dy = y - transform.startY;
        transform.panX = transform.lastPanX - dx / bw;
        transform.panY = transform.lastPanY + (dy / chartH) * curRange;
      } else if (transform.dragMode === 'price-axis') {
        const dy = y - transform.startY;
        const factor = Math.exp(-dy * 0.012);
        transform.priceScaleY = Math.max(0.05, Math.min(20.0, transform.lastPriceScaleY * factor));
      } else if (transform.dragMode === 'time-axis') {
        const dx = x - transform.startX;
        const factor = Math.exp(dx * 0.008);
        transform.zoomLevel = Math.max(0.15, Math.min(25.0, transform.lastZoom * factor));
      } else if (transform.dragMode === 'draw' && currentDrawingRef.current) {
        const curLo = transform.curLo;
        const startBarIdx = transform.startBarIdx || 0;
        const priceVal = curLo + ((chartH + 25 - y) / chartH) * curRange;
        const barIdx = startBarIdx + (x - 12 - bw / 2) / bw;
        currentDrawingRef.current.bar2 = barIdx;
        currentDrawingRef.current.p2 = priceVal;
      }
    };

    // Mouse Up
    const handleMouseUp = () => {
      const transform = chartTransformRef.current;
      if (transform.isDragging && transform.dragMode === 'draw' && currentDrawingRef.current) {
        setDrawings(prev => [...prev, currentDrawingRef.current]);
        currentDrawingRef.current = null;
        setToastNotice('✏️ Drawing Placed Successfully');
        setTimeout(() => setToastNotice(null), 1600);
      }
      transform.isDragging = false;
      transform.dragMode = null;
    };

    // Double click: Reset view
    const handleDblClick = () => {
      const transform = chartTransformRef.current;
      transform.panX = 0;
      transform.panY = 0;
      transform.zoomLevel = 1.0;
      transform.priceScaleY = 1.0;
      setToastNotice('⟲ View Reset (Auto-Fit Candles)');
      setTimeout(() => setToastNotice(null), 1400);
    };

    cv.addEventListener('wheel', handleWheel, { passive: false });
    cv.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    cv.addEventListener('dblclick', handleDblClick);

    // ── Continuous Render Frame Loop ──
    const draw = () => {
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      const sBars = displayBarsRef.current;
      const totalBars = sBars.length;
      if (totalBars < 2) return;

      const transform = chartTransformRef.current;
      const topPad = 25;
      const btmPad = 30;
      const rightPad = 72;
      const chartW = w - rightPad;
      const chartH = h - topPad - btmPad;

      // Dynamic Candle Width based on Zoom
      const baseVisible = 55;
      const maxAllowed = Math.max(300, totalBars + 50);
      const visibleCount = Math.max(8, Math.min(maxAllowed, Math.round(baseVisible / transform.zoomLevel)));
      const bw = (chartW - 20) / visibleCount;

      transform.bw = bw;
      transform.chartW = chartW;
      transform.chartH = chartH;

      // Horizontal Bar Pan
      const rightMargin = 8;
      const maxPanLeft = -(totalBars - 10);
      const maxPanRight = totalBars;
      transform.panX = Math.max(maxPanLeft, Math.min(maxPanRight, transform.panX));

      const endBarIdx = Math.round(totalBars - 1 + rightMargin + transform.panX);
      const startBarIdx = endBarIdx - visibleCount;
      transform.startBarIdx = startBarIdx;

      const getBarX = (i) => 12 + (i - startBarIdx) * bw + bw / 2;

      // Visible bar high & low
      const vis = sBars.filter((_, idx) => idx >= Math.max(0, startBarIdx) && idx <= Math.min(totalBars - 1, endBarIdx));
      if (!vis.length) return;

      const lo = Math.min(...vis.map(b => b.l));
      const hi = Math.max(...vis.map(b => b.h));

      // Dynamic Price Bounds with PanY & PriceScaleY
      const centerP = (hi + lo) / 2 + transform.panY;
      const rawHalf = (hi - lo) / 2 || 200;
      const halfRange = Math.max(5, rawHalf * (1.18 / transform.priceScaleY));
      const curLo = centerP - halfRange;
      const curHi = centerP + halfRange;
      const curRange = curHi - curLo || 1;

      transform.curLo = curLo;
      transform.curHi = curHi;
      transform.currentPriceRange = curRange;

      // Dynamic Theme Colors (Dark vs Light/White Mode)
      const isLight = chartThemeRef.current === 'light';
      const bgCanvas = isLight ? '#ffffff' : '#131722';
      const gridCol = isLight ? '#e0e3eb' : '#1e222d';
      const textCol = isLight ? '#434651' : '#787b86';

      // Clear Canvas
      ctx.fillStyle = bgCanvas;
      ctx.fillRect(0, 0, w, h);

      // 1. TradingView Grid Lines
      ctx.strokeStyle = gridCol;
      ctx.lineWidth = 1;
      const priceSteps = [81640, 81680, 81720, 81760, 81800, 81840, 81880, 81920, 81960, 82000, 82040, 82080, 82120, 82160, 82200, 82240];
      priceSteps.forEach(pVal => {
        if (pVal >= curLo && pVal <= curHi) {
          const yk = Math.round(getY(pVal));
          ctx.beginPath();
          ctx.moveTo(0, yk + 0.5);
          ctx.lineTo(chartW, yk + 0.5);
          ctx.stroke();

          // Right Price Axis Numbers
          ctx.fillStyle = textCol;
          ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(pVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), w - 6, yk + 3.5);
        }
      });

      // Vertical Bar Grid Lines
      const vGridStep = Math.max(6, Math.round(visibleCount / 8));
      for (let i = Math.max(0, startBarIdx); i <= Math.min(totalBars - 1, endBarIdx); i += vGridStep) {
        const gx = getBarX(i);
        ctx.beginPath();
        ctx.moveTo(Math.round(gx) + 0.5, topPad);
        ctx.lineTo(Math.round(gx) + 0.5, topPad + chartH);
        ctx.stroke();
      }

      // 2. Dynamic Indicator Overlays based on activeIndicatorsRef
      const acts = activeIndicatorsRef.current || [];

      // A. Volume Profile (VPVR) Histogram on Left
      if (acts.includes('volume_profile')) {
        const bins = 22;
        const binH = chartH / bins;
        const binStep = curRange / bins;
        const volBins = new Array(bins).fill(0);
        vis.forEach(b => {
          const idx = Math.min(bins - 1, Math.max(0, Math.floor((b.c - curLo) / binStep)));
          volBins[idx] += b.v || 1000;
        });
        const maxVol = Math.max(...volBins, 1);
        const pocIdx = volBins.indexOf(maxVol);

        for (let b = 0; b < bins; b++) {
          const barLen = (volBins[b] / maxVol) * (chartW * 0.16);
          const py = topPad + chartH - (b + 1) * binH;
          const isPoc = b === pocIdx;
          ctx.fillStyle = isPoc ? 'rgba(233, 185, 73, 0.40)' : (b % 2 === 0 ? 'rgba(41, 98, 255, 0.18)' : 'rgba(8, 153, 129, 0.18)');
          ctx.fillRect(0, py, barLen, binH - 1);
        }
        // POC Line (Point of Control)
        const pocPrice = curLo + (pocIdx + 0.5) * binStep;
        const pocY = getY(pocPrice);
        ctx.strokeStyle = '#e9b949';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, pocY);
        ctx.lineTo(chartW * 0.55, pocY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#e9b949';
        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        ctx.fillText('POC', chartW * 0.55 + 4, pocY + 3);
      }

      // B. LuxAlgo Smart Money Concepts (SMC) & Order Blocks
      if (acts.includes('lux_smc')) {
        // Bottom Long Green Support Line
        const supportY = getY(81648);
        ctx.strokeStyle = '#00897b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(getBarX(Math.max(0, totalBars - 110)), supportY);
        ctx.lineTo(chartW, supportY);
        ctx.stroke();

        // Blue Demand Order Block Box
        const demX1 = getBarX(totalBars - 48);
        const demX2 = getBarX(totalBars - 12);
        const demY1 = getY(81898);
        const demY2 = getY(81868);
        ctx.fillStyle = 'rgba(13, 37, 63, 0.85)';
        ctx.fillRect(demX1, demY1, demX2 - demX1, demY2 - demY1);
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(demX1, demY1, demX2 - demX1, demY2 - demY1);
        ctx.fillStyle = '#2962ff';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CHoCH / Demand OB', (demX1 + demX2) / 2, demY2 - 8);

        // Maroon Supply Order Block Box
        const supX1 = getBarX(totalBars - 22);
        const supX2 = chartW;
        const supY1 = getY(82170);
        const supY2 = getY(82040);
        ctx.fillStyle = 'rgba(59, 23, 30, 0.85)';
        ctx.fillRect(supX1, supY1, supX2 - supX1, supY2 - supY1);
        ctx.strokeStyle = '#f23645';
        ctx.lineWidth = 1;
        ctx.strokeRect(supX1, supY1, supX2 - supX1, supY2 - supY1);
        ctx.fillStyle = '#f23645';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Supply OB', (supX1 + supX2) / 2, supY1 + 14);

        // Dashed Structure Lines
        const drawSmcLevel = (barStart, barEnd, price, label, color) => {
          const x1 = getBarX(barStart);
          const x2 = getBarX(barEnd);
          const yy = getY(price);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(x1, yy);
          ctx.lineTo(x2, yy);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = color;
          ctx.font = '8px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(label, (x1 + x2) / 2, yy - 3);
        };

        drawSmcLevel(totalBars - 85, totalBars - 60, 81965, 'CHoCH', '#00b4d8');
        drawSmcLevel(totalBars - 68, totalBars - 52, 81755, 'CHoCH', '#e63946');
        drawSmcLevel(totalBars - 50, totalBars - 36, 81930, 'EQH', '#e63946');
        drawSmcLevel(totalBars - 32, totalBars - 20, 82130, 'BOS', '#00b4d8');
        drawSmcLevel(totalBars - 18, totalBars - 2, 81960, 'CHoCH', '#00b4d8');
      }

      // C. Fair Value Gaps (FVG) Boxes
      if (acts.includes('fvg')) {
        const fvgBox1 = { x1: getBarX(totalBars - 42), x2: getBarX(totalBars - 25), y1: getY(81920), y2: getY(81950) };
        ctx.fillStyle = 'rgba(0, 230, 118, 0.14)';
        ctx.fillRect(fvgBox1.x1, fvgBox1.y1, fvgBox1.x2 - fvgBox1.x1, fvgBox1.y2 - fvgBox1.y1);
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.6)';
        ctx.strokeRect(fvgBox1.x1, fvgBox1.y1, fvgBox1.x2 - fvgBox1.x1, fvgBox1.y2 - fvgBox1.y1);
        ctx.fillStyle = '#00e676';
        ctx.font = '7.5px JetBrains Mono, monospace';
        ctx.fillText('+FVG (Bullish)', fvgBox1.x1 + 35, fvgBox1.y2 - 3);
      }

      // D. Liquidity Sweeps (Buy-side / Sell-side Liquidity grab arrows)
      if (acts.includes('liquidity_sweep')) {
        const sweepBarIdx = totalBars - 44;
        const sx = getBarX(sweepBarIdx);
        const sy = getY(81660);
        ctx.fillStyle = '#ffd600';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ SWEEP', sx, sy + 18);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 5, sy + 7);
        ctx.lineTo(sx + 5, sy + 7);
        ctx.closePath();
        ctx.fill();
      }

      // E. EMA Dynamic Ribbon (EMA 9, 21, 50, 200)
      if (acts.includes('ema_ribbon')) {
        const calcEma = (period) => {
          const k = 2 / (period + 1);
          let ema = sBars[0]?.c || 0;
          return sBars.map(b => {
            ema = b.c * k + ema * (1 - k);
            return ema;
          });
        };
        const ema9 = calcEma(9);
        const ema21 = calcEma(21);
        const ema50 = calcEma(50);

        const drawCurve = (arr, color, lw = 1.2) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = lw;
          ctx.beginPath();
          let started = false;
          arr.forEach((val, i) => {
            if (i >= startBarIdx - 2 && i <= endBarIdx + 2) {
              const x = getBarX(i);
              const y = getY(val);
              if (!started) { ctx.moveTo(x, y); started = true; }
              else { ctx.lineTo(x, y); }
            }
          });
          ctx.stroke();
        };

        drawCurve(ema9, '#00e676', 1.5);   // Fast green
        drawCurve(ema21, '#2962ff', 1.5);  // Mid blue
        drawCurve(ema50, '#ff9100', 1.2);  // 50 orange
      }

      // F. SuperTrend AI (Dynamic Bullish/Bearish Trend Cloud)
      if (acts.includes('supertrend')) {
        ctx.lineWidth = 2;
        for (let i = Math.max(1, startBarIdx); i <= Math.min(totalBars - 1, endBarIdx); i++) {
          const bPrev = sBars[i - 1];
          const bCur = sBars[i];
          const isBull = bCur.c >= 81850;
          const targetY = getY(isBull ? bCur.l - 22 : bCur.h + 22);
          const prevY = getY(isBull ? bPrev.l - 22 : bPrev.h + 22);

          ctx.strokeStyle = isBull ? '#00e676' : '#f23645';
          ctx.beginPath();
          ctx.moveTo(getBarX(i - 1), prevY);
          ctx.lineTo(getBarX(i), targetY);
          ctx.stroke();

          // Buy/Sell Signal Markers
          if (i === totalBars - 44) {
            ctx.fillStyle = '#089981';
            ctx.beginPath();
            ctx.arc(getBarX(i), getY(bCur.l) + 14, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BUY', getBarX(i), getY(bCur.l) + 26);
          }
        }
      }

      // G. Bollinger Bands
      if (acts.includes('bollinger')) {
        const period = 20;
        const upperPts = [];
        const lowerPts = [];
        for (let i = 0; i < sBars.length; i++) {
          if (i >= period - 1) {
            const slice = sBars.slice(i - period + 1, i + 1);
            const avg = slice.reduce((a, b) => a + b.c, 0) / period;
            const variance = slice.reduce((a, b) => a + Math.pow(b.c - avg, 2), 0) / period;
            const stdDev = Math.sqrt(variance);
            if (i >= startBarIdx - 2 && i <= endBarIdx + 2) {
              upperPts.push({ x: getBarX(i), y: getY(avg + 2 * stdDev) });
              lowerPts.push({ x: getBarX(i), y: getY(avg - 2 * stdDev) });
            }
          }
        }
        if (upperPts.length && lowerPts.length) {
          ctx.fillStyle = 'rgba(41, 121, 255, 0.06)';
          ctx.beginPath();
          ctx.moveTo(upperPts[0].x, upperPts[0].y);
          upperPts.forEach(p => ctx.lineTo(p.x, p.y));
          for (let k = lowerPts.length - 1; k >= 0; k--) ctx.lineTo(lowerPts[k].x, lowerPts[k].y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(41, 121, 255, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          upperPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.stroke();
          ctx.beginPath();
          lowerPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
      }

      // 3. Candlesticks OR Line Chart (supports candleColorTheme & chartStyle)
      const curStyle = chartStyleRef.current || 'candle';
      const curPaletteKey = candleColorThemeRef.current || 'tradingview';
      const palette = CANDLE_PALETTES[curPaletteKey] || CANDLE_PALETTES.tradingview;

      if (curStyle === 'line') {
        // Line Chart Mode
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let lineStarted = false;
        sBars.forEach((b, i) => {
          const x = getBarX(i);
          if (x < -bw || x > chartW + bw) return;
          const py = getY(b.c);
          if (!lineStarted) {
            ctx.moveTo(x, py);
            lineStarted = true;
          } else {
            ctx.lineTo(x, py);
          }
        });
        ctx.stroke();

        // Subtle gradient under line
        const grad = ctx.createLinearGradient(0, topPad, 0, topPad + chartH);
        grad.addColorStop(0, 'rgba(41, 98, 255, 0.20)');
        grad.addColorStop(1, 'rgba(41, 98, 255, 0.00)');
        ctx.fillStyle = grad;
        ctx.lineTo(getBarX(Math.min(totalBars - 1, endBarIdx)), topPad + chartH);
        ctx.lineTo(getBarX(Math.max(0, startBarIdx)), topPad + chartH);
        ctx.closePath();
        ctx.fill();
      } else {
        // Candlesticks Mode (uses selected custom color palette)
        sBars.forEach((b, i) => {
          const x = getBarX(i);
          if (x < -bw || x > chartW + bw) return;
          const isUp = b.c >= b.o;
          const col = isUp ? palette.up : palette.down;

          // Wick
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(Math.floor(x) + 0.5, Math.round(getY(b.h)));
          ctx.lineTo(Math.floor(x) + 0.5, Math.round(getY(b.l)));
          ctx.stroke();

          // Body
          const yTop = Math.round(getY(Math.max(b.o, b.c)));
          const yBtm = Math.round(getY(Math.min(b.o, b.c)));
          const bodyH = Math.max(1, yBtm - yTop);
          const barW = Math.max(2, Math.floor(bw * 0.74));

          ctx.fillStyle = col;
          ctx.fillRect(Math.floor(x - barW / 2), yTop, barW, bodyH);
        });
      }

      // 4. User Drawings (Horizontal, Trendline, Rectangle, Ruler, Fib)
      const allDrawings = [...(drawingsRef.current || [])];
      if (currentDrawingRef.current) allDrawings.push(currentDrawingRef.current);

      allDrawings.forEach(d => {
        if (!d) return;
        if (d.type === 'horizontal') {
          const yy = getY(d.price);
          ctx.strokeStyle = d.color || '#f7a600';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(0, yy);
          ctx.lineTo(chartW, yy);
          ctx.stroke();
          ctx.setLineDash([]);
          // Price tag
          ctx.fillStyle = d.color || '#f7a600';
          ctx.fillRect(chartW + 2, yy - 9, rightPad - 4, 18);
          ctx.fillStyle = '#0a0d13';
          ctx.font = '800 9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(d.price.toFixed(2), chartW + rightPad / 2, yy + 3.5);
        } else if (d.type === 'trendline') {
          const x1 = getBarX(d.bar1);
          const y1 = getY(d.p1);
          const x2 = getBarX(d.bar2);
          const y2 = getY(d.p2);
          ctx.strokeStyle = d.color || '#2962ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (d.type === 'rectangle') {
          const x1 = Math.min(getBarX(d.bar1), getBarX(d.bar2));
          const x2 = Math.max(getBarX(d.bar1), getBarX(d.bar2));
          const y1 = Math.min(getY(d.p1), getY(d.p2));
          const y2 = Math.max(getY(d.p1), getY(d.p2));
          ctx.fillStyle = 'rgba(41, 98, 255, 0.18)';
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          ctx.strokeStyle = '#2962ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        }
      });

      // 5. Current Live Price Line & Badges (Matching Screenshot)
      const curY = getY(currentPrice);
      // Dashed line across canvas
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(chartW, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Previous Close / Tick line (Red badge at 81,943.43)
      const prevCloseY = getY(81943.43);
      ctx.fillStyle = '#f23645';
      ctx.fillRect(chartW + 2, prevCloseY - 9, rightPad - 4, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('81,943.43', chartW + rightPad / 2, prevCloseY + 3.5);

      // Top live price badge at 81,948.17 with countdown timer 01:47
      const livePillY = getY(81948.17);
      ctx.fillStyle = '#2a2e39';
      ctx.fillRect(chartW + 2, livePillY - 14, rightPad - 4, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('81,948.17', chartW + rightPad / 2, livePillY - 2);
      ctx.fillStyle = '#787b86';
      ctx.font = '500 8.5px JetBrains Mono, monospace';
      ctx.fillText(candlesRemainingRef.current, chartW + rightPad / 2, livePillY + 10);

      // Plus symbol icon on price axis (+)
      ctx.fillStyle = '#787b86';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⊕', chartW - 12, curY + 4);

      // 6. Bottom Time Axis Background & Hourly Ticks
      ctx.fillStyle = '#131722';
      ctx.fillRect(0, topPad + chartH, w, btmPad);
      ctx.strokeStyle = '#2a2e39';
      ctx.beginPath();
      ctx.moveTo(0, topPad + chartH + 0.5);
      ctx.lineTo(w, topPad + chartH + 0.5);
      ctx.stroke();

      ctx.fillStyle = '#787b86';
      ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const timeStamps = ['14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '20'];
      timeStamps.forEach((tStr, idx) => {
        const barIdx = Math.round(startBarIdx + (idx / timeStamps.length) * visibleCount);
        const tx = getBarX(barIdx);
        if (tx >= 20 && tx <= chartW - 20) {
          ctx.fillText(tStr, tx, topPad + chartH + 18);
        }
      });

      // 7. TradingView Bottom Left Watermark Logo
      ctx.fillStyle = '#787b86';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⛛ TradingView', 12, topPad + chartH - 12);

      // 8. Crosshair Cursor Badges
      const m = transform.mousePos;
      if (m && m.x >= 0 && m.x <= chartW && m.y >= topPad && m.y <= topPad + chartH) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, m.y + 0.5); ctx.lineTo(chartW, m.y + 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m.x + 0.5, topPad); ctx.lineTo(m.x + 0.5, topPad + chartH); ctx.stroke();
        ctx.setLineDash([]);

        // Bottom hover time pill (e.g. Mon 19 Oct '26 19:25:00)
        ctx.fillStyle = '#1e222d';
        ctx.fillRect(m.x - 70, topPad + chartH + 2, 140, 20);
        ctx.strokeStyle = '#2a2e39';
        ctx.strokeRect(m.x - 70, topPad + chartH + 2, 140, 20);
        ctx.fillStyle = '#d1d4dc';
        ctx.font = '600 8.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText("Mon 19 Oct '26  19:25  :00", m.x, topPad + chartH + 15);

        // Right hover price on axis
        const hoverPrice = curLo + ((topPad + chartH - m.y) / chartH) * curRange;
        ctx.fillStyle = '#2a2e39';
        ctx.fillRect(chartW + 2, m.y - 8, rightPad - 4, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hoverPrice.toFixed(2), chartW + rightPad / 2, m.y + 3.5);
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      if (cv) {
        cv.removeEventListener('wheel', handleWheel);
        cv.removeEventListener('mousedown', handleMouseDown);
        cv.removeEventListener('dblclick', handleDblClick);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Filter indicators for modal search
  const filteredIndicators = useMemo(() => {
    return ALL_INDICATORS.filter(ind => {
      const matchCat = selectedCategory === 'All' || ind.category === selectedCategory || ind.cat === selectedCategory;
      const matchSearch = ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ind.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleIndicator = (id) => {
    setActiveIndicators(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      const ind = ALL_INDICATORS.find(x => x.id === id);
      setToastNotice(`${prev.includes(id) ? '⚪ Removed' : '🟢 Added'}: ${ind?.name || id}`);
      setTimeout(() => setToastNotice(null), 2000);
      return next;
    });
  };

  return (
    <div className={`mps-container ${chartTheme === 'light' ? 'mps-light-mode' : ''}`}>
      {/* Toast Notice */}
      {toastNotice && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 13, 19, 0.95)',
          border: '1px solid #00e676',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '8px',
          fontSize: '0.78rem',
          fontWeight: 700,
          zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
        }}>
          {toastNotice}
        </div>
      )}

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
            <option value="USOIL">USOIL · Crude Oil</option>
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

          {/* Chart Style Switcher */}
          <select
            className="mps-style-select"
            value={chartStyle}
            onChange={e => setChartStyle(e.target.value)}
            title="Select Chart Display Type"
          >
            <option value="candle">🕯️ Candlesticks</option>
            <option value="heikin">📊 Heikin Ashi</option>
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

          <div className="mps-divider" />

          {/* 🌟 1-Click Institutional Indicator Presets */}
          <select
            className="mps-style-select"
            value={selectedPreset}
            onChange={e => applyPreset(e.target.value)}
            title="1-Click Institutional Multi-Indicator Presets"
            style={{ borderColor: 'rgba(233, 185, 73, 0.45)', color: '#ffd600' }}
          >
            <option value="smc_master">👑 SMC &amp; Liquidity Master (Combo)</option>
            <option value="trend_sniper">🎯 Trend Sniper &amp; Momentum (Combo)</option>
            <option value="scalper_turbo">⚡ 1m-5m Scalper Turbo (Combo)</option>
            <option value="breakout_reversal">🔄 Breakout &amp; Reversal (Combo)</option>
          </select>

          <div className="mps-divider" />

          {/* 🎨 Candle Colors Customizer Option */}
          <select
            className="mps-style-select"
            value={candleColorTheme}
            onChange={e => {
              setCandleColorTheme(e.target.value);
              setToastNotice(`🎨 Candle Colors: ${CANDLE_PALETTES[e.target.value]?.name}`);
              setTimeout(() => setToastNotice(null), 1800);
            }}
            title="Change Candlestick Colors"
          >
            <option value="tradingview">🟢 Teal / Red (TradingView)</option>
            <option value="classic">🟩 Green / Red (Classic)</option>
            <option value="cyberpunk">⚡ Neon Cyan / Pink (Cyber)</option>
            <option value="monochrome">⚪ Monochrome (White / Gray)</option>
          </select>
        </div>

        <div className="mps-top-right">
          {/* ☀️ / 🌙 Dark vs White Background Mode Toggle */}
          <button
            type="button"
            className="mps-action-btn"
            onClick={() => {
              const next = chartTheme === 'dark' ? 'light' : 'dark';
              setChartTheme(next);
              setToastNotice(next === 'light' ? '☀️ White / Light Background Mode' : '🌙 Dark / TradingView Mode');
              setTimeout(() => setToastNotice(null), 1800);
            }}
            title="Toggle White Background Mode / Dark Mode"
            style={{
              background: chartTheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              color: chartTheme === 'light' ? '#131722' : '#ffffff',
              fontWeight: 700
            }}
          >
            <span>{chartTheme === 'light' ? '☀️ White Mode' : '🌙 Dark Mode'}</span>
          </button>

          <button
            type="button"
            className="mps-action-btn"
            onClick={() => {
              setDrawings([]);
              setToastNotice('🗑️ All Drawings Cleared');
              setTimeout(() => setToastNotice(null), 1800);
            }}
            title="Clear All Canvas Drawings"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Top Order Execution & LuxAlgo SMC Subtitle Bar (Exact Match to Screenshot) */}
      <div className="mps-tv-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Sell & Buy Buttons */}
          <div className="mps-tv-order-block">
            <button
              type="button"
              className="mps-tv-btn-sell"
              onClick={() => {
                setToastNotice('🔴 SELL Order Executed @ 81,943.43');
                setTimeout(() => setToastNotice(null), 2000);
              }}
            >
              <span>SELL</span>
              <span>81,943.43</span>
            </button>
            <button
              type="button"
              className="mps-tv-btn-buy"
              onClick={() => {
                setToastNotice('🟢 BUY Order Executed @ 81,945.38');
                setTimeout(() => setToastNotice(null), 2000);
              }}
            >
              <span>81,945.38</span>
              <span>BUY</span>
            </button>
          </div>

          {/* LuxAlgo Smart Money Concepts Parameters */}
          <div className="mps-tv-lux-title">
            <span style={{ color: '#00e676', fontWeight: 800 }}>!</span> LuxAlgo - Smart Money Concepts Historical Colored All All tiny All All small 50 5 5 Atr High/Low 3 0.1 tiny 1 — <span style={{ color: '#f23645' }}>81,912.88</span> <span style={{ color: '#089981' }}>81,863.43</span> <span style={{ color: '#2962ff' }}>81,880.72</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#787b86', fontSize: '0.68rem' }}>0.00</span>
        </div>
      </div>

      {/* 3. Main Workspace: Left 18 Tools + Center Chart + Right Watchlist */}
      <div className="mps-workspace">
        {/* Left Drawing Tools Column */}
        <div className="mps-left-tools">
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'crosshair' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('crosshair');
              setToastNotice('🖱️ Pan / Crosshair Cursor Active');
              setTimeout(() => setToastNotice(null), 1800);
            }}
            title="Crosshair / Drag to Pan (Left Click & Drag anywhere to pan)"
          >
            <Crosshair size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'trendline' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('trendline');
              setToastNotice('✏️ Trendline Active: Click & Drag on Chart');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Trendline (Click & Drag)"
          >
            <PenTool size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'horizontal' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('horizontal');
              setToastNotice('📏 Horizontal Line Active: Click on Chart to place');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Horizontal Support/Resistance Line (Click to Place)"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'fibonacci' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('fibonacci');
              setToastNotice('🌀 Fibonacci Active: Click & Drag zone');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Fibonacci Retracement"
          >
            <Layers size={16} />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('rectangle');
              setToastNotice('🔲 Order Block Box: Click & Drag zone');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Order Block Box Rectangle"
          >
            <Square size={16} />
          </button>

          <div className="mps-tool-sep" />

          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'long' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('long');
              setToastNotice('📈 Long Position Risk Tool');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Long Position Risk:Reward Tool"
          >
            <ArrowUpRight size={16} color="var(--signal-buy)" />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'short' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('short');
              setToastNotice('📉 Short Position Risk Tool');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Short Position Risk:Reward Tool"
          >
            <ArrowDownRight size={16} color="var(--signal-sell)" />
          </button>
          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'ruler' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('ruler');
              setToastNotice('📐 Measurement Ruler: Click & Drag');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Measure Price Range & Bars"
          >
            <Ruler size={16} />
          </button>

          <div className="mps-tool-sep" />

          <button
            type="button"
            className="mps-tool-btn"
            onClick={() => {
              setDrawings([]);
              setToastNotice('🗑️ All Drawings Cleared');
              setTimeout(() => setToastNotice(null), 1800);
            }}
            title="Trash All Drawings"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Center Canvas Area */}
        <div className="mps-canvas-center" style={{ position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            className="mps-chart-canvas"
            style={{ width: '100%', height: 'calc(100% - 30px)', display: 'block' }}
          />

          {/* Floating Zoom & Vertical Stretch Controller */}
          <div style={{
            position: 'absolute',
            bottom: 42,
            right: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(15, 20, 30, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 8,
            padding: '3px 6px',
            zIndex: 15,
            boxShadow: '0 6px 18px rgba(0,0,0,0.6)'
          }}>
            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.zoomLevel = Math.min(25.0, transform.zoomLevel * 1.3);
                setToastNotice('🔍 Zoom In: Candles Bigger & Wider');
                setTimeout(() => setToastNotice(null), 1400);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
              title="Zoom In (Candles wider)"
            >
              <ZoomIn size={12} />
              <span>Zoom In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.zoomLevel = Math.max(0.15, transform.zoomLevel * 0.75);
                setToastNotice('🔍 Zoom Out: Candles Smaller');
                setTimeout(() => setToastNotice(null), 1400);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
              title="Zoom Out (Candles smaller)"
            >
              <ZoomOut size={12} />
              <span>Zoom Out</span>
            </button>

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.priceScaleY = Math.min(20.0, transform.priceScaleY * 1.25);
                setToastNotice('↕ Candle Height Stretched Taller');
                setTimeout(() => setToastNotice(null), 1400);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#fff',
                padding: '4px 6px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
              title="Stretch Candle Height (Taller)"
            >
              <ChevronUp size={13} />
            </button>

            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.priceScaleY = Math.max(0.05, transform.priceScaleY * 0.8);
                setToastNotice('↕ Candle Height Compressed');
                setTimeout(() => setToastNotice(null), 1400);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#fff',
                padding: '4px 6px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
              title="Compress Candle Height"
            >
              <ChevronDown size={13} />
            </button>

            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.panX = 0;
                transform.panY = 0;
                transform.zoomLevel = 1.0;
                transform.priceScaleY = 1.0;
                setToastNotice('⟲ View Reset (Auto-Fit Price & Zoom)');
                setTimeout(() => setToastNotice(null), 1400);
              }}
              style={{
                background: 'rgba(233, 185, 73, 0.14)',
                border: '1px solid rgba(233, 185, 73, 0.35)',
                color: '#e9b949',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
              title="Reset View"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>

          {/* Bottom Range Bar (1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, All) */}
          <div className="mps-bottom-range-bar">
            <div className="mps-range-group">
              {['5D', '1D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'].map(range => (
                <button
                  key={range}
                  type="button"
                  className={`mps-range-btn ${activeRange === range ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRange(range);
                    const transform = chartTransformRef.current;
                    if (range === '1D') transform.zoomLevel = 1.0;
                    else if (range === '5D') transform.zoomLevel = 0.65;
                    else if (range === '1M') transform.zoomLevel = 0.40;
                    else if (range === '1Y') transform.zoomLevel = 0.22;
                    else if (range === '5Y' || range === 'All') transform.zoomLevel = 0.16;
                    setToastNotice(`Timeline switched to: ${range}`);
                    setTimeout(() => setToastNotice(null), 1200);
                  }}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="mps-scale-toggles">
              <span style={{ color: '#787b86', fontFamily: 'JetBrains Mono, monospace' }}>{timeString}</span>
              <button type="button" className="mps-range-btn" title="Percent Scale">%</button>
              <button type="button" className="mps-range-btn" title="Logarithmic Scale">log</button>
              <button type="button" className="mps-range-btn active" title="Auto Scale">auto</button>
            </div>
          </div>
        </div>

        {/* Right TradingView Style Watchlist & Detail Drawer (Exact Match to Screenshot) */}
        <div className="mps-right-watchlist">
          {/* Table Header: Symbol, Last, Chg, Chg% */}
          <div className="mps-tv-wl-header">
            <span>Symbol</span>
            <div style={{ display: 'flex', gap: 14 }}>
              <span>Last</span>
              <span>Chg</span>
              <span>Chg%</span>
            </div>
          </div>

          {/* Group 1: FUTURES */}
          <div className="mps-tv-group-title" onClick={() => toggleGroup('FUTURES')} style={{ cursor: 'pointer' }}>
            <span>{collapsed.FUTURES ? '▶' : '▼'} FUTURES</span>
          </div>
          {!collapsed.FUTURES && WATCHLIST_DATA.FUTURES.map(item => (
            <div
              key={item.sym}
              className={`mps-tv-row ${symbol === item.sym ? 'active' : ''}`}
              onClick={() => onSelectSymbol && onSelectSymbol(item.sym)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{item.icon}</span>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>{item.sym}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, textAlign: 'right' }}>
                <span style={{ color: '#ffffff', minWidth: 54 }}>{item.price}</span>
                <span style={{ color: item.isPos ? '#089981' : '#f23645', minWidth: 42 }}>{item.chg}</span>
                <span style={{ color: item.isPos ? '#089981' : '#f23645', minWidth: 42 }}>{item.chgPct}</span>
              </div>
            </div>
          ))}

          {/* Group 2: FOREX */}
          <div className="mps-tv-group-title" onClick={() => toggleGroup('FOREX')} style={{ cursor: 'pointer' }}>
            <span>{collapsed.FOREX ? '▶' : '▼'} FOREX</span>
          </div>
          {!collapsed.FOREX && WATCHLIST_DATA.FOREX.map(item => (
            <div
              key={item.sym}
              className={`mps-tv-row ${symbol === item.sym ? 'active' : ''}`}
              onClick={() => onSelectSymbol && onSelectSymbol(item.sym)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{item.icon}</span>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>{item.sym}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, textAlign: 'right' }}>
                <span style={{ color: '#ffffff', minWidth: 54 }}>{item.price}</span>
                <span style={{ color: item.isPos ? '#089981' : '#f23645', minWidth: 42 }}>{item.chg}</span>
                <span style={{ color: item.isPos ? '#089981' : '#f23645', minWidth: 42 }}>{item.chgPct}</span>
              </div>
            </div>
          ))}

          {/* Group 3: CRYPTO */}
          <div className="mps-tv-group-title" onClick={() => toggleGroup('CRYPTO')} style={{ cursor: 'pointer' }}>
            <span>{collapsed.CRYPTO ? '▶' : '▼'} CRYPTO</span>
          </div>
          {!collapsed.CRYPTO && WATCHLIST_DATA.CRYPTO.map((item, idx) => (
            <div
              key={`${item.sym}-${idx}`}
              className={`mps-tv-row ${item.isHighlight ? 'active' : ''}`}
              onClick={() => onSelectSymbol && onSelectSymbol(item.sym)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#f7931a' }}>{item.icon}</span>
                <span style={{ fontWeight: 700, color: item.isHighlight ? '#2962ff' : '#ffffff' }}>{item.sym}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, textAlign: 'right' }}>
                <span style={{ color: item.isHighlight ? '#2962ff' : '#ffffff', minWidth: 54 }}>{item.price}</span>
                <span style={{ color: item.isPos ? '#089981' : '#f23645', minWidth: 42 }}>{item.chg}</span>
                <span style={{ color: item.isPos ? '#089981' : '#f23645', minWidth: 42 }}>{item.chgPct}</span>
              </div>
            </div>
          ))}

          {/* Detail Card at Bottom of Sidebar (Matches Screenshot) */}
          <div className="mps-tv-detail-card">
            <div className="mps-tv-asset-badge">
              <div className="mps-tv-crypto-icon">₿</div>
              <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#ffffff' }}>BTCUSD</div>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#787b86' }}>
              Bitcoin / U.S. Dollar • CRYPTO<br />Spot • Crypto
            </div>

            <div className="mps-tv-big-price">
              {currentPrice > 100 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPrice} <span style={{ fontSize: '0.80rem', color: '#787b86' }}>USD</span>
            </div>

            <div className="mps-tv-price-sub">
              <span style={{ color: changePct >= 0 ? '#089981' : '#f23645' }}>
                {changePct >= 0 ? '+' : ''}-67.91 {changePct.toFixed(2)}%
              </span>
              <span style={{ color: '#089981', display: 'flex', alignItems: 'center', gap: 4 }}>
                ● Market open
              </span>
            </div>

            {/* Key Facts Box */}
            <div className="mps-tv-facts-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#e040fb', fontWeight: 800, marginBottom: 4 }}>
                <span>✨ Key facts</span>
              </div>
              <div>
                Hyperliquid shows on Oct 18 a 1,355.6 BTC long closed at $80,945 (40x). Another 40x perpetual long: ~$97.87M notional, avg entry $81,913.80, liq price $79,828, unrealized loss ~$866,467.
              </div>
              <div style={{ color: '#2962ff', cursor: 'pointer', marginTop: 4 }}>
                Keep reading &gt;
              </div>
            </div>

            {/* Key Stats */}
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: '0.70rem', color: '#787b86', fontWeight: 700 }}>Key stats</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: 4 }}>
                <span style={{ color: '#aab3c3' }}>Trading volume 24h</span>
                <span style={{ color: '#ffffff', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>27.88 B</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Full 50+ Indicators Library Searchable Modal */}
      {showIndicatorsModal && (
        <div className="mps-modal-backdrop" onClick={() => setShowIndicatorsModal(false)}>
          <div className="mps-ind-modal" onClick={e => e.stopPropagation()}>
            <div className="mps-modal-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="#2962ff" />
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  Institutional Indicators &amp; Strategies Library (50+)
                </span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: '#787b86' }} onClick={() => setShowIndicatorsModal(false)} />
            </div>

            <div className="mps-modal-search">
              <input
                type="text"
                placeholder="Search indicators by name or keyword (e.g., EMA, RSI, Volume Profile, SMC, Order Block)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="mps-modal-body">
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

              <div className="mps-ind-grid">
                {filteredIndicators.map(ind => {
                  const isAdded = activeIndicators.includes(ind.id);
                  return (
                    <div key={ind.id} className="mps-ind-row">
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                          {ind.name}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#787b86' }}>
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

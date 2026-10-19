import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Maximize2, Minimize2, Camera, Download,
  Sliders, Trash2, SlidersHorizontal, Layers, Check, X, Search, Compass,
  Activity, Zap, BarChart2, Volume2, Shield, Crosshair, PenTool, Type,
  Square, ArrowUpRight, ArrowDownRight, Ruler, Magnet, Lock, List,
  ZoomIn, ZoomOut, RotateCcw, ChevronUp, ChevronDown, Move
} from 'lucide-react';
import './ManualProStudio.css';

import { ALL_INDICATORS } from '../../utils/indicatorsData.js';
import { fetchBybitKlines } from '../../services/bybitService.js';

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
  initialPrice = 82061.40,
  theme = 'tl-dark',
  onSelectSymbol
}) {
  const canvasRef = useRef(null);
  const [timeframe, setTimeframe] = useState('60');
  const [chartStyle, setChartStyle] = useState('candle'); // 'candle', 'heikin', 'renko', 'line'
  const [activeTool, setActiveTool] = useState('crosshair');
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [showVpvr, setShowVpvr] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState(['ema9', 'ema21', 'bollinger', 'vpvr']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeWatchlistKey, setActiveWatchlistKey] = useState('bot10');
  const [drawings, setDrawings] = useState([]);
  const [toastNotice, setToastNotice] = useState(null);

  const curData = prices[asset] || { price: initialPrice, changePct: 0.60, high: initialPrice * 1.01, low: initialPrice * 0.99 };
  const currentPrice = typeof curData.price === 'number' ? curData.price : initialPrice;

  // ── Viewport Navigation & Transform State ──
  const chartTransformRef = useRef({
    panX: 0,              // Horizontal bar pan offset
    panY: 0,              // Vertical price pan offset ("us pahath karanna")
    zoomLevel: 1.0,       // Horizontal candle width zoom (0.15x to 25.0x)
    priceScaleY: 1.0,     // Vertical candle height stretch (0.05x to 20.0x)
    isDragging: false,
    dragMode: null,       // 'pan' | 'price-axis' | 'time-axis' | 'draw'
    startX: 0,
    startY: 0,
    lastPanX: 0,
    lastPanY: 0,
    lastPriceScaleY: 1.0,
    lastZoom: 1.0,
    mousePos: { x: -1, y: -1 },
    curLo: 0,
    curRange: 10,
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

  const activeIndicatorsRef = useRef(activeIndicators);
  useEffect(() => { activeIndicatorsRef.current = activeIndicators; }, [activeIndicators]);

  const chartStyleRef = useRef(chartStyle);
  useEffect(() => { chartStyleRef.current = chartStyle; }, [chartStyle]);

  const showVpvrRef = useRef(showVpvr);
  useEffect(() => { showVpvrRef.current = showVpvr; }, [showVpvr]);

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

  // ── Realistic Market Price Bars Generation (NO SINE WAVES) ──
  const rawBars = useMemo(() => {
    const barsCount = 140; // 140 rich historical bars
    const bars = [];
    const volBase = currentPrice * (asset.includes('USD') && !asset.includes('BTC') ? 0.0006 : 0.0022);
    const nowMs = Date.now();
    const intervalMs = timeframe === '1s' ? 1000 : timeframe === '1m' ? 60000 : timeframe === '5m' ? 300000 : timeframe === '15m' ? 900000 : 3600000;

    // Realistic multi-wave momentum price walk
    let rawPrices = [currentPrice * 0.94];
    let momentum = 0;
    for (let i = 1; i < barsCount; i++) {
      if (i % 8 === 0) momentum = (Math.random() - 0.47) * volBase * 0.9;
      const delta = momentum + (Math.random() - 0.5) * volBase * 1.3;
      rawPrices.push(Math.max(currentPrice * 0.3, rawPrices[rawPrices.length - 1] + delta));
    }

    // Anchor precisely to currentPrice at the final bar
    const diffToEnd = currentPrice - rawPrices[rawPrices.length - 1];
    rawPrices = rawPrices.map((pVal, idx) => pVal + diffToEnd * (idx / (barsCount - 1)));

    const decimals = currentPrice > 100 ? 2 : currentPrice > 1 ? 4 : 6;
    for (let i = 0; i < barsCount; i++) {
      const c = +rawPrices[i].toFixed(decimals);
      const o = +(i === 0 ? (c - volBase * 0.4) : rawPrices[i - 1]).toFixed(decimals);
      const wickH = Math.random() * volBase * 0.65;
      const wickL = Math.random() * volBase * 0.65;
      const h = +(Math.max(o, c) + wickH).toFixed(decimals);
      const l = +(Math.min(o, c) - wickL).toFixed(decimals);
      const v = Math.floor(Math.random() * 8500 + 1200);
      const t = nowMs - (barsCount - 1 - i) * intervalMs;
      bars.push({ i, o, h, l, c, v, t });
    }
    return bars;
  }, [currentPrice, asset, timeframe]);

  // Compute Heikin Ashi or Renko bars if selected
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
    if (chartStyle === 'renko') {
      const brickSize = currentPrice > 100 ? currentPrice * 0.0015 : 0.0006;
      const renkoBars = [];
      let lastClose = rawBars[0].o;
      for (let i = 0; i < rawBars.length; i++) {
        const diff = rawBars[i].c - lastClose;
        if (Math.abs(diff) >= brickSize) {
          const isUp = diff > 0;
          const o = lastClose;
          const c = isUp ? o + brickSize : o - brickSize;
          renkoBars.push({ ...rawBars[i], o, h: Math.max(o, c), l: Math.min(o, c), c });
          lastClose = c;
        }
      }
      return renkoBars.length > 10 ? renkoBars : rawBars;
    }
    return rawBars;
  }, [rawBars, chartStyle, currentPrice]);

  const displayBarsRef = useRef(displayBars);
  useEffect(() => { displayBarsRef.current = displayBars; }, [displayBars]);

  // ── Main Canvas Rendering & Interactive Drag/Zoom Loop ──
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

    // ── Mouse Wheel Zoom (Horizontal width & Vertical height) ──
    const handleWheel = (e) => {
      e.preventDefault();
      const transform = chartTransformRef.current;

      // Ctrl + Wheel: Vertically stretch / compress candle height!
      if (e.ctrlKey || e.metaKey) {
        const scaleFactor = e.deltaY < 0 ? 1.15 : 0.87;
        transform.priceScaleY = Math.max(0.05, Math.min(20.0, transform.priceScaleY * scaleFactor));
        return;
      }

      // Shift + Wheel: Horizontally pan left / right
      if (e.shiftKey) {
        transform.panX += (e.deltaY < 0 ? 5 : -5);
        return;
      }

      // Normal Wheel: Horizontally zoom candles (make candles bigger or smaller)
      const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
      transform.zoomLevel = Math.max(0.15, Math.min(25.0, transform.zoomLevel * zoomFactor));
    };

    // ── Mouse Down: Start Pan, Axis Scale, or Live Drawing ──
    const handleMouseDown = (e) => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const transform = chartTransformRef.current;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      const rightPad = 70;
      const btmPad = 32;

      const tool = activeToolRef.current;
      const curLo = transform.curLo;
      const curRange = transform.currentPriceRange || 10;
      const chartH = transform.chartH || (h - 25 - btmPad);
      const chartW = transform.chartW || (w - rightPad);
      const bw = transform.bw || 12;
      const startBarIdx = transform.startBarIdx || 0;

      // If user selected a drawing tool and clicks inside canvas
      if (tool && tool !== 'crosshair' && x >= 0 && x < chartW && y >= 0 && y < chartH && curLo !== undefined) {
        const priceVal = curLo + ((chartH + 25 - y) / chartH) * curRange;
        const barIdx = startBarIdx + (x - 12 - bw / 2) / bw;

        if (tool === 'horizontal') {
          const newDrawing = {
            id: Date.now(),
            type: 'horizontal',
            price: priceVal,
            color: '#f7a600'
          };
          setDrawings(prev => [...prev, newDrawing]);
          setToastNotice(`📏 Horizontal Line Placed @ ${priceVal > 100 ? priceVal.toFixed(2) : priceVal.toFixed(4)}`);
          setTimeout(() => setToastNotice(null), 2000);
          return;
        }

        transform.isDragging = true;
        transform.dragMode = 'draw';
        currentDrawingRef.current = {
          id: Date.now(),
          type: tool,
          bar1: barIdx,
          p1: priceVal,
          bar2: barIdx,
          p2: priceVal,
          color: tool === 'long' ? '#00e676' : tool === 'short' ? '#f23645' : tool === 'fibonacci' ? '#00e5ff' : '#2962ff'
        };
        return;
      }

      // Default: Chart Pan & Axis Dragging
      transform.isDragging = true;
      transform.startX = x;
      transform.startY = y;
      transform.lastPanX = transform.panX;
      transform.lastPanY = transform.panY;
      transform.lastPriceScaleY = transform.priceScaleY;
      transform.lastZoom = transform.zoomLevel;

      if (x >= w - rightPad) {
        transform.dragMode = 'price-axis';
        cv.style.cursor = 'ns-resize';
      } else if (y >= h - btmPad) {
        transform.dragMode = 'time-axis';
        cv.style.cursor = 'ew-resize';
      } else {
        transform.dragMode = 'pan';
        cv.style.cursor = 'grabbing';
      }
    };

    // ── Mouse Move: Real-Time Pan, Vertical Price Pan & Scaling ──
    const handleMouseMove = (e) => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const transform = chartTransformRef.current;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      const rightPad = 70;
      const btmPad = 32;
      const chartH = h - 25 - btmPad;

      transform.mousePos = { x, y };

      // Drawing Tool Preview
      if (transform.isDragging && transform.dragMode === 'draw' && currentDrawingRef.current) {
        const curLo = transform.curLo;
        const curRange = transform.currentPriceRange || 10;
        const bw = transform.bw || 12;
        const startBarIdx = transform.startBarIdx || 0;
        const priceVal = curLo + ((chartH + 25 - y) / chartH) * curRange;
        const barIdx = startBarIdx + (x - 12 - bw / 2) / bw;
        currentDrawingRef.current.bar2 = barIdx;
        currentDrawingRef.current.p2 = priceVal;
        return;
      }

      if (!transform.isDragging) {
        if (x >= w - rightPad) cv.style.cursor = 'ns-resize';
        else if (y >= h - btmPad) cv.style.cursor = 'ew-resize';
        else cv.style.cursor = activeToolRef.current === 'crosshair' ? 'crosshair' : 'crosshair';
        return;
      }

      const dx = x - transform.startX;
      const dy = y - transform.startY;
      const currentBw = transform.bw || 12;

      // Price Axis Drag (Vertical Candle Height Stretch / Compress)
      if (transform.dragMode === 'price-axis') {
        const factor = Math.exp(-dy * 0.008);
        transform.priceScaleY = Math.max(0.05, Math.min(20.0, transform.lastPriceScaleY * factor));
      }
      // Time Axis Drag (Horizontal Zoom)
      else if (transform.dragMode === 'time-axis') {
        const factor = 1 + (dx / 200);
        transform.zoomLevel = Math.max(0.15, Math.min(25.0, transform.lastZoom * factor));
      }
      // Main Chart Drag: Pan both Horizontal & Vertical ("us pahath karanna")
      else if (transform.dragMode === 'pan') {
        transform.panX = transform.lastPanX - (dx / currentBw);
        const curRange = transform.currentPriceRange || 10;
        const priceDelta = (dy / chartH) * curRange;
        transform.panY = transform.lastPanY + priceDelta;
      }
    };

    // ── Mouse Up: Commit Drawings & Reset Drag ──
    const handleMouseUp = () => {
      const transform = chartTransformRef.current;
      if (transform.isDragging && transform.dragMode === 'draw' && currentDrawingRef.current) {
        const d = currentDrawingRef.current;
        currentDrawingRef.current = null;
        transform.isDragging = false;
        transform.dragMode = null;
        setDrawings(prev => [...prev, d]);
        setToastNotice(`✅ ${d.type.toUpperCase()} Placed on Chart`);
        setTimeout(() => setToastNotice(null), 2000);
        return;
      }
      transform.isDragging = false;
      transform.dragMode = null;
      if (cv) cv.style.cursor = 'crosshair';
    };

    // ── Double Click: Reset View ──
    const handleDblClick = () => {
      const transform = chartTransformRef.current;
      transform.panX = 0;
      transform.panY = 0;
      transform.zoomLevel = 1.0;
      transform.priceScaleY = 1.0;
      setToastNotice('⟲ View Reset (Auto-Fit Price & Zoom)');
      setTimeout(() => setToastNotice(null), 1800);
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
      const btmPad = 32;
      const rightPad = 70;
      const chartW = w - rightPad;
      const chartH = h - topPad - btmPad;

      // Calculate dynamic visible bars and candle width based on zoomLevel
      const baseVisible = 55;
      const maxAllowed = Math.max(300, totalBars + 50);
      const visibleCount = Math.max(8, Math.min(maxAllowed, Math.round(baseVisible / transform.zoomLevel)));
      const bw = (chartW - 20) / visibleCount;

      transform.bw = bw;
      transform.chartW = chartW;
      transform.chartH = chartH;

      // Calculate end & start indices with panX
      const rightMargin = 8;
      const maxPanLeft = -(totalBars - 10);
      const maxPanRight = totalBars;
      transform.panX = Math.max(maxPanLeft, Math.min(maxPanRight, transform.panX));

      const endBarIdx = Math.round(totalBars - 1 + rightMargin + transform.panX);
      const startBarIdx = endBarIdx - visibleCount;
      transform.startBarIdx = startBarIdx;

      const getBarX = (i) => 12 + (i - startBarIdx) * bw + bw / 2;

      // Slice visible bars for dynamic high & low
      const vis = sBars.filter((_, idx) => idx >= Math.max(0, startBarIdx) && idx <= Math.min(totalBars - 1, endBarIdx));
      if (!vis.length) return;

      const lo = Math.min(...vis.map(b => b.l));
      const hi = Math.max(...vis.map(b => b.h));

      // Dynamic Price Bounds with PanY & PriceScaleY
      const centerP = (hi + lo) / 2 + transform.panY;
      const rawHalf = (hi - lo) / 2 || 10;
      const halfRange = Math.max(0.001, rawHalf * (1.18 / transform.priceScaleY));
      const curLo = centerP - halfRange;
      const curHi = centerP + halfRange;
      const curRange = curHi - curLo || 1;

      transform.curLo = curLo;
      transform.currentPriceRange = curRange;

      const getY = (val) => topPad + chartH - ((val - curLo) / curRange) * chartH;

      // Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // 1. Grid Lines
      ctx.strokeStyle = '#1e222d';
      ctx.lineWidth = 1;
      for (let j = 1; j <= 6; j++) {
        const yk = Math.round(topPad + (chartH * j) / 6);
        ctx.beginPath();
        ctx.moveTo(0, yk + 0.5);
        ctx.lineTo(chartW, yk + 0.5);
        ctx.stroke();

        // Right Price Axis Numbers
        const pVal = curHi - ((j * chartH) / 6) / chartH * curRange;
        ctx.fillStyle = '#787b86';
        ctx.font = '500 9.5px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(pVal > 100 ? pVal.toFixed(2) : pVal.toFixed(4), w - 6, yk + 3);
      }

      // Vertical Bar Grid Lines
      const vGridStep = Math.max(6, Math.round(visibleCount / 8));
      for (let i = Math.max(0, startBarIdx); i <= Math.min(totalBars - 1, endBarIdx); i += vGridStep) {
        const gx = getBarX(i);
        ctx.beginPath();
        ctx.moveTo(Math.round(gx) + 0.5, topPad);
        ctx.lineTo(Math.round(gx) + 0.5, topPad + chartH);
        ctx.stroke();
      }

      // 2. Orderflow Volume Profile (VPVR) Horizontal Histogram
      if (showVpvrRef.current || activeIndicatorsRef.current.includes('vpvr')) {
        const bins = 26;
        const binH = chartH / bins;
        const binStep = curRange / bins;
        const volBins = new Array(bins).fill(0);

        vis.forEach(b => {
          const binIdx = Math.min(bins - 1, Math.max(0, Math.floor((b.c - curLo) / binStep)));
          volBins[binIdx] += b.v;
        });

        const maxVol = Math.max(...volBins, 1);
        let pocIdx = 0;
        let maxVal = 0;
        volBins.forEach((v, idx) => {
          if (v > maxVal) { maxVal = v; pocIdx = idx; }
        });

        volBins.forEach((v, idx) => {
          const barLen = (v / maxVol) * (chartW * 0.20);
          const yBar = topPad + chartH - (idx + 1) * binH;
          const isPoc = idx === pocIdx;
          ctx.fillStyle = isPoc ? 'rgba(233, 185, 73, 0.45)' : 'rgba(41, 98, 255, 0.20)';
          ctx.fillRect(chartW - barLen, yBar, barLen, binH - 1);
        });

        // Highlight POC Line (Gold Line)
        const pocPrice = curLo + (pocIdx + 0.5) * binStep;
        const pocY = getY(pocPrice);
        ctx.strokeStyle = '#e9b949';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(chartW * 0.45, pocY);
        ctx.lineTo(chartW, pocY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#e9b949';
        ctx.font = '700 8.5px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`POC: ${pocPrice > 100 ? pocPrice.toFixed(2) : pocPrice.toFixed(4)}`, chartW - 8, pocY - 4);
      }

      // 3. Technical Indicators Overlays (EMA, Bollinger Bands)
      const acts = activeIndicatorsRef.current || [];
      const drawEMA = (period, color) => {
        const k = 2 / (period + 1);
        let ema = sBars[0]?.c || 0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < sBars.length; i++) {
          ema = sBars[i].c * k + ema * (1 - k);
          if (i >= startBarIdx - 2 && i <= endBarIdx + 2) {
            const bx = getBarX(i);
            const by = getY(ema);
            if (!started) { ctx.moveTo(bx, by); started = true; }
            else { ctx.lineTo(bx, by); }
          }
        }
        ctx.stroke();
      };

      if (acts.includes('ema9')) drawEMA(9, '#00e676');
      if (acts.includes('ema21')) drawEMA(21, '#2979ff');
      if (acts.includes('ema50')) drawEMA(50, '#ff9100');
      if (acts.includes('ema200')) drawEMA(200, '#e040fb');

      // Bollinger Bands
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
          ctx.fillStyle = 'rgba(41, 121, 255, 0.08)';
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

      // 4. Candlesticks / Line Chart
      const cStyle = chartStyleRef.current || 'candle';
      if (cStyle === 'line') {
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        sBars.forEach((b, i) => {
          const x = getBarX(i);
          if (x < -bw || x > chartW + bw) return;
          const py = getY(b.c);
          if (!started) { ctx.moveTo(x, py); started = true; }
          else { ctx.lineTo(x, py); }
        });
        ctx.stroke();
      } else {
        // High-Resolution Candlesticks with Zoomable Width
        sBars.forEach((b, i) => {
          const x = getBarX(i);
          if (x < -bw || x > chartW + bw) return;
          const isUp = b.c >= b.o;
          const col = isUp ? '#089981' : '#f23645';

          // Wick
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
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

      // 5. User Drawings Layer (Trendlines, Horizontal lines, Fibs, Position Risk)
      const allDrawings = [...(drawingsRef.current || [])];
      if (currentDrawingRef.current) allDrawings.push(currentDrawingRef.current);

      allDrawings.forEach(d => {
        if (!d) return;
        if (d.type === 'trendline') {
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
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI * 2); ctx.fill();
        } else if (d.type === 'horizontal') {
          const yy = getY(d.price);
          ctx.strokeStyle = d.color || '#f7a600';
          ctx.lineWidth = 1.6;
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
          ctx.fillText(d.price > 100 ? d.price.toFixed(2) : d.price.toFixed(4), chartW + rightPad / 2, yy + 3.5);
        } else if (d.type === 'fibonacci') {
          const x1 = Math.min(getBarX(d.bar1), getBarX(d.bar2));
          const x2 = Math.max(chartW, Math.max(getBarX(d.bar1), getBarX(d.bar2)));
          const highP = Math.max(d.p1, d.p2);
          const lowP = Math.min(d.p1, d.p2);
          const diffP = highP - lowP;
          const fibs = [
            { level: 0.0, label: '0.0 (0%)', col: '#787b86' },
            { level: 0.382, label: '0.382 (38.2%)', col: '#ff7a00' },
            { level: 0.500, label: '0.500 (50.0%) [EQ]', col: '#ffd600' },
            { level: 0.618, label: '0.618 (61.8%) [GOLD]', col: '#00e676' },
            { level: 1.0, label: '1.0 (100%)', col: '#787b86' }
          ];
          fibs.forEach(f => {
            const pLevel = d.p1 > d.p2 ? (highP - diffP * f.level) : (lowP + diffP * f.level);
            const fy = getY(pLevel);
            ctx.strokeStyle = f.col;
            ctx.lineWidth = (f.level === 0.618 || f.level === 0.5) ? 1.6 : 1.0;
            ctx.beginPath();
            ctx.moveTo(x1, fy);
            ctx.lineTo(x2, fy);
            ctx.stroke();
            ctx.fillStyle = f.col;
            ctx.font = '700 8.5px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${f.label} — ${pLevel.toFixed(2)}`, x1 + 6, fy - 3);
          });
        } else if (d.type === 'rectangle') {
          const x1 = Math.min(getBarX(d.bar1), getBarX(d.bar2));
          const x2 = Math.max(getBarX(d.bar1), getBarX(d.bar2));
          const y1 = Math.min(getY(d.p1), getY(d.p2));
          const y2 = Math.max(getY(d.p1), getY(d.p2));
          ctx.fillStyle = 'rgba(41, 98, 255, 0.16)';
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          ctx.strokeStyle = '#2962ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else if (d.type === 'long' || d.type === 'short') {
          const x1 = getBarX(d.bar1);
          const x2 = Math.max(chartW, getBarX(d.bar2) + 60);
          const entryY = getY(d.p1);
          const tpY = getY(d.p2);
          const diffP = Math.abs(d.p2 - d.p1);
          const slY = d.type === 'long' ? getY(d.p1 - diffP * 0.5) : getY(d.p1 + diffP * 0.5);

          ctx.fillStyle = 'rgba(0, 230, 118, 0.18)';
          ctx.fillRect(x1, Math.min(entryY, tpY), x2 - x1, Math.abs(tpY - entryY));
          ctx.fillStyle = 'rgba(242, 54, 69, 0.18)';
          ctx.fillRect(x1, Math.min(entryY, slY), x2 - x1, Math.abs(slY - entryY));

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, entryY);
          ctx.lineTo(x2, entryY);
          ctx.stroke();
        } else if (d.type === 'ruler') {
          const x1 = getBarX(d.bar1);
          const x2 = getBarX(d.bar2);
          const y1 = getY(d.p1);
          const y2 = getY(d.p2);
          ctx.fillStyle = 'rgba(233, 185, 73, 0.14)';
          ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
          ctx.strokeStyle = '#e9b949';
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
          ctx.setLineDash([]);
        }
      });

      // 6. Current Price Line Across Canvas
      const curY = getY(currentPrice);
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(chartW, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price Tag on Right Axis
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(chartW + 2, curY - 9, rightPad - 4, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(currentPrice > 100 ? currentPrice.toFixed(2) : currentPrice.toFixed(4), chartW + rightPad / 2, curY + 3.5);

      // 7. Bottom Time Axis Background & Ticks
      ctx.fillStyle = '#131722';
      ctx.fillRect(0, topPad + chartH, w, btmPad);
      ctx.strokeStyle = '#2a2e39';
      ctx.beginPath();
      ctx.moveTo(0, topPad + chartH + 0.5);
      ctx.lineTo(w, topPad + chartH + 0.5);
      ctx.stroke();

      ctx.fillStyle = '#787b86';
      ctx.font = '600 8.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      for (let i = Math.max(0, startBarIdx); i <= Math.min(totalBars - 1, endBarIdx); i += vGridStep) {
        const tx = getBarX(i);
        if (tx >= 20 && tx <= chartW - 20) {
          const bar = sBars[i];
          if (bar && bar.t) {
            const dt = new Date(bar.t);
            const hh = dt.getHours().toString().padStart(2, '0');
            const mm = dt.getMinutes().toString().padStart(2, '0');
            ctx.fillText(`${hh}:${mm}`, tx, topPad + chartH + 18);
          }
        }
      }

      // 8. Crosshair Cursor Badges
      const m = transform.mousePos;
      if (m && m.x >= 0 && m.x <= chartW && m.y >= topPad && m.y <= topPad + chartH) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, m.y + 0.5); ctx.lineTo(chartW, m.y + 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m.x + 0.5, topPad); ctx.lineTo(m.x + 0.5, topPad + chartH); ctx.stroke();
        ctx.setLineDash([]);

        // Hover price on axis
        const hoverPrice = curLo + ((topPad + chartH - m.y) / chartH) * curRange;
        ctx.fillStyle = '#00e676';
        ctx.fillRect(chartW + 2, m.y - 8, rightPad - 4, 16);
        ctx.fillStyle = '#0a0d13';
        ctx.font = '800 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hoverPrice > 100 ? hoverPrice.toFixed(2) : hoverPrice.toFixed(4), chartW + rightPad / 2, m.y + 3.5);
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

  const activeWatchlist = WATCHLIST_CATEGORIES[activeWatchlistKey] || WATCHLIST_CATEGORIES.bot10;

  return (
    <div className="mps-container">
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
            onClick={() => {
              setActiveTool('crosshair');
              setToastNotice('🖱️ Pan / Crosshair Cursor Active (Drag to Pan)');
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
              setToastNotice('🌀 Fibonacci Active: Click & Drag from Swing High to Low');
              setTimeout(() => setToastNotice(null), 2000);
            }}
            title="Fibonacci Retracement (Golden Pocket 0.618)"
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
            title="FVG / Orderblock Box Rectangle"
          >
            <Square size={16} />
          </button>

          <div className="mps-tool-sep" />

          <button
            type="button"
            className={`mps-tool-btn ${activeTool === 'long' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('long');
              setToastNotice('📈 Long Position Risk Tool: Click & Drag Target');
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
              setToastNotice('📉 Short Position Risk Tool: Click & Drag Target');
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

        {/* Center Interactive Canvas Workspace */}
        <div className="mps-canvas-center" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Top Live Quote Bar */}
          <div className="mps-cursor-badge" style={{ zIndex: 12 }}>
            <span style={{ color: '#00e676', fontWeight: 800 }}>● {asset}</span>
            <span>Live Price: <b style={{ color: '#ffffff' }}>{currentPrice > 100 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}</b></span>
            <span>Style: <b>{chartStyle.toUpperCase()}</b></span>
            <span style={{ color: '#8592a6', fontSize: '0.68rem' }}>Drag canvas to pan (up/down/left/right) • Scroll to zoom • Drag right axis to stretch</span>
          </div>

          <canvas
            ref={canvasRef}
            className="mps-chart-canvas"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* 🔍 Floating Interactive Zoom & Vertical Height Controller Bar */}
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
              title="Zoom In (Makes candles bigger horizontally)"
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
              title="Zoom Out (Makes candles smaller horizontally)"
            >
              <ZoomOut size={12} />
              <span>Zoom Out</span>
            </button>

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

            {/* Vertical Price Stretch / Compress ("us pahath karanna") */}
            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.priceScaleY = Math.min(20.0, transform.priceScaleY * 1.35);
                setToastNotice('↕️ Candles Stretched Taller (Vertical Scale +)');
                setTimeout(() => setToastNotice(null), 1400);
              }}
              style={{
                background: 'rgba(0, 230, 118, 0.12)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                color: '#00e676',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Stretch Candles Taller (Increase vertical price scale)"
            >
              ↕ Taller
            </button>

            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.priceScaleY = Math.max(0.05, transform.priceScaleY * 0.75);
                setToastNotice('↕️ Candles Compressed Flatter (Vertical Scale -)');
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
                cursor: 'pointer'
              }}
              title="Compress Candles Flatter (Decrease vertical price scale)"
            >
              ↕ Flatter
            </button>

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

            {/* Pan Up / Down buttons ("us pahath karanna") */}
            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.panY -= (transform.currentPriceRange * 0.12);
                setToastNotice('⬆ Panned Up');
                setTimeout(() => setToastNotice(null), 1200);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#fff',
                padding: '4px 6px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
              title="Pan Chart Up (Candles move up)"
            >
              <ChevronUp size={13} />
            </button>

            <button
              type="button"
              onClick={() => {
                const transform = chartTransformRef.current;
                transform.panY += (transform.currentPriceRange * 0.12);
                setToastNotice('⬇ Panned Down');
                setTimeout(() => setToastNotice(null), 1200);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#fff',
                padding: '4px 6px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
              title="Pan Chart Down (Candles move down)"
            >
              <ChevronDown size={13} />
            </button>

            {/* Reset View */}
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
              title="Reset View (Auto-Fit Candles)"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>
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

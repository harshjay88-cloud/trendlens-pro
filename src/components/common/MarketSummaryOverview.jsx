import React, { useRef, useEffect, useState } from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Layers, Activity } from 'lucide-react';
import TradingViewWatchlist from './TradingViewWatchlist.jsx';
import './MarketSummaryOverview.css';

export default function MarketSummaryOverview({
  prices = {},
  selectedSymbol = 'BTCUSD',
  onSelectSymbol,
  onGoToTerminal
}) {
  const canvasRef = useRef(null);
  const [selectedHero, setSelectedHero] = useState('SPX'); // 'SPX' or 'BTC'

  const btcPrice = prices['BTC/USD']?.price || 82061.40;
  const btcChg = prices['BTC/USD']?.changePct || 0.60;
  const ethPrice = prices['ETH/USD']?.price || 2400.50;
  const ethChg = prices['ETH/USD']?.changePct || -1.20;

  // Render smooth TradingView Red Curve Area Chart on canvas
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

      // Generate 48 realistic historical walk points matching Screenshot 1
      const points = [];
      let currentVal = selectedHero === 'SPX' ? 7695 : btcPrice;
      const baseVal = currentVal;
      const steps = 48;
      const stepW = w / (steps - 1);

      // Curve seed replicating screenshot 1's wave
      const seedRatios = [
        0.0, 0.05, 0.08, 0.02, -0.04, -0.08, -0.05, 0.01, 0.09, 0.14, 0.11, 0.16,
        0.18, 0.12, 0.07, 0.03, -0.02, -0.05, -0.09, -0.06, -0.11, -0.08, -0.05, -0.02,
        -0.08, -0.12, -0.15, -0.10, -0.07, -0.11, -0.06, -0.02, 0.01, 0.05, 0.09, 0.12,
        0.08, 0.05, 0.01, -0.04, -0.08, -0.12, -0.14, -0.17, -0.18, -0.19, -0.21, -0.20
      ];

      for (let i = 0; i < steps; i++) {
        const yOffset = seedRatios[i] * (h * 0.32);
        const y = h * 0.52 - yOffset;
        points.push({ x: i * stepW, y });
      }

      // Draw subtle horizontal grid lines
      ctx.strokeStyle = 'rgba(42, 46, 57, 0.4)';
      ctx.lineWidth = 1;
      for (let k = 1; k < 5; k++) {
        const yk = (h / 5) * k;
        ctx.beginPath();
        ctx.moveTo(0, yk + 0.5);
        ctx.lineTo(w, yk + 0.5);
        ctx.stroke();
      }

      // Fill Gradient Area below red curve (TradingView Style)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(242, 54, 69, 0.28)');
      grad.addColorStop(0.6, 'rgba(242, 54, 69, 0.08)');
      grad.addColorStop(1, 'rgba(242, 54, 69, 0.00)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke Vibrant Red Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.strokeStyle = '#f23645';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Draw Y-axis Price Scale on Right
      ctx.fillStyle = '#787b86';
      ctx.font = '500 9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const maxVal = selectedHero === 'SPX' ? 7729.00 : 83200;
      const minVal = selectedHero === 'SPX' ? 7687.00 : 81400;
      for (let k = 1; k < 5; k++) {
        const yk = (h / 5) * k;
        const val = maxVal - ((maxVal - minVal) / 4) * (k - 1);
        ctx.fillText(val.toFixed(2), w - 6, yk - 3);
      }

      // Bottom Time Markers (15:30, 16:00, 16:30, 17:00, 17:30, 18:00, 19:00, 20:00, 21:00, 22:00)
      const timeLabels = ['15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
      ctx.fillStyle = '#787b86';
      ctx.font = '500 8.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      timeLabels.forEach((lbl, idx) => {
        const xPos = (w / (timeLabels.length - 1)) * idx;
        ctx.fillText(lbl, Math.max(16, Math.min(w - 20, xPos)), h - 6);
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedHero, btcPrice]);

  return (
    <div className="tv-summary-page">
      {/* Center Main Dashboard Content */}
      <div className="tv-summary-main">
        {/* Title */}
        <div className="tv-summary-title" onClick={() => onGoToTerminal && onGoToTerminal()}>
          <span>Market summary</span>
          <ChevronRight size={18} />
        </div>

        {/* Hero Card with Red Curve Line Chart (TradingView Screenshot 1) */}
        <div className="tv-summary-hero-card">
          <div className="tv-hero-header">
            <div className="tv-hero-asset">
              <div className="tv-hero-badge">
                {selectedHero === 'SPX' ? '500' : 'BTC'}
              </div>
              <div>
                <div className="tv-hero-name">
                  <span>{selectedHero === 'SPX' ? 'S&P 500' : 'Bitcoin / U.S. Dollar'}</span>
                  <span className="tv-hero-tag">{selectedHero === 'SPX' ? 'SPX' : 'BTCUSD'}</span>
                </div>
                <div className="tv-hero-px">
                  <span>{selectedHero === 'SPX' ? '7,690.73' : btcPrice.toLocaleString()}</span>
                  <span style={{ fontSize: '0.90rem', color: '#787b86', fontWeight: 600 }}>POINT</span>
                  <span className={`tv-hero-chg ${btcChg >= 0 ? 'up' : 'dn'}`}>
                    {btcChg >= 0 ? '+' : ''}{selectedHero === 'SPX' ? '0.41%' : btcChg.toFixed(2) + '%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Hero Switcher */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setSelectedHero('SPX')}
                style={{
                  background: selectedHero === 'SPX' ? 'var(--brand, #2962ff)' : 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                S&P 500
              </button>
              <button
                type="button"
                onClick={() => setSelectedHero('BTC')}
                style={{
                  background: selectedHero === 'BTC' ? 'var(--brand, #2962ff)' : 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Bitcoin
              </button>
              {onGoToTerminal && (
                <button
                  type="button"
                  onClick={onGoToTerminal}
                  style={{
                    background: '#089981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Open Pro Terminal
                </button>
              )}
            </div>
          </div>

          {/* Smooth Red Area Chart Canvas */}
          <div className="tv-hero-canvas-wrap">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Bottom Subgrid: Major Indices & Crypto Market Cap */}
        <div className="tv-summary-subgrid">
          {/* Card 1: Major Indices */}
          <div className="tv-sub-card">
            <div className="tv-sub-title">
              <span>Major indices</span>
              <ChevronRight size={15} color="#787b86" />
            </div>

            <div className="tv-sub-item">
              <div className="tv-sub-left">
                <div className="tv-sub-circle" style={{ background: '#0088cc' }}>100</div>
                <div>
                  <b style={{ color: '#ffffff', fontSize: '0.84rem' }}>Nasdaq 100</b>
                  <div style={{ fontSize: '0.66rem', color: '#787b86' }}>NDX</div>
                </div>
              </div>
              <div className="tv-sub-right">
                <div style={{ fontWeight: 700, color: '#ffffff' }}>29,529.33 <span style={{ fontSize: '0.62rem', color: '#787b86' }}>POINT</span></div>
                <div style={{ color: '#089981', fontSize: '0.74rem', fontWeight: 700 }}>+1.17%</div>
              </div>
            </div>

            <div className="tv-sub-item">
              <div className="tv-sub-left">
                <div className="tv-sub-circle" style={{ background: '#2962ff' }}>225</div>
                <div>
                  <b style={{ color: '#ffffff', fontSize: '0.84rem' }}>Japan 225</b>
                  <div style={{ fontSize: '0.66rem', color: '#787b86' }}>NI225</div>
                </div>
              </div>
              <div className="tv-sub-right">
                <div style={{ fontWeight: 700, color: '#ffffff' }}>64,916.48 <span style={{ fontSize: '0.62rem', color: '#787b86' }}>JPY</span></div>
                <div style={{ color: '#f23645', fontSize: '0.74rem', fontWeight: 700 }}>-0.62%</div>
              </div>
            </div>
          </div>

          {/* Card 2: Crypto Market Cap */}
          <div className="tv-sub-card">
            <div className="tv-sub-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2962ff' }} />
                <span>Crypto market cap</span>
                <span className="tv-hero-tag">TOTAL</span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#f23645', fontWeight: 700 }}>-1.00%</span>
            </div>

            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#ffffff' }}>
                2.71<span style={{ fontSize: '0.80rem', color: '#787b86' }}>T USD</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#787b86' }}>24h Total Trading Volume: $104.8B</div>
            </div>

            {/* Mini Sparkline Curve */}
            <div style={{ height: 60, width: '100%', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 300 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cryptoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f23645" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f23645" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,35 Q30,15 60,30 T120,45 T180,25 T240,40 T300,50 L300,60 L0,60 Z" fill="url(#cryptoGrad)" />
                <path d="M0,35 Q30,15 60,30 T120,45 T180,25 T240,40 T300,50" fill="none" stroke="#f23645" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Watchlist (Exact TradingView Screenshot 1) */}
      <TradingViewWatchlist
        prices={prices}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => {
          if (onSelectSymbol) onSelectSymbol(sym);
          if (onGoToTerminal) onGoToTerminal();
        }}
        onOpenBot={onGoToTerminal}
      />
    </div>
  );
}

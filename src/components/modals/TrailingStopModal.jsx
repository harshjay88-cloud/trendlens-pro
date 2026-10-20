import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, CheckCircle, AlertTriangle, X, Sliders } from 'lucide-react';
import './TrailingStopModal.css';

export default function TrailingStopModal({ isOpen, onClose, currentAsset = 'XAU/USD', currentPrice = 2654.11, onSave }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const s = localStorage.getItem('tl_trailing_sl');
      return s ? JSON.parse(s).enabled : true;
    } catch { return true; }
  });

  const [mode, setMode] = useState('dynamic_step'); // 'dynamic_step', 'tiered_be', 'atr_volatility'
  const [activationPips, setActivationPips] = useState(15);
  const [trailDistancePips, setTrailDistancePips] = useState(10);
  const [stepPips, setStepPips] = useState(2);
  const [breakEvenOffsetPips, setBreakEvenOffsetPips] = useState(2);
  const [atrMultiplier, setAtrMultiplier] = useState(1.5);

  /**
   * The peak is measured from the real price feed that feeds this modal, not
   * from a random walk. The baseline is the price observed when the modal
   * opened; the peak is the highest price seen since.
   */
  const [baselinePrice, setBaselinePrice] = useState(currentPrice);
  const [peakPrice, setPeakPrice] = useState(currentPrice);

  const pipMultiplier = currentAsset.includes('BTC') || currentAsset.includes('ETH') ? 10 : 10;

  useEffect(() => {
    if (!isOpen) return;
    setBaselinePrice(currentPrice);
    setPeakPrice(currentPrice);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return;
    setPeakPrice(prev => (currentPrice > prev ? currentPrice : prev));
  }, [currentPrice, isOpen]);

  if (!isOpen) return null;

  const livePeakPips = +(((peakPrice - baselinePrice) / baselinePrice) * 10000 * (pipMultiplier / 10)).toFixed(1);

  // Calculate current trailing stop level based on peak pips
  const isActivated = livePeakPips >= activationPips;
  const currentTrailingLockedPips = isActivated ? Math.max(0, +(livePeakPips - trailDistancePips).toFixed(1)) : 0;
  const pipValueDollars = currentAsset.includes('BTC') ? 10 : currentAsset.includes('ETH') ? 5 : 10;
  const lockedDollarProfit = +(currentTrailingLockedPips * pipValueDollars).toFixed(2);

  const handleSave = () => {
    const config = {
      enabled,
      mode,
      activationPips,
      trailDistancePips,
      stepPips,
      breakEvenOffsetPips,
      atrMultiplier
    };
    try {
      localStorage.setItem('tl_trailing_sl', JSON.stringify(config));
    } catch {}
    if (onSave) onSave(config);
    onClose();
  };

  return (
    <div className="modal-backdrop-window" onClick={onClose}>
      <div className="tl-tool-window" onClick={(e) => e.stopPropagation()}>
        {/* Window Titlebar */}
        <div className="tl-window-header">
          <div className="tl-window-title">
            <Zap size={16} color="#00D4FF" />
            <span>TRAILING STOP LOSS ENGINE</span>
            <span className="tl-window-badge">v2.1 · Real-Time</span>
          </div>
          <button type="button" className="tl-window-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Window Content */}
        <div className="tl-window-body">
          {/* Main Toggle Switch */}
          <div className="tl-setting-card highlight-card">
            <div className="tl-setting-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`status-indicator ${enabled ? 'active' : ''}`} />
                <b style={{ fontSize: '0.88rem', color: enabled ? '#00e676' : '#8592a6' }}>
                  {enabled ? 'Trailing Stop Loss: ACTIVE' : 'Trailing Stop Loss: PAUSED'}
                </b>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#8592a6' }}>
                Auto-moves Stop Loss upwards behind price rallies to guarantee profits and eliminate giveback.
              </p>
            </div>
            <button
              type="button"
              className={`tl-switch-btn ${enabled ? 'on' : 'off'}`}
              onClick={() => setEnabled(!enabled)}
            >
              {enabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Mode Selector */}
          <div className="tl-form-group">
            <label className="tl-label">Trailing Algorithm Mode</label>
            <div className="tl-radio-grid">
              <button
                type="button"
                className={`tl-radio-btn ${mode === 'dynamic_step' ? 'selected' : ''}`}
                onClick={() => setMode('dynamic_step')}
              >
                <b>📈 Dynamic Step Trailing</b>
                <span>Locks profit every {stepPips} pips behind price advance</span>
              </button>
              <button
                type="button"
                className={`tl-radio-btn ${mode === 'tiered_be' ? 'selected' : ''}`}
                onClick={() => setMode('tiered_be')}
              >
                <b>🎯 Tiered Break-Even Lock</b>
                <span>Locks Entry + {breakEvenOffsetPips}p once 50% TP is reached</span>
              </button>
              <button
                type="button"
                className={`tl-radio-btn ${mode === 'atr_volatility' ? 'selected' : ''}`}
                onClick={() => setMode('atr_volatility')}
              >
                <b>🌊 ATR Volatility Trail</b>
                <span>Adapts trailing distance dynamically to market speed</span>
              </button>
            </div>
          </div>

          {/* Numerical Parameters Grid */}
          <div className="tl-param-grid">
            <div className="tl-param-card">
              <span className="tl-param-label">Activation Threshold</span>
              <div className="tl-input-with-unit">
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={activationPips}
                  onChange={(e) => setActivationPips(Number(e.target.value))}
                />
                <span>Pips</span>
              </div>
              <span className="tl-param-desc">Starts trailing after +{activationPips}p in profit</span>
            </div>

            <div className="tl-param-card">
              <span className="tl-param-label">Trailing Distance</span>
              <div className="tl-input-with-unit">
                <input
                  type="number"
                  min="3"
                  max="50"
                  value={trailDistancePips}
                  onChange={(e) => setTrailDistancePips(Number(e.target.value))}
                />
                <span>Pips</span>
              </div>
              <span className="tl-param-desc">Maintains {trailDistancePips}p buffer behind high</span>
            </div>

            <div className="tl-param-card">
              <span className="tl-param-label">Step Granularity</span>
              <div className="tl-input-with-unit">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={stepPips}
                  onChange={(e) => setStepPips(Number(e.target.value))}
                />
                <span>Pips</span>
              </div>
              <span className="tl-param-desc">Updates SL every {stepPips} pips rise</span>
            </div>
          </div>

          {/* Live Trajectory Simulator Radar */}
          <div className="tl-radar-box">
            <div className="tl-radar-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} color="#00e676" />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#e8ecf3' }}>
                  LIVE PRICE TRAJECTORY · {currentAsset}
                </span>
              </div>
              <span className="tl-live-pill">● MEASURED</span>
            </div>

            <div className="tl-trajectory-bar">
              <div className="tl-bar-track">
                {/* Entry marker */}
                <div className="tl-bar-marker entry" style={{ left: '15%' }}>
                  <span>Entry</span>
                </div>
                {/* Trailing SL marker */}
                <div
                  className="tl-bar-marker trailing-sl"
                  style={{ left: `${Math.min(78, 15 + (currentTrailingLockedPips / 50) * 60)}%` }}
                >
                  <span>🛡️ Trail SL (+{currentTrailingLockedPips}p)</span>
                </div>
                {/* Current Peak Price */}
                <div
                  className="tl-bar-marker live-peak"
                  style={{ left: `${Math.min(92, 15 + (livePeakPips / 50) * 60)}%` }}
                >
                  <span>🔥 Peak (+{livePeakPips}p)</span>
                </div>
                {/* TP Target */}
                <div className="tl-bar-marker tp" style={{ left: '95%' }}>
                  <span>🎯 TP (+60p)</span>
                </div>
              </div>
            </div>

            <div className="tl-radar-stats">
              <div className="tl-radar-stat-col">
                <span>Activation Status</span>
                <b style={{ color: isActivated ? '#00e676' : '#e9b949' }}>
                  {isActivated ? '🟢 ARMED & TRAILING' : `⏳ Awaiting +${(activationPips - livePeakPips).toFixed(1)}p`}
                </b>
              </div>
              <div className="tl-radar-stat-col">
                <span>Locked Minimum Profit</span>
                <b style={{ color: '#00e676', fontSize: '0.92rem' }}>
                  +${lockedDollarProfit} USD (+{currentTrailingLockedPips} Pips)
                </b>
              </div>
              <div className="tl-radar-stat-col">
                <span>Execution Type</span>
                <b style={{ color: '#00D4FF' }}>Market Trailing Peg</b>
              </div>
            </div>
          </div>
        </div>

        {/* Window Footer Actions */}
        <div className="tl-window-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
            Save & Activate Trailing SL
          </button>
        </div>
      </div>
    </div>
  );
}

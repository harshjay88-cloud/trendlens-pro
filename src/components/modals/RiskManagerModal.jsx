import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, Scale, DollarSign, Sliders, X, Check } from 'lucide-react';
import './RiskManagerModal.css';

export default function RiskManagerModal({
  isOpen,
  onClose,
  balance = 10000,
  currentAsset = 'XAU/USD',
  currentPrice = 2654.11,
  onSave
}) {
  const [riskPct, setRiskPct] = useState(() => {
    try {
      const s = localStorage.getItem('tl_risk_settings');
      return s ? JSON.parse(s).riskPct : 2.0;
    } catch { return 2.0; }
  });

  const [leverage, setLeverage] = useState(20);
  const [maxDailyLossUsd, setMaxDailyLossUsd] = useState(500);
  const [minRiskReward, setMinRiskReward] = useState('1:2.0');
  const [enableCircuitBreaker, setEnableCircuitBreaker] = useState(true);
  const [slDistancePips, setSlDistancePips] = useState(25);

  if (!isOpen) return null;

  // Real calculation: Max Risk in USD
  const maxRiskUsd = +(balance * (riskPct / 100)).toFixed(2);
  // Lot / Size calculation based on SL distance
  // For Gold/Forex: 1 lot * 25 pips * $10/pip = $250.
  // Size = MaxRisk / (slDistancePips * pipValue)
  const isCrypto = currentAsset.includes('BTC') || currentAsset.includes('ETH') || currentAsset.includes('SOL');
  const pipValue = isCrypto ? 1 : 10;
  const calculatedLotSize = Math.max(0.01, +(maxRiskUsd / (slDistancePips * pipValue)).toFixed(2));
  const estimatedProfitTp1 = +(maxRiskUsd * 2.2).toFixed(2);
  const marginRequired = +(currentPrice * calculatedLotSize / leverage).toFixed(2);

  const handleSave = () => {
    const config = {
      riskPct,
      leverage,
      maxDailyLossUsd,
      minRiskReward,
      enableCircuitBreaker,
      calculatedLotSize
    };
    try {
      localStorage.setItem('tl_risk_settings', JSON.stringify(config));
    } catch {}
    if (onSave) onSave(config);
    onClose();
  };

  return (
    <div className="modal-backdrop-window" onClick={onClose}>
      <div className="tl-tool-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tl-window-header">
          <div className="tl-window-title">
            <Scale size={16} color="#00e676" />
            <span>DYNAMIC RISK &amp; MARGIN MANAGER</span>
            <span className="tl-window-badge" style={{ color: '#00e676', borderColor: '#00e676', background: 'rgba(0, 230, 118, 0.12)' }}>
              CAPITAL PRESERVATION
            </span>
          </div>
          <button type="button" className="tl-window-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="tl-window-body">
          {/* Account Balance Summary */}
          <div className="tl-balance-strip">
            <div>
              <span style={{ fontSize: '0.68rem', color: '#8592a6' }}>Trading Account Equity</span>
              <b style={{ fontSize: '1.1rem', color: '#fff', display: 'block', fontFamily: 'monospace' }}>
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </b>
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#8592a6' }}>Max Risk per Trade ({riskPct}%)</span>
              <b style={{ fontSize: '1.1rem', color: '#ff3366', display: 'block', fontFamily: 'monospace' }}>
                ${maxRiskUsd} USD
              </b>
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#8592a6' }}>Projected Target Gain</span>
              <b style={{ fontSize: '1.1rem', color: '#00e676', display: 'block', fontFamily: 'monospace' }}>
                +${estimatedProfitTp1} USD
              </b>
            </div>
          </div>

          {/* Risk Percentage Presets */}
          <div className="tl-form-group">
            <label className="tl-label">Risk Per Trade Allocation</label>
            <div className="tl-risk-presets">
              {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map(pct => (
                <button
                  key={pct}
                  type="button"
                  className={`tl-risk-pill ${riskPct === pct ? 'selected' : ''}`}
                  onClick={() => setRiskPct(pct)}
                >
                  <b>{pct}%</b>
                  <span>${(balance * (pct / 100)).toFixed(0)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Leverage Slider */}
          <div className="tl-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="tl-label">Exchange Leverage Tier</label>
              <b style={{ color: '#00D4FF', fontFamily: 'monospace', fontSize: '0.9rem' }}>{leverage}x Isolated</b>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#00D4FF', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#8592a6' }}>
              <span>5x (Safe)</span>
              <span>20x (Standard)</span>
              <span>50x (Aggressive)</span>
              <span>100x (Apex Degens)</span>
            </div>
          </div>

          {/* Auto Position Size Calculation Breakdown */}
          <div className="tl-calc-result-box">
            <div className="tl-calc-header">
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e8ecf3' }}>
                📐 AUTO POSITION SIZING FOR {currentAsset}
              </span>
              <span style={{ fontSize: '0.66rem', color: '#00e676', fontWeight: 700 }}>
                R:R 1:2.2 COMPLIANT
              </span>
            </div>
            <div className="tl-calc-grid">
              <div className="tl-calc-col">
                <span>Calculated Lot / Qty</span>
                <b style={{ color: '#00D4FF', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                  {calculatedLotSize} {isCrypto ? 'Coins' : 'Lots'}
                </b>
              </div>
              <div className="tl-calc-col">
                <span>Stop Loss Distance</span>
                <b style={{ color: '#ff3366', fontFamily: 'monospace' }}>
                  {slDistancePips} Pips
                </b>
              </div>
              <div className="tl-calc-col">
                <span>Margin Locked</span>
                <b style={{ color: '#e9b949', fontFamily: 'monospace' }}>
                  ${marginRequired} USD
                </b>
              </div>
            </div>
          </div>

          {/* Circuit Breaker Safety Shield */}
          <div className="tl-circuit-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertOctagon size={20} color="#ff3366" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <b style={{ color: '#ff3366', fontSize: '0.78rem' }}>Daily Max Drawdown Circuit Breaker</b>
                <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#aab3c3' }}>
                  Instantly halts automated bots and prevents new orders if daily loss exceeds limit.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: '0.70rem', color: '#8592a6' }}>Kill Switch Limit:</span>
              <div className="tl-input-with-unit" style={{ width: 140 }}>
                <input
                  type="number"
                  min="100"
                  max="5000"
                  step="50"
                  value={maxDailyLossUsd}
                  onChange={(e) => setMaxDailyLossUsd(Number(e.target.value))}
                />
                <span>USD</span>
              </div>
              <button
                type="button"
                className={`tl-switch-btn ${enableCircuitBreaker ? 'on' : 'off'}`}
                onClick={() => setEnableCircuitBreaker(!enableCircuitBreaker)}
                style={{ marginLeft: 'auto' }}
              >
                {enableCircuitBreaker ? 'SHIELD ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="tl-window-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
            Apply Risk Rules
          </button>
        </div>
      </div>
    </div>
  );
}

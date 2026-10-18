import React, { useState } from 'react';
import { Calculator, X, ShieldAlert, CheckCircle, TrendingUp } from 'lucide-react';
import './CalculatorModal.css';

export default function CalculatorModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [asset, setAsset] = useState('XAU/USD');
  const [balance, setBalance] = useState('10000');
  const [riskPct, setRiskPct] = useState('1.0');
  const [stopLossPips, setStopLossPips] = useState('25');

  const b = parseFloat(balance) || 0;
  const r = parseFloat(riskPct) || 0;
  const sl = parseFloat(stopLossPips) || 1;

  // Formula:
  // Risk Amount = Balance * (Risk % / 100)
  // For Gold (XAU/USD): 1 standard lot = 100 oz. 1 pip (0.10 price) = $10.
  // Lot Size = Risk Amount / (SL pips * pip value per lot)
  const riskAmount = +(b * (r / 100)).toFixed(2);
  
  let pipValuePerLot = 10;
  if (asset === 'EUR/USD' || asset === 'GBP/USD') pipValuePerLot = 10;
  else if (asset === 'USD/JPY') pipValuePerLot = 9.2;
  else if (asset === 'XAU/USD') pipValuePerLot = 10; // 100 oz * $0.10
  else if (asset === 'BTC/USD') pipValuePerLot = 1;

  const lotSize = sl > 0 ? +(riskAmount / (sl * pipValuePerLot)).toFixed(2) : 0.01;
  const tp1Profit = +(riskAmount * 1.5).toFixed(2);
  const tp2Profit = +(riskAmount * 2.5).toFixed(2);
  const tp3Profit = +(riskAmount * 4.0).toFixed(2);

  return (
    <div className="calc-backdrop" onClick={onClose}>
      <div className="calc-card card" onClick={(e) => e.stopPropagation()}>
        <div className="calc-header">
          <div className="calc-title">
            <div className="calc-icon"><Calculator size={18} /></div>
            <div>
              <h3>Institutional Lot Size &amp; Risk Calculator</h3>
              <p>GoldVIP Pro Position Sizing &amp; Capital Protection Engine</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="calc-body">
          <div className="calc-form">
            <div className="calc-group">
              <label>Trading Asset</label>
              <select value={asset} onChange={(e) => setAsset(e.target.value)} className="input">
                <option value="XAU/USD">Gold (XAU/USD) · 100 oz contract</option>
                <option value="EUR/USD">EUR/USD · 100,000 unit standard</option>
                <option value="GBP/USD">GBP/USD · Standard FX Lot</option>
                <option value="USD/JPY">USD/JPY · Standard FX Lot</option>
                <option value="BTC/USD">Bitcoin (BTC/USD) · Spot / Contract</option>
              </select>
            </div>

            <div className="calc-row">
              <div className="calc-group">
                <label>Account Balance ($)</label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="input"
                  placeholder="10000"
                />
              </div>
              <div className="calc-group">
                <label>Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPct}
                  onChange={(e) => setRiskPct(e.target.value)}
                  className="input"
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="calc-group">
              <label>Stop Loss Distance (Pips / Points)</label>
              <input
                type="number"
                value={stopLossPips}
                onChange={(e) => setStopLossPips(e.target.value)}
                className="input"
                placeholder="25"
              />
            </div>
          </div>

          {/* Results Panel */}
          <div className="calc-results">
            <div className="result-highlight">
              <span className="res-label">RECOMMENDED POSITION SIZE</span>
              <div className="res-lot">{lotSize} <span className="res-unit">LOTS</span></div>
              <span className="res-sub">Safe for your {riskPct}% risk threshold</span>
            </div>

            <div className="res-grid">
              <div className="res-box">
                <span className="res-box-label">Max Risk Capital</span>
                <span className="res-box-val text-sell">-${riskAmount}</span>
              </div>
              <div className="res-box">
                <span className="res-box-label">Reward TP1 (1:1.5)</span>
                <span className="res-box-val text-buy">+${tp1Profit}</span>
              </div>
              <div className="res-box">
                <span className="res-box-label">Reward TP2 (1:2.5)</span>
                <span className="res-box-val text-buy">+${tp2Profit}</span>
              </div>
              <div className="res-box">
                <span className="res-box-label">Reward TP3 (1:4.0)</span>
                <span className="res-box-val text-buy">+${tp3Profit}</span>
              </div>
            </div>

            <div className="calc-tip">
              <ShieldAlert size={14} className="text-brand" />
              <span>GoldVIP Rule: Never risk more than 1.5% - 2.0% of total equity on high-volatility commodities like Gold.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { HSR_INDICATORS_SUITE, AI_STRATEGY_ENGINES } from '../utils/mockData.js';
import {
  Sliders, Layers, Zap, Activity, CheckCircle2, Eye,
  HelpCircle, ArrowRight, ShieldCheck, Target, TrendingUp, Cpu, ExternalLink
} from 'lucide-react';
import './Indicators.css';

export default function Indicators() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedIndicator, setSelectedIndicator] = useState(HSR_INDICATORS_SUITE[0]);

  const categories = ['All', 'Core Signals', 'Order Flow', 'Target Engine', 'Momentum', 'Volume Profile', 'Charting'];

  const filteredIndicators = activeCategory === 'All'
    ? HSR_INDICATORS_SUITE
    : HSR_INDICATORS_SUITE.filter(ind => ind.category === activeCategory);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <div className="indicators-content">
          {/* Header */}
          <div className="indicators-header">
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>INSTITUTIONAL SUITE · GOLDVIP PRO ARCHITECTURE</div>
              <h2>Indicators & AI Strategy Hub <span className="badge badge-buy">10 PRO TOOLS</span></h2>
              <p>Browse the indicator suite and the rule-based strategy engines. Each entry states whether it
                runs on live Bybit market data or requires a feed that is not connected.</p>
            </div>
          </div>

          {/* Signal Confluence Engine Formula Banner */}
          <div className="confluence-banner card">
            <div className="cb-title">
              <Cpu size={18} className="text-brand" />
              <span>How TrendLens Pro Signals Are Generated (4-Tier Confluence Formula)</span>
            </div>
            <div className="confluence-steps">
              <div className="c-step">
                <div className="c-step-num">1</div>
                <div className="c-step-content">
                  <div className="c-step-title">Daily Bias Target</div>
                  <div className="c-step-desc">Futures positioning calculates session direction (BUY or SELL).</div>
                </div>
              </div>
              <div className="c-arrow"><ArrowRight size={16} /></div>
              <div className="c-step">
                <div className="c-step-num">2</div>
                <div className="c-step-content">
                  <div className="c-step-title">ICT Smart Money</div>
                  <div className="c-step-desc">Identifies liquidity sweep of session extremes + FVG discount array.</div>
                </div>
              </div>
              <div className="c-arrow"><ArrowRight size={16} /></div>
              <div className="c-step">
                <div className="c-step-num">3</div>
                <div className="c-step-content">
                  <div className="c-step-title">AOF Whale Absorption</div>
                  <div className="c-step-desc">Requires a Level-2 order book feed. Not connected in this build.</div>
                </div>
              </div>
              <div className="c-arrow"><ArrowRight size={16} /></div>
              <div className="c-step">
                <div className="c-step-num">4</div>
                <div className="c-step-content">
                  <div className="c-step-title">Target Levels</div>
                  <div className="c-step-desc">Target lines are fixed offsets from price. No touch probability is asserted.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Indicator Category Filters */}
          <div className="indicators-filter-bar card">
            <div className="tabs" style={{ gap: 6, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                  style={{ padding: '7px 16px', fontSize: '0.8rem' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Indicators Grid */}
          <div className="indicators-grid">
            {filteredIndicators.map((ind) => (
              <div
                key={ind.id}
                className={`indicator-card card ${selectedIndicator?.id === ind.id ? 'active-card' : ''}`}
                onClick={() => setSelectedIndicator(ind)}
              >
                <div className="ind-top">
                  <div>
                    <span className="ind-cat">{ind.category}</span>
                    <h3 className="ind-name">{ind.name}</h3>
                  </div>
                  <span className="badge badge-buy" style={{ fontSize: '0.65rem' }}>{ind.badge}</span>
                </div>
                <p className="ind-desc">{ind.description}</p>
                <div className="ind-features">
                  {ind.features.map((feat, idx) => (
                    <div key={idx} className="ind-feature-item">
                      <CheckCircle2 size={13} className="text-brand" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
                <div className="ind-footer">
                  <div className="ind-stat">
                    <span className="ind-stat-label">Status</span>
                    <span className="ind-stat-val" style={{ color: ind.color, fontSize: '0.68rem' }}>{ind.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link
                      to="/dashboard"
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.74rem', gap: 5, padding: '5px 10px', textDecoration: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Zap size={12} /> Open on Chart
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Inspector Modal / Section */}
          {selectedIndicator && (
            <div className="indicator-inspector card">
              <div className="inspector-header">
                <div>
                  <div className="section-label">INDICATOR ARCHITECTURE SPECIFICATION</div>
                  <h3>{selectedIndicator.name}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedIndicator.type} · MT5 & Desktop Terminal Engine</div>
                </div>
                <div className="inspector-badge" style={{ borderColor: selectedIndicator.color, color: selectedIndicator.color }}>
                  {selectedIndicator.status}
                </div>
              </div>
              <div className="inspector-body">
                <div className="inspector-col">
                  <h4>Trade Setup සහ ක්‍රියාත්මක වන ආකාරය (Sinhala):</h4>
                  <p>{selectedIndicator.description}</p>
                  
                  <div style={{ background: 'rgba(233,185,73,0.06)', border: '1px solid rgba(233,185,73,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    <div style={{ color: '#e9b949', fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>💡 Trade Entry නීති:</div>
                    <div style={{ fontSize: '0.82rem', color: '#e8ecf3', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div><b>1. Confirmation:</b> චාර්ට් එකේ මෙම indicator එකෙන් සංඥාව හෝ කලාපය පෙන්වන තෙක් රැඳෙන්න.</div>
                      <div><b>2. Risk Management:</b> ආසන්න Liquidity wall එකට හෝ Order Block එකට පිටුපසින් Stop Loss දමන්න.</div>
                      <div><b>3. Execution:</b> අවම වශයෙන් 1:2.4 Risk-to-Reward අනුපාතයක් පවත්වා ගන්න.</div>
                    </div>
                  </div>

                  <div className="spec-box">
                    <div className="spec-row">
                      <span className="spec-title">Data Feed Source:</span>
                      <span className="spec-val">Bybit public market data (candles, tickers). Level-2 depth: not connected.</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-title">Supported Assets:</span>
                      <span className="spec-val">Gold (XAU/USD), Forex Majors, Crypto (BTC, ETH, SOL, SUI, DOGE)</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-title">Alert Dispatch:</span>
                      <span className="spec-val">In-browser audio chime only. No webhook or MT5 EA bridge is configured.</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link to="/dashboard" className="btn btn-primary btn-sm" style={{ gap: 8, textDecoration: 'none' }}>
                      <Zap size={14} /> චාර්ට් එකේ සජීවීව අඳින්න (Open Live Chart)
                    </Link>
                  </div>
                </div>
                <div className="inspector-col visual-col">
                  <h4>Visual Preview (illustrative):</h4>
                  <div className="visual-sim-box">
                    <div className="sim-header">
                      <span>Chart: XAU/USD · M15</span>
                    </div>
                    <div className="sim-canvas">
                      <div className="sim-magnet-band" style={{ top: '25%' }}>
                        <span>Target Line (fixed offset from price)</span>
                        <span>2,658.00</span>
                      </div>
                      <div className="sim-candle green" style={{ left: '30%', height: '70px', top: '40%' }}></div>
                      <div className="sim-candle green" style={{ left: '42%', height: '90px', top: '35%' }}></div>
                      <div className="sim-candle red" style={{ left: '54%', height: '40px', top: '45%' }}></div>
                      <div className="sim-candle green" style={{ left: '66%', height: '110px', top: '28%' }}></div>
                      <div className="sim-magnet-band support" style={{ bottom: '15%' }}>
                        <span>Support Line (fixed offset from price)</span>
                        <span>2,638.50</span>
                      </div>
                      <div style={{ position: 'absolute', left: '12px', bottom: '6px', fontSize: '0.62rem', color: '#8592a6' }}>
                        Illustrative layout only — not live order-flow data.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: AI Strategy Engines Breakdown */}
          <div className="engines-section">
            <div className="section-label" style={{ marginBottom: 8 }}>AI ENGINE INTELLIGENCE</div>
            <h2>Strategy Engines</h2>
            <p>Rule-based engines evaluated on live Bybit candles. Engines that require a Level-2 feed or a
              machine-learning model are labelled as unavailable — no accuracy figure is claimed for them.</p>

            <div className="engines-list">
              {AI_STRATEGY_ENGINES.map((engine) => (
                <div key={engine.id} className="engine-card card">
                  <div className="engine-header">
                    <div>
                      <h4 className="engine-name">{engine.name}</h4>
                      <span className="engine-type">{engine.type}</span>
                    </div>
                    <span className="badge badge-buy" style={{ fontSize: '0.75rem' }}>{engine.status}</span>
                  </div>
                  <p className="engine-desc">{engine.description}</p>
                  <div className="engine-logic-box">
                    <span className="logic-label">Execution Logic:</span>
                    <span className="logic-text">{engine.logic}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

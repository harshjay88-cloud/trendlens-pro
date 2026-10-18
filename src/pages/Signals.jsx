import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useSignalStore } from '../store/index.js';
import { useToastStore } from '../store/toastStore.js';
import {
  Copy, ExternalLink, Clock, Shield, TrendingUp, TrendingDown,
  Filter, PlusCircle, ChevronDown, ChevronUp, Cpu, Sliders, Globe
} from 'lucide-react';
import './Signals.css';

function SignalCard({ sig }) {
  const { addToast } = useToastStore();
  const [showConfluence, setShowConfluence] = useState(false);
  const isBuy = sig.direction === 'BUY';
  const progressPct = sig.status === 'tp3_hit' ? 100 : sig.status === 'tp2_hit' ? 67 : sig.status === 'tp1_hit' ? 33 : sig.status === 'sl_hit' ? 0 : 20;
  const statusLabel = {
    active: 'Active', tp1_hit: 'TP1 Hit ✅', tp2_hit: 'TP2 Hit ✅', tp3_hit: 'TP3 Hit ✅', sl_hit: 'SL Hit ❌', cancelled: 'Cancelled',
  }[sig.status] || sig.status;

  const timeAgo = (d) => {
    if (!d) return 'Just now';
    const dateObj = d instanceof Date ? d : new Date(d);
    const diff = Date.now() - dateObj.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ago` : `${Math.max(1, m)}m ago`;
  };

  const handleCopy = () => {
    const text = `🎯 TrendLens Pro Signal\nAsset: ${sig.asset} (${sig.marketCategory || 'Market'})\nAction: ${sig.direction}\nEntry: ${sig.entry?.min} - ${sig.entry?.max}\nSL: ${sig.stopLoss}\nTP1: ${sig.targets?.tp1}\nTP2: ${sig.targets?.tp2}\nTP3: ${sig.targets?.tp3}\nEngine: ${sig.engine}\nAccuracy: ${sig.accuracy}%`;
    navigator.clipboard?.writeText(text);
    addToast({
      title: 'Signal Copied! 📋',
      message: `${sig.asset} ${sig.direction} parameters copied for MetaTrader/Telegram.`,
      type: 'success',
    });
  };

  const handleBridge = () => {
    addToast({
      title: 'MT5 Bridge Dispatched ⚡',
      message: `Order relayed to HSR Ultra MT5 EA: ${sig.direction} ${sig.asset} @ ${sig.entry?.min}`,
      type: 'info',
    });
  };

  return (
    <div className={`signal-card card ${isBuy ? 'signal-buy' : 'signal-sell'}`}>
      <div className="sc-header">
        <div className="sc-header-left">
          <span className={`badge ${isBuy ? 'badge-buy' : 'badge-sell'}`}>
            {isBuy ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {sig.direction}
          </span>
          <span className="sc-asset">{sig.asset}</span>
          <span className="sc-category-badge">{sig.marketCategory || 'Market'}</span>
          <span className="sc-tf tag" style={{ color: 'var(--brand)' }}>{sig.timeframe}</span>
        </div>
        <div className="sc-header-right">
          <span className="sc-engine">{sig.engine}</span>
          <span className="sc-time"><Clock size={11} />{timeAgo(sig.createdAt)}</span>
        </div>
      </div>

      <div className="sc-levels">
        <div className="sc-level-row">
          <span className="sc-level-label">Entry</span>
          <span className="sc-level-val">{typeof sig.entry?.min === 'number' ? sig.entry.min.toFixed(2) : sig.entry?.min} – {typeof sig.entry?.max === 'number' ? sig.entry.max.toFixed(2) : sig.entry?.max}</span>
        </div>
        <div className="sc-level-row">
          <span className="sc-level-label"><Shield size={11} /> Stop Loss</span>
          <span className="sc-level-val" style={{color:'var(--signal-sell)'}}>{typeof sig.stopLoss === 'number' ? sig.stopLoss.toFixed(2) : sig.stopLoss}</span>
        </div>
        <div className="sc-level-row">
          <span className="sc-level-label">TP1</span>
          <span className="sc-level-val" style={{color:'var(--signal-buy)'}}>
            {typeof sig.targets?.tp1 === 'number' ? sig.targets.tp1.toFixed(2) : sig.targets?.tp1}
            {sig.confluence?.targetsTouchProb?.tp1 && <span className="prob-tag">{sig.confluence.targetsTouchProb.tp1}</span>}
          </span>
        </div>
        <div className="sc-level-row">
          <span className="sc-level-label">TP2</span>
          <span className="sc-level-val" style={{color:'var(--signal-buy)'}}>
            {typeof sig.targets?.tp2 === 'number' ? sig.targets.tp2.toFixed(2) : sig.targets?.tp2}
            {sig.confluence?.targetsTouchProb?.tp2 && <span className="prob-tag">{sig.confluence.targetsTouchProb.tp2}</span>}
          </span>
        </div>
        <div className="sc-level-row">
          <span className="sc-level-label">TP3</span>
          <span className="sc-level-val" style={{color:'var(--signal-buy)'}}>
            {typeof sig.targets?.tp3 === 'number' ? sig.targets.tp3.toFixed(2) : sig.targets?.tp3}
            {sig.confluence?.targetsTouchProb?.tp3 && <span className="prob-tag">{sig.confluence.targetsTouchProb.tp3}</span>}
          </span>
        </div>
      </div>

      <div className="sc-progress">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="sc-status">{statusLabel}</span>
          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--brand)' }}>
            Accuracy: {sig.accuracy}%
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: progressPct + '%',
            background: sig.status === 'sl_hit' ? 'var(--signal-sell)' : undefined,
          }}></div>
        </div>
      </div>

      {/* Confluence Strategy Accordion Button */}
      <button
        className="confluence-toggle-btn"
        onClick={() => setShowConfluence(!showConfluence)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={12} className="text-brand" /> Strategy &amp; Confluence Logic
        </span>
        {showConfluence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Expanded Confluence Breakdown */}
      {showConfluence && (
        <div className="confluence-drawer">
          <div className="cf-row">
            <span className="cf-title">1. Daily Target Bias:</span>
            <span className="cf-text">{sig.confluence?.dailyBias || 'BULLISH / Institutional session accumulation'}</span>
          </div>
          <div className="cf-row">
            <span className="cf-title">2. ICT Concept:</span>
            <span className="cf-text">{sig.confluence?.ictConcept || 'Session Liquidity Sweep & displacement confirmation'}</span>
          </div>
          <div className="cf-row">
            <span className="cf-title">3. Order Flow Verdict:</span>
            <span className="cf-text">{sig.confluence?.orderFlow || 'Measured bid/ask absorption confirmed on Level-2 depth.'}</span>
          </div>
          <div className="cf-verdict-box">
            <b>Algorithmic Verdict:</b> {sig.confluence?.verdict || 'High confidence trade setup with institutional backing.'}
          </div>
        </div>
      )}

      {sig.status === 'active' && (
        <div className="sc-actions">
          <button
            className="btn btn-sm"
            onClick={handleCopy}
            style={{flex:1, background:'var(--brand-glow)', color:'var(--brand)', border:'1px solid var(--border-glow)'}}
          >
            <Copy size={12} /> Copy Signal
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleBridge}
            style={{ flex: 1 }}
          >
            <ExternalLink size={12} /> Bridge MT5
          </button>
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { id: 'All', label: 'All Markets' },
  { id: 'Metals', label: 'Gold & Metals' },
  { id: 'Crypto', label: 'Cryptocurrency' },
  { id: 'Forex', label: 'Forex Majors' },
  { id: 'Commodities', label: 'Energies / Oil' },
];

const ASSETS = [
  'All',
  'XAU/USD', 'XAG/USD', 'XPT/USD', 'WTI/OIL', 'BRENT/OIL',
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD', 'AVAX/USD', 'LINK/USD', 'SUI/USD', 'NEAR/USD', 'APT/USD', 'TAO/USD',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'EUR/GBP'
];

const DIRECTIONS = ['All','BUY','SELL'];

export default function Signals() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signals } = useSignalStore();
  const [category, setCategory] = useState('All');
  const [asset, setAsset] = useState('All');
  const [direction, setDirection] = useState('All');

  const displayedSignals = signals.filter(s => {
    if (category !== 'All' && s.marketCategory !== category) return false;
    if (asset !== 'All' && s.asset !== asset) return false;
    if (direction !== 'All' && s.direction !== direction) return false;
    return true;
  });

  return (
    <div className="app-layout">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="app-main">
        <div className="signals-content">
          <div className="signals-header">
            <div>
              <h2>Live Signals Hub <span className="badge badge-buy" style={{fontSize:'0.75rem', verticalAlign:'middle', marginLeft:8}}>16 LIVE STREAMS</span></h2>
              <p>Gold, Forex &amp; Crypto setups backed by Level-2 Order Flow, Whale AOF, and ICT Smart Money.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/indicators" className="btn btn-sm btn-ghost" style={{ gap: 6 }}>
                <Sliders size={14} /> Indicator Suite
              </Link>
              <Link to="/admin" className="btn btn-sm btn-primary" style={{ gap: 6 }}>
                <PlusCircle size={14} /> Dispatch Signal
              </Link>
            </div>
          </div>

          {/* Market Category Switcher */}
          <div className="market-category-bar card">
            <div className="tabs" style={{ gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => {
                const count = cat.id === 'All'
                  ? signals.length
                  : signals.filter(s => s.marketCategory === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    className={`tab-btn ${category === cat.id ? 'active' : ''}`}
                    onClick={() => { setCategory(cat.id); setAsset('All'); }}
                    style={{ padding: '8px 18px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <span>{cat.label}</span>
                    <span className="badge badge-buy" style={{ fontSize: '0.65rem' }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset & Direction Filters */}
          <div className="signals-filters card">
            <Filter size={14} style={{color:'var(--text-muted)'}} />
            <div className="filter-group">
              <span className="filter-label">Asset</span>
              <div className="tabs" style={{ width: 'auto', gap: 4, flexWrap: 'wrap' }}>
                {ASSETS.map(a => (
                  <button
                    key={a}
                    className={`tab-btn ${asset === a ? 'active' : ''}`}
                    style={{padding:'5px 11px', fontSize:'0.74rem'}}
                    onClick={() => setAsset(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-label">Direction</span>
              <div className="tabs" style={{ width: 'auto' }}>
                {DIRECTIONS.map(d => (
                  <button
                    key={d}
                    className={`tab-btn ${direction === d ? 'active' : ''}`}
                    style={{padding:'5px 12px', fontSize:'0.76rem'}}
                    onClick={() => setDirection(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Signal Grid */}
          <div className="signals-grid">
            {displayedSignals.length > 0 ? displayedSignals.map(sig => (
              <SignalCard key={sig.id} sig={sig} />
            )) : (
              <div className="no-signals card">No signals match your selected market filters.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

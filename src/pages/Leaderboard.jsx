import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Search, ArrowLeft } from 'lucide-react';
import PriceTickerBar from '../components/common/PriceTickerBar.jsx';
import './Leaderboard.css';

const TABS = ['Daily','Weekly','Monthly','All-Time'];

function Sparkline({ data }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const w = 80; const h = 30; const pts = data.length;
  const norm = data.map((v, i) => [
    (i / (pts - 1)) * w,
    h - ((v - min) / (max - min || 1)) * h,
  ]);
  const d = norm.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow:'visible'}}>
      <path d={d} fill="none" stroke="var(--signal-buy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={norm[norm.length-1][0]} cy={norm[norm.length-1][1]} r="3" fill="var(--signal-buy)" />
    </svg>
  );
}

function PodiumCard({ trader, position }) {
  const colors = { 1: 'var(--gold)', 2: 'var(--silver)', 3: 'var(--bronze)' };
  const crowns = { 1: '👑', 2: '🥈', 3: '🥉' };
  return (
    <div className={`podium-card ${position === 1 ? 'podium-first' : ''}`} style={{ '--pc': colors[position] }}>
      <div className="podium-crown">{crowns[position]}</div>
      <div className="podium-avatar">{trader.avatar}</div>
      <div className="podium-name">{trader.username}</div>
      <div className="podium-country">{trader.country} {trader.countryName}</div>
      <div className="podium-wr" style={{ color: colors[position] }}>{trader.winRate}%</div>
      <div className="podium-pips text-brand">+{trader.pips} pips</div>
      <div className="podium-rank" style={{ background: colors[position] + '20', color: colors[position] }}>
        #{trader.rank}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('Weekly');
  const [search, setSearch] = useState('');
  const top3 = [];
  const rest = [];

  return (
    <div className="leaderboard-page">
      {/* Navbar */}
      <header className="landing-nav glass">
        <Link to="/" className="landing-nav-logo">
          <div className="landing-nav-logo-icon"><TrendingUp size={18} /></div>
          <span>TrendLens <span className="text-brand">Pro</span></span>
        </Link>
        <div className="landing-nav-actions">
          <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Back</Link>
          <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
        </div>
      </header>

      <PriceTickerBar />

      <div className="leaderboard-content container" style={{ paddingTop: 'calc(var(--topnav-h) + 36px + 40px)', paddingBottom: 60 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="section-label">Community Rankings</div>
          <h1>Leaderboard <span className="text-brand">Unavailable</span></h1>
          <p style={{ marginTop: 12 }}>
            No community ranking service is connected to this build, so no trader ranking is published here.
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs lb-tabs">
          {TABS.map(t => <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>)}
        </div>

        {/* Podium */}
        <div className="podium-wrap">
          <div className="podium-section">
            <div className="card" style={{ padding: '24px', width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>
              No ranked traders — the leaderboard data source is not connected.
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="lb-table-wrap card">
          <div className="lb-table-header">
            <h3>All Traders</h3>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text" className="input-field" placeholder="Search trader..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: 240, padding: '9px 12px 9px 36px' }}
              />
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Trader</th>
                <th>Country</th>
                <th>Win Rate</th>
                <th>Total Pips</th>
                <th>Signals</th>
                <th>Streak</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {[...top3, ...rest].map((t) => (
                <tr key={t.rank}>
                  <td>
                    <span className={`lb-rank-num ${t.rank <= 3 ? `rank-${t.rank}` : ''}`}>{t.rank}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.3rem' }}>{t.avatar}</span>
                      <span style={{ fontWeight: 700 }}>{t.username}</span>
                    </div>
                  </td>
                  <td><span style={{ fontSize: '1rem' }}>{t.country}</span> {t.countryName}</td>
                  <td><span style={{ color: 'var(--signal-buy)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{t.winRate}%</span></td>
                  <td><span style={{ color: 'var(--brand)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>+{t.pips}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{t.signals}</td>
                  <td>
                    <span className={`badge ${t.streak > 5 ? 'badge-buy' : t.streak > 0 ? 'badge-neutral' : 'badge-sell'}`}>
                      🔥 {t.streak}
                    </span>
                  </td>
                  <td><Sparkline data={t.sparkline} /></td>
                </tr>
              ))}
              {top3.length === 0 && rest.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                    No ranking rows available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

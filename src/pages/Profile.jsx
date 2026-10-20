import React, { useState } from 'react';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuthStore, useDemoAccountStore } from '../store/index.js';
import { Edit3, Trophy, Target, Activity, TrendingUp, Zap, Shield } from 'lucide-react';
import './Profile.css';

const ASSET_COLORS = ['var(--brand)', 'var(--signal-buy)', 'var(--signal-neutral)', 'var(--gold)'];

function StatBadge({ label, val, color, icon: Icon }) {
  return (
    <div className="profile-stat-card card">
      <div className="psc-icon" style={{ '--ic': color }}><Icon size={18} /></div>
      <div className="psc-val" style={{ color }}>{val}</div>
      <div className="psc-label">{label}</div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuthStore();
  const demoAccount = useDemoAccountStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Stats');
  const TABS = ['Stats','Settings'];

  /**
   * Every figure below is measured from the real trade journal. Nothing is
   * asserted when no trade has been closed yet.
   */
  const trades = demoAccount?.trades || [];
  const wins = trades.filter((t) => (t.pnlDollars || 0) > 0).length;
  const measured = {
    winRate: trades.length ? `${Math.round((wins / trades.length) * 100)}%` : null,
    totalSignals: trades.length,
    pips: trades.length ? +trades.reduce((s, t) => s + (t.pips || 0), 0).toFixed(1) : null,
    streak: null,
  };

  const byAsset = {};
  trades.forEach((t) => {
    if (!byAsset[t.asset]) byAsset[t.asset] = { wins: 0, total: 0 };
    byAsset[t.asset].total += 1;
    if ((t.pnlDollars || 0) > 0) byAsset[t.asset].wins += 1;
  });
  const assetPerformance = Object.entries(byAsset)
    .map(([label, v], idx) => ({
      label,
      val: Math.round((v.wins / v.total) * 100),
      color: ASSET_COLORS[idx % ASSET_COLORS.length],
    }))
    .sort((a, b) => b.val - a.val);

  if (!user) return null;

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <div className="profile-content">
          {/* Header Card */}
          <div className="profile-header-card card card-glow">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">{user.avatar}</div>
              <div className="profile-avatar-plan badge badge-brand">{user.plan}</div>
            </div>
            <div className="profile-info">
              <h2 className="profile-username">{user.username}</h2>
              <div className="profile-email">{user.email}</div>
              <div className="profile-badges">
                <span className="badge badge-neutral">Demo account</span>
                <span className="badge badge-brand">{user.isDemoAuth ? 'Local demo session' : 'Session'}</span>
                <span className="badge badge-neutral">
                  {trades.length} closed trade{trades.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm profile-edit"><Edit3 size={14} /> Edit Profile</button>
          </div>

          {/* Stats Grid — measured from the real trade journal */}
          <div className="profile-stats-grid">
            <StatBadge label="Win Rate"      val={measured.winRate ?? '—'}        color="var(--signal-buy)"    icon={Target} />
            <StatBadge label="Total Signals" val={measured.totalSignals}          color="var(--brand)"         icon={Zap} />
            <StatBadge label="Total Pips"    val={measured.pips === null ? '—' : `${measured.pips >= 0 ? '+' : ''}${measured.pips}`} color="var(--gold)" icon={TrendingUp} />
            <StatBadge label="Win Streak"    val={measured.streak === null ? '—' : `${measured.streak} days`} color="var(--signal-neutral)" icon={Activity} />
          </div>

          {/* Tabs */}
          <div className="tabs profile-tabs">
            {TABS.map(t => <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>{t}</button>)}
          </div>

          {activeTab === 'Stats' && (
            <div className="profile-section card">
              <h3 style={{marginBottom:20}}>Performance Overview</h3>
              <div className="perf-bars">
                {assetPerformance.length === 0 && (
                  <div style={{ color: 'var(--signal-neutral)', fontSize: '0.85rem' }}>
                    No closed trades yet — performance by asset is measured from your trade journal.
                  </div>
                )}
                {assetPerformance.map(a => (
                  <div key={a.label} className="perf-bar-row">
                    <span className="perf-label">{a.label}</span>
                    <div className="progress-bar perf-bar-track">
                      <div className="progress-fill" style={{ width: a.val + '%', background: a.color }}></div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.color, fontSize: '0.85rem', minWidth: 40, textAlign: 'right' }}>{a.val}%</span>
                  </div>
                ))}
              </div>
              <div className="divider"></div>
              <div className="plan-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4>Current Plan: <span className="text-brand">{String(user.plan).toUpperCase()}</span></h4>
                    <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      This build runs a local demo session. There is no paid plan and no premium entitlement.
                    </p>
                  </div>
                  <button className="btn btn-primary btn-sm">Upgrade to Elite</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="profile-section card">
              <h3 style={{ marginBottom: 20 }}>Account Settings</h3>
              <div className="settings-group">
                <label className="form-label">Display Name</label>
                <input className="input-field" defaultValue={user.username} />
              </div>
              <div className="settings-group">
                <label className="form-label">Email</label>
                <input className="input-field" type="email" defaultValue={user.email} />
              </div>
              <div className="settings-group">
                <label className="form-label">Notification Preferences</label>
                <div className="settings-toggles">
                  {['Whale Alerts', 'New Signals', 'Daily Target', 'News Updates'].map(n => (
                    <div key={n} className="settings-toggle-row">
                      <span>{n}</span>
                      <div className="toggle active"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button className="btn btn-primary">Save Changes</button>
                <button className="btn btn-ghost" style={{ color: 'var(--signal-sell)' }} onClick={logout}>Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

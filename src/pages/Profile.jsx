import React, { useState } from 'react';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuthStore } from '../store/index.js';
import { Edit3, Trophy, Target, Activity, TrendingUp, Zap, Shield } from 'lucide-react';
import './Profile.css';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Stats');
  const TABS = ['Stats','Settings'];

  if (!user) return null;

  return (
    <div className="app-layout">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
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
                <span className="badge badge-buy">🔥 {user.stats.streak} Day Streak</span>
                <span className="badge badge-brand">Pro Trader</span>
                <span className="badge badge-neutral">XAU Specialist</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm profile-edit"><Edit3 size={14} /> Edit Profile</button>
          </div>

          {/* Stats Grid */}
          <div className="profile-stats-grid">
            <StatBadge label="Win Rate"      val={`${user.stats.winRate}%`}       color="var(--signal-buy)"    icon={Target} />
            <StatBadge label="Total Signals" val={user.stats.totalSignals}         color="var(--brand)"         icon={Zap} />
            <StatBadge label="Total Pips"    val={`+${user.stats.pips}`}           color="var(--gold)"          icon={TrendingUp} />
            <StatBadge label="Win Streak"    val={`${user.stats.streak} days`}     color="var(--signal-neutral)" icon={Activity} />
          </div>

          {/* Tabs */}
          <div className="tabs profile-tabs">
            {TABS.map(t => <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>{t}</button>)}
          </div>

          {activeTab === 'Stats' && (
            <div className="profile-section card">
              <h3 style={{marginBottom:20}}>Performance Overview</h3>
              <div className="perf-bars">
                {[
                  { label: 'XAU/USD',  val: 88, color: 'var(--brand)' },
                  { label: 'BTC/USD',  val: 74, color: 'var(--signal-buy)' },
                  { label: 'EUR/USD',  val: 91, color: 'var(--signal-neutral)' },
                  { label: 'GBP/USD',  val: 68, color: 'var(--gold)' },
                ].map(a => (
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
                    <h4>Current Plan: <span className="text-brand">{user.plan.toUpperCase()}</span></h4>
                    <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Full access to all signals, academy, and whale engine.</p>
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

import React, { useState, useMemo } from 'react';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuthStore, useDemoAccountStore } from '../store/index.js';
import { buildPaperMetricsView } from '../utils/paperMetricsView.js';
import { Edit3, Trophy, Target, Activity, TrendingUp, Zap, Shield } from 'lucide-react';
import './Profile.css';

const ASSET_COLORS = ['var(--brand)', 'var(--signal-buy)', 'var(--signal-neutral)', 'var(--gold)'];

function StatBadge({ label, val, color, icon: Icon, title }) {
  return (
    <div className="profile-stat-card card" title={title}>
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
   * Every figure below comes from the shared, authoritative metrics module.
   * The journal retains at most 50 records, so these figures describe the
   * RETAINED JOURNAL and are never presented as an all-time record.
   */
  const paperView = useMemo(
    () =>
      buildPaperMetricsView({
        trades: demoAccount?.trades || [],
        account: {
          balance: demoAccount?.balance,
          unrealizedPnL: demoAccount?.unrealizedPnL,
        },
        counters: {
          winCount: demoAccount?.winCount,
          lossCount: demoAccount?.lossCount,
          breakevenCount: demoAccount?.breakevenCount,
          realizedPnL: demoAccount?.realizedPnL,
        },
      }),
    [
      demoAccount?.trades,
      demoAccount?.balance,
      demoAccount?.unrealizedPnL,
      demoAccount?.winCount,
      demoAccount?.lossCount,
      demoAccount?.breakevenCount,
      demoAccount?.realizedPnL,
    ]
  );

  const assetPerformance = paperView.perAsset;

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
                  {paperView.totalClosedTrades} closed trade{paperView.totalClosedTrades === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm profile-edit"><Edit3 size={14} /> Edit Profile</button>
          </div>

          {/* Stats Grid — measured from the shared retained-journal metrics */}
          <div className="profile-stats-grid">
            <StatBadge label="Win Rate"      val={paperView.winRate}            color="var(--signal-buy)"    icon={Target} />
            <StatBadge label="Closed Trades" val={paperView.totalClosedTrades}  color="var(--brand)"         icon={Zap} />
            <StatBadge label="Total Pips"    val={paperView.totalPips}          color="var(--gold)"          icon={TrendingUp} />
            <StatBadge
              label="Win Streak"
              val={paperView.currentStreak.value}
              color="var(--signal-neutral)"
              icon={Activity}
              title={paperView.currentStreak.note || undefined}
            />
          </div>

          {/* Scope + data-integrity notice */}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            {paperView.scopeNotice}
            {paperView.pipsCoverageNotice ? ` · ${paperView.pipsCoverageNotice}` : ''}
            {paperView.integrityNotice ? ` · ${paperView.integrityNotice}` : ''}
            {paperView.currentStreak.note ? ` · ${paperView.currentStreak.note}` : ''}
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
                    No closed trades yet — performance by asset is measured from your retained trade journal.
                  </div>
                )}
                {assetPerformance.map(a => (
                  <div key={a.label} className="perf-bar-row">
                    <span className="perf-label">{a.label}</span>
                    {a.winRate === 'N/A' ? (
                      <div className="progress-bar perf-bar-track"></div>
                    ) : (
                      <div className="progress-bar perf-bar-track">
                        <div className="progress-fill" style={{ width: a.winRate, background: ASSET_COLORS[0] }}></div>
                      </div>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.winRate === 'N/A' ? 'var(--text-muted)' : ASSET_COLORS[0], fontSize: '0.85rem', minWidth: 40, textAlign: 'right' }}>{a.winRate}</span>
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

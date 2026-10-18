import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useThemeStore, useAuthStore } from '../../store/index.js';
import { useMarketStore } from '../../store/marketStore.js';
import { useToastStore } from '../../store/toastStore.js';
import CalculatorModal from './CalculatorModal.jsx';
import { TrendingUp, Bell, ChevronDown, Sun, Zap, Settings, LogOut, User, Calculator, Volume2, VolumeX } from 'lucide-react';
import './Navbar.css';

const THEMES = [
  { key: 'tl-dark',   label: 'TL Dark',    icon: '🌑' },
  { key: 'tl-navy',   label: 'Midnight',   icon: '🌊' },
  { key: 'tl-matrix', label: 'Matrix',     icon: '🟩' },
  { key: 'tl-amber',  label: 'Amber',      icon: '🔥' },
  { key: 'tl-light',  label: 'Light',      icon: '☀️' },
];

export default function Navbar({ sidebarOpen, setSidebarOpen }) {
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { prices } = useMarketStore();
  const { addToast } = useToastStore();
  const [themeOpen, setThemeOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const goldData = prices['XAU/USD'] || { price: 2645.82, change: 12.34 };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    addToast({
      title: !soundEnabled ? 'Smart Audio Enabled 🔔' : 'Audio Muted 🔕',
      message: !soundEnabled ? 'Alert chimes will play on new signals & whale prints.' : 'Trading alert sounds muted.',
      type: 'info',
    });
  };

  return (
    <>
      <nav className="app-navbar glass">
        <div className="navbar-left">
          {setSidebarOpen && (
            <button className="btn btn-icon btn-ghost hamburger" onClick={() => setSidebarOpen(o => !o)}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          )}
          <Link to="/" className="nav-logo">
            <div className="nav-logo-icon"><TrendingUp size={18} /></div>
            <span className="nav-logo-text">TrendLens <span className="text-brand">Pro</span></span>
          </Link>
        </div>

        {/* Live price connected to useMarketStore */}
        <div className="navbar-center">
          <div className="live-price-pill">
            <span className="live-dot"></span>
            <span className="live-asset">XAU/USD</span>
            <span className="live-value">{goldData.price.toFixed(2)}</span>
            <span className={`live-change ${goldData.change >= 0 ? 'positive' : 'negative'}`}>
              {goldData.change >= 0 ? '+' : ''}{goldData.change.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="navbar-right">
          {/* Risk Calculator Action */}
          <button
            className="btn btn-icon btn-ghost"
            title="Position Size & Risk Calculator"
            onClick={() => setCalcOpen(true)}
          >
            <Calculator size={16} />
          </button>

          {/* Sound Alert Toggle */}
          <button
            className="btn btn-icon btn-ghost"
            title={soundEnabled ? 'Smart Sound Alerts Active' : 'Sound Alerts Muted'}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 size={16} className="text-brand" /> : <VolumeX size={16} />}
          </button>

          {/* Theme Switcher */}
          <div className="dropdown-wrap">
            <button className="btn btn-icon btn-ghost" onClick={() => { setThemeOpen(o => !o); setUserOpen(false); }}>
              <Sun size={16} />
            </button>
            {themeOpen && (
              <div className="dropdown glass">
                <div className="dropdown-label">Themes</div>
                {THEMES.map(t => (
                  <button key={t.key} className={`dropdown-item ${theme === t.key ? 'active' : ''}`}
                    onClick={() => { setTheme(t.key); setThemeOpen(false); }}>
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User avatar */}
          {user ? (
            <div className="dropdown-wrap">
              <button className="nav-avatar" onClick={() => { setUserOpen(o => !o); setThemeOpen(false); }}>
                <span>{user.avatar}</span>
                <ChevronDown size={14} />
              </button>
              {userOpen && (
                <div className="dropdown glass dropdown-right">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{user.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
                      <div className="badge badge-brand" style={{ fontSize: '0.65rem', marginTop: 4 }}>{user.plan}</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/profile" className="dropdown-item" onClick={() => setUserOpen(false)}><User size={14} /> Profile</Link>
                  <Link to="/profile" className="dropdown-item" onClick={() => setUserOpen(false)}><Settings size={14} /> Settings</Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item danger" onClick={() => { logout(); setUserOpen(false); }}><LogOut size={14} /> Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )}
        </div>
      </nav>

      {/* Global Calculator Modal */}
      <CalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />
    </>
  );
}

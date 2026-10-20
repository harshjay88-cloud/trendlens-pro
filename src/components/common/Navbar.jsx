import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useThemeStore, useAuthStore } from '../../store/index.js';
import { useMarketStore } from '../../store/marketStore.js';
import { useToastStore } from '../../store/toastStore.js';
import CalculatorModal from './CalculatorModal.jsx';
import { NavLink } from 'react-router-dom';
import {
  TrendingUp, Bell, ChevronDown, Sun, Zap, Settings, LogOut, User,
  Calculator, Volume2, VolumeX, LayoutDashboard, Sliders, Radio, Trophy, Shield
} from 'lucide-react';
import './Navbar.css';

const THEMES = [
  { key: 'mono-dark',    label: 'Black & White OLED', icon: '◼' },
  { key: 'mono-light',   label: 'Premium Light',     icon: '◻' },
  { key: 'tl-dark',      label: 'TradingView Dark', icon: '🌑' },
  { key: 'tl-black-red', label: 'Black & Red Pro',  icon: '🔴' },
  { key: 'tl-navy',      label: 'Midnight Navy',    icon: '🌊' },
  { key: 'tl-matrix',    label: 'Matrix Terminal',  icon: '🟩' },
  { key: 'tl-amber',     label: 'Amber Gold',       icon: '🔥' },
  { key: 'tl-light',     label: 'Light Clean',      icon: '☀️' },
];

export default function Navbar() {
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
        {/* Left: Logo */}
        <div className="navbar-left">
          <Link to="/dashboard" className="nav-logo">
            <div className="nav-logo-icon"><TrendingUp size={18} /></div>
            <span className="nav-logo-text">TrendLens <span className="text-brand">Pro</span></span>
          </Link>
        </div>

        {/* Center: Top Navigation Links (Moved from side panel for maximum chart workspace) */}
        <div className="navbar-nav-links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-tab-btn ${isActive ? 'active' : ''}`}
            title="Institutional Trading Terminal & Engines"
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/signals"
            className={({ isActive }) => `nav-tab-btn ${isActive ? 'active' : ''}`}
            title="Live Signals Hub & Signals Feed"
          >
            <Zap size={15} />
            <span>Signals Hub</span>
            <span className="nav-badge-live">Live</span>
          </NavLink>

          <NavLink
            to="/indicators"
            className={({ isActive }) => `nav-tab-btn ${isActive ? 'active' : ''}`}
            title="Indicator Suite (50+ Institutional Indicators)"
          >
            <Sliders size={15} />
            <span>Indicator Suite</span>
          </NavLink>

          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-tab-btn ${isActive ? 'active' : ''}`}
            title="Signal Dispatcher & Automated EA Relays"
          >
            <Radio size={15} />
            <span>Signal Dispatcher</span>
          </NavLink>

          <NavLink
            to="/leaderboard"
            className={({ isActive }) => `nav-tab-btn ${isActive ? 'active' : ''}`}
            title="Global Performance & Win-Rate Leaderboard"
          >
            <Trophy size={15} />
            <span>Leaderboard</span>
          </NavLink>
        </div>

        {/* Right: Price, Sound, Calc, Theme, Account */}
        <div className="navbar-right">
          {/* Live price pill */}
          <div className="live-price-pill">
            <span className="live-dot"></span>
            <span className="live-asset">XAU/USD</span>
            <span className="live-value">{goldData.price.toFixed(2)}</span>
            <span className={`live-change ${goldData.change >= 0 ? 'positive' : 'negative'}`}>
              {goldData.change >= 0 ? '+' : ''}{goldData.change.toFixed(2)}
            </span>
          </div>

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

          {/* User Account Button with Slide-Down Drawer */}
          {user ? (
            <div className="dropdown-wrap">
              <button
                className="nav-avatar"
                onClick={() => { setUserOpen(o => !o); setThemeOpen(false); }}
                title="Account Menu (Slide down)"
              >
                <span>{user.avatar || '👤'}</span>
                <span className="nav-username">{user.username}</span>
                <ChevronDown size={14} />
              </button>
              {userOpen && (
                <div className="dropdown glass dropdown-right account-slide-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{user.avatar || '👤'}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>{user.username}</div>
                      <div className="badge badge-brand" style={{ fontSize: '0.65rem', marginTop: 4 }}>
                        {user.plan || 'PRO TRADER'}
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/profile" className="dropdown-item" onClick={() => setUserOpen(false)}>
                    <User size={15} /> <span>My Profile</span>
                  </Link>
                  <Link to="/profile#settings" className="dropdown-item" onClick={() => setUserOpen(false)}>
                    <Settings size={15} /> <span>Terminal Settings</span>
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item danger" onClick={() => { logout(); setUserOpen(false); }}>
                    <LogOut size={15} /> <span>Sign Out</span>
                  </button>
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

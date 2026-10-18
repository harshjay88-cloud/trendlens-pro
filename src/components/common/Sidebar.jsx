import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/index.js';
import {
  LayoutDashboard, Zap, Trophy,
  User, Settings, LogOut, TrendingUp, X, Radio, Sliders
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/dashboard' },
  { icon: Zap,             label: 'Signals Hub', to: '/signals' },
  { icon: Sliders,         label: 'Indicator Suite', to: '/indicators' },
  { icon: Radio,           label: 'Signal Dispatcher', to: '/admin' },
  { icon: Trophy,          label: 'Leaderboard', to: '/leaderboard' },
];

const BOTTOM_ITEMS = [
  { icon: User,     label: 'Profile',  to: '/profile' },
  { icon: Settings, label: 'Settings', to: '/profile#settings' },
];

export default function Sidebar({ open, setOpen }) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><TrendingUp size={16} /></div>
            <span>TrendLens <span className="text-brand">Pro</span></span>
          </div>
          <button className="btn btn-icon btn-ghost sidebar-close" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-section-label">MAIN TERMINAL</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth < 1024 && setOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Signals Hub' && <span className="sidebar-badge">Live</span>}
              {label === 'Indicator Suite' && <span className="sidebar-badge" style={{background:'rgba(0, 230, 118, 0.15)', color:'var(--signal-buy)'}}>10 Pro</span>}
              {label === 'Signal Dispatcher' && <span className="sidebar-badge" style={{background:'var(--brand-glow)', color:'var(--brand)'}}>Admin</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-section-label">ACCOUNT</div>
        <nav className="sidebar-nav">
          {BOTTOM_ITEMS.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth < 1024 && setOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <button className="sidebar-item sidebar-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-version">v2.3.0 · GoldVIP Terminal Engine</div>
        </div>
      </aside>
    </>
  );
}

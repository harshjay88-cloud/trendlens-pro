import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore, useAuthStore } from './store/index.js';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Signals from './pages/Signals.jsx';
import Indicators from './pages/Indicators.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';

// Protected Route
const Guard = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('TrendLens ErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0d13',
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚡</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00e676', marginBottom: '8px' }}>
            TrendLens Pro Terminal
          </h2>
          <p style={{ color: '#8592a6', maxWidth: '480px', fontSize: '0.88rem', marginBottom: '20px' }}>
            A temporary component error occurred. Click below to reload the dashboard safely.
          </p>
          <button
            onClick={() => {
              try { localStorage.removeItem('tl_show_bot_tester'); } catch {}
              window.location.reload();
            }}
            style={{
              background: 'linear-gradient(135deg, #00e676, #00b0ff)',
              color: '#0a0d13',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.90rem'
            }}
          >
            🔄 Reload Terminal Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/dashboard"  element={<Guard><Dashboard /></Guard>} />
          <Route path="/signals"    element={<Guard><Signals /></Guard>} />
          <Route path="/indicators" element={<Guard><Indicators /></Guard>} />
          <Route path="/admin"      element={<Guard><Admin /></Guard>} />
          <Route path="/profile"    element={<Guard><Profile /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </HashRouter>
    </ErrorBoundary>
  );
}

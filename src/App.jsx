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

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
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
  );
}

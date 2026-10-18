import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { TrendingUp, Eye, EyeOff, ArrowRight, Shield, Zap, Target, Activity } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    const res = await login(email, password);
    if (res.success) navigate('/dashboard');
    else setError('Invalid credentials. Please try again.');
  };

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div className="login-left-bg">
          <div className="login-glow login-glow-1"></div>
          <div className="login-glow login-glow-2"></div>
          <div className="login-grid"></div>
        </div>
        <div className="login-left-content">
          <Link to="/" className="login-logo">
            <div className="login-logo-icon"><TrendingUp size={22} /></div>
            <span>TrendLens <span className="text-brand">Pro</span></span>
          </Link>
          <div className="login-hero-text">
            <h1>Your edge<br /><span className="text-brand">starts here.</span></h1>
            <p>Institutional-grade signals, whale detection, and AI-powered analytics — all in one platform.</p>
          </div>
          <div className="login-features">
            {[
              { icon: <Zap size={16} />, label: 'Live Signal Engines', sub: 'WhaleAOF · Flow Sniper · Wizard Trend' },
              { icon: <Target size={16} />, label: 'Daily Target Engine', sub: 'Pre-market AI bias & price targets' },
              { icon: <Activity size={16} />, label: 'L2 Order Flow', sub: 'Real-time institutional tracking' },
            ].map(f => (
              <div key={f.label} className="login-feat">
                <div className="login-feat-icon">{f.icon}</div>
                <div>
                  <div className="login-feat-label">{f.label}</div>
                  <div className="login-feat-sub">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="login-users">
            <div className="login-avatars">
              {['🦅','🎯','💎','🐋','⚡'].map((a, i) => (
                <div key={i} className="login-avatar-chip" style={{ marginLeft: i ? -10 : 0 }}>{a}</div>
              ))}
            </div>
            <span>Join <strong>10,000+</strong> traders worldwide</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-header">
            <h2>Access Terminal</h2>
            <p>Sign in to your TrendLens Pro account</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="text" className="input-field"
                placeholder="trader@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrap">
                <input
                  type={showPass ? 'text' : 'password'} className="input-field"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-forgot">
              <a href="#">Forgot Password?</a>
            </div>
            <button type="submit" className={`btn btn-primary btn-lg login-submit ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
              {isLoading ? (
                <span className="login-spinner"></span>
              ) : (
                <><Shield size={16} /> Secure Login <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="login-security">
            <Shield size={13} /> Encrypted & Protected · v2.0.0
          </div>

          <div className="login-signup-note">
            Don't have access? <a href="#contact">Contact us on WhatsApp →</a>
          </div>

          <div className="login-demo-note">
            <span>💡 Demo: </span>Enter any email & password to explore the platform
          </div>
        </div>
      </div>
    </div>
  );
}

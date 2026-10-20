import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowRight, Play, ChevronDown, Star, MessageCircle, Download, Check, Zap, Activity, Target, BrainCircuit, Trophy, BookOpen, Shield, ExternalLink } from 'lucide-react';
import PriceTickerBar from '../components/common/PriceTickerBar.jsx';
import { MOCK_LEADERBOARD, MOCK_TESTIMONIALS, FAQDATA, PLANS, BOOKS } from '../utils/mockData.js';
import './Landing.css';

const FEATURES = [
  { icon: '🐋', title: 'Whale AOF Engine',     desc: 'Real-time institutional order detection. Know when big money moves before the crowd does.', stat: '94.8% accuracy' },
  { icon: '📊', title: 'L2 Order Flow',         desc: 'Live Level-2 order book depth with Bookmap-style heatmap and delta pressure visualization.', stat: 'Real-time data' },
  { icon: '🎯', title: 'Daily Target Engine',   desc: 'AI-computed session bias and price magnet zones delivered before London market open.', stat: 'Daily pre-market' },
  { icon: '🤖', title: 'AI Signal Suite',        desc: 'Multi-timeframe signals: Flow Sniper, Magic Scalper, Wizard Trend and Whale AOF engine.', stat: '4 engines' },
  { icon: '🏆', title: 'Live Leaderboard',       desc: 'Real-time trader performance rankings with win rate badges, pip tracking and streak counters.', stat: '10k+ traders' },
  { icon: '⚡', title: 'Indicator Overlays',     desc: 'Bookmap-style Heatmap, Whale AOF, and CME magnet targets painted directly on your chart.', stat: '10 Pro Tools' },
];

const ENGINES = [
  { key: 'whale',   label: 'Whale AOF',     icon: '🐋', color: '#00D4FF', accuracy: 94, desc: 'Detects institutional absorption patterns and large-order flow before price reacts. Powered by real Level-2 order book reconstruction.', badge: 'Institutional Grade' },
  { key: 'flow',    label: 'Flow Sniper',   icon: '🎯', color: '#00E676', accuracy: 91, desc: 'Pinpoints high-probability breakout and pullback entries using orderflow imbalance zones and delta divergence signals.', badge: 'Breakout Specialist' },
  { key: 'scalper', label: 'Magic Scalper', icon: '⚡', color: '#FFB300', accuracy: 89, desc: 'Ultra-fast scalp entries on M1-M15 timeframes using momentum shifts, micro-structure breaks, and tick volume bursts.', badge: 'Scalp Precision' },
  { key: 'wizard',  label: 'Wizard Trend',  icon: '🔮', color: '#7C6FFF', accuracy: 87, desc: 'Identifies macro trend direction and optimal swing entry zones using multi-timeframe structure analysis and SMC logic.', badge: 'Trend Filter' },
];

export default function Landing() {
  const [activeEngine, setActiveEngine] = useState('whale');
  const [openFaq, setOpenFaq] = useState(null);
  const [heroPrice, setHeroPrice] = useState(2645.82);

  useEffect(() => {
    const iv = setInterval(() => setHeroPrice(p => +(p + (Math.random() - 0.5) * 1.2).toFixed(2)), 1800);
    return () => clearInterval(iv);
  }, []);

  const engine = ENGINES.find(e => e.key === activeEngine);

  return (
    <div className="landing">
      {/* ── NAVBAR ── */}
      <header className="landing-nav glass">
        <Link to="/" className="landing-nav-logo">
          <div className="landing-nav-logo-icon"><TrendingUp size={18} /></div>
          <span>TrendLens <span className="text-brand">Pro</span></span>
        </Link>
        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <Link to="/indicators">Indicators</Link>
          <a href="#plans">Pricing</a>
          <a href="#leaderboard-preview">Leaderboard</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="landing-nav-actions">
          <Link to="/leaderboard" className="btn btn-ghost btn-sm">Leaderboard</Link>
          <Link to="/login" className="btn btn-primary btn-sm">Login <ArrowRight size={14} /></Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-grid"></div>
          <div className="hero-glow hero-glow-1"></div>
          <div className="hero-glow hero-glow-2"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-badge animate-fade-up">
            <span className="hero-badge-dot"></span>
            Live Trading Platform · Bybit Demo & Paper Trading
          </div>
          <h1 className="hero-title animate-fade-up delay-1">
            AI-Powered Trading<br />
            <span className="hero-title-gradient">Intelligence.</span>
          </h1>
          <p className="hero-sub animate-fade-up delay-2">
            Live order flow signals, whale detection, and daily bias targets for XAU/USD, Forex & Crypto.
            Zero guesswork. Institutional-grade analytics for every trader.
          </p>
          <div className="hero-cta animate-fade-up delay-3">
            <Link to="/login" className="btn btn-primary btn-lg">
              Start Trading <ArrowRight size={18} />
            </Link>
            <a href="#features" className="btn btn-ghost btn-lg">
              <Play size={16} /> Watch Demo
            </a>
          </div>

          {/* Live Stats */}
          <div className="hero-stats animate-fade-up delay-4">
            <div className="hero-stat">
              <div className="hero-stat-val">XAU/USD</div>
              <div className="hero-stat-sub">
                <span className="live-dot-sm"></span>
                <span style={{fontFamily:'var(--font-mono)', color:'var(--brand)', fontWeight:700}}>{heroPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="hero-stat-div"></div>
            <div className="hero-stat">
              <div className="hero-stat-val">94.8%</div>
              <div className="hero-stat-sub">Avg Win Rate</div>
            </div>
            <div className="hero-stat-div"></div>
            <div className="hero-stat">
              <div className="hero-stat-val">10k+</div>
              <div className="hero-stat-sub">Active Traders</div>
            </div>
            <div className="hero-stat-div"></div>
            <div className="hero-stat">
              <div className="hero-stat-val">4</div>
              <div className="hero-stat-sub">Signal Engines</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER BAR ── */}
      <PriceTickerBar />

      {/* ── FEATURES ── */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Platform Features</div>
            <h2 className="section-title">Everything you need to <span className="text-brand">trade smarter</span></h2>
            <p className="section-sub">Institutional-grade tools that were previously only available to professional trading desks — now in your hands.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feature-card animate-fade-up delay-${i + 1}`}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-stat badge badge-brand">{f.stat}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIGNAL ENGINES ── */}
      <section className="section engines-section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Signal Engines</div>
            <h2 className="section-title">Four precision engines, <span className="text-brand">one platform</span></h2>
          </div>
          <div className="engine-tabs">
            {ENGINES.map(e => (
              <button key={e.key} className={`engine-tab ${activeEngine === e.key ? 'active' : ''}`}
                onClick={() => setActiveEngine(e.key)} style={activeEngine === e.key ? { '--ec': e.color } : {}}>
                <span className="engine-tab-icon">{e.icon}</span>
                <span>{e.label}</span>
              </button>
            ))}
          </div>
          <div className="engine-display card card-glow">
            <div className="engine-display-left">
              <div className="engine-big-icon">{engine.icon}</div>
              <div className="badge badge-brand" style={{ '--brand': engine.color, '--brand-glow': engine.color + '30' }}>{engine.badge}</div>
              <h3 style={{ color: engine.color, marginTop: 12 }}>{engine.label}</h3>
              <p style={{ marginTop: 8 }}>{engine.desc}</p>
              <div className="engine-accuracy">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Signal Accuracy</span>
                  <span style={{ fontWeight: 700, color: engine.color }}>{engine.accuracy}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: engine.accuracy + '%', background: engine.color }}></div>
                </div>
              </div>
              <Link to="/login" className="btn btn-outline" style={{ marginTop: 20, '--brand': engine.color, '--border-glow': engine.color + '60' }}>
                Access Engine <ArrowRight size={14} />
              </Link>
            </div>
            <div className="engine-display-right">
              <div className="mock-signal-card">
                <div className="mock-signal-header">
                  <span className="badge badge-buy">{engine.key === 'scalper' ? 'SELL' : 'BUY'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>XAU/USD</span>
                  <span className="live-dot"></span>
                </div>
                <div className="mock-signal-rows">
                  <div className="mock-row"><span>Entry</span><span style={{fontFamily:'var(--font-mono)', color: 'var(--text-primary)'}}>2,641.50 – 2,643.00</span></div>
                  <div className="mock-row"><span>Stop Loss</span><span style={{fontFamily:'var(--font-mono)', color:'var(--signal-sell)'}}>2,633.00 🛡️</span></div>
                  <div className="mock-row"><span>TP1</span><span style={{fontFamily:'var(--font-mono)', color:'var(--signal-buy)'}}>2,655.00 ✅</span></div>
                  <div className="mock-row"><span>TP2</span><span style={{fontFamily:'var(--font-mono)', color:'var(--signal-buy)'}}>2,663.00 ◐</span></div>
                  <div className="mock-row"><span>TP3</span><span style={{fontFamily:'var(--font-mono)', color:'var(--text-muted)'}}>2,672.00 ○</span></div>
                </div>
                <div className="progress-bar" style={{ marginTop: 12 }}>
                  <div className="progress-fill" style={{ width: '67%', background: engine.color }}></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: engine.color + '20', color: engine.color, border: `1px solid ${engine.color}60` }}>Copy Signal</button>
                  <button className="btn btn-sm btn-ghost" style={{ flex: 1 }}>Bridge MT5</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDICATORS SHOWCASE ── */}
      <section className="section" id="indicators-preview">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Institutional Tools</div>
            <h2 className="section-title">HSR Ultra &amp; <span className="text-brand">Order Flow Suite</span></h2>
            <p className="section-sub">10 algorithmic indicators painted directly over your chart: Heatmap, Whale AOF, and CME Targets.</p>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/indicators" className="btn btn-primary btn-lg" style={{ gap: 8 }}>
              Explore All 10 Indicators &amp; Engines <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="section plans-section" id="plans">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Pricing</div>
            <h2 className="section-title">Choose your <span className="text-brand">edge</span></h2>
            <p className="section-sub">Start free, upgrade when you're ready. All plans include risk disclaimer and free guide books.</p>
          </div>
          <div className="plans-grid">
            {PLANS.map((plan, i) => (
              <div key={plan.name} className={`plan-card card ${plan.popular ? 'plan-popular' : ''} animate-fade-up delay-${i+1}`} style={{ '--pc': plan.color }}>
                {plan.popular && <div className="plan-popular-badge">Most Popular</div>}
                <div className="plan-name" style={{ color: plan.color }}>{plan.name}</div>
                <div className="plan-price">
                  {plan.price === 0 ? <span className="plan-price-num">Free</span> : (
                    <><span className="plan-price-currency">$</span><span className="plan-price-num">{plan.price}</span><span className="plan-price-period">/{plan.period}</span></>
                  )}
                </div>
                <ul className="plan-features">
                  {plan.features.map(f => (
                    <li key={f}><Check size={14} style={{ color: plan.color, flexShrink: 0 }} />{f}</li>
                  ))}
                </ul>
                <Link to="/login" className="btn" style={{
                  width: '100%', marginTop: 'auto',
                  background: plan.popular ? `linear-gradient(135deg, ${plan.color}, var(--brand-dim))` : 'transparent',
                  color: plan.popular ? '#000' : plan.color,
                  border: `1.5px solid ${plan.color}60`,
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERBOARD PREVIEW ── */}
      <section className="section" id="leaderboard-preview">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Community</div>
            <h2 className="section-title">Top performers <span className="text-brand">this week</span></h2>
          </div>
          <div className="leaderboard-preview card">
            {MOCK_LEADERBOARD.slice(0, 5).map((t, i) => (
              <div key={t.rank} className="lb-preview-row">
                <span className="lb-rank">{t.rank}</span>
                <span className="lb-avatar">{t.avatar}</span>
                <div className="lb-info">
                  <div className="lb-name">{t.username}</div>
                  <div className="lb-country">{t.country} {t.countryName}</div>
                </div>
                <div className="lb-stats">
                  <span className="lb-wr" style={{ color: 'var(--signal-buy)' }}>{t.winRate}%</span>
                  <span className="lb-pips text-brand">+{t.pips} pips</span>
                </div>
              </div>
            ))}
            <Link to="/leaderboard" className="btn btn-outline" style={{ width: '100%', marginTop: 16 }}>
              View Full Leaderboard <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Testimonials</div>
            <h2 className="section-title">Traders love <span className="text-brand">TrendLens Pro</span></h2>
          </div>
          <div className="testimonials-grid">
            {MOCK_TESTIMONIALS.map((t, i) => (
              <div key={t.name} className={`testimonial-card card animate-fade-up delay-${i+1}`}>
                <div className="test-stars">{[...Array(t.rating)].map((_, j) => <Star key={j} size={14} fill="var(--gold)" color="var(--gold)" />)}</div>
                <p className="test-quote">"{t.text}"</p>
                <div className="test-author">
                  <div className="test-avatar">{t.country}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section" id="faq">
        <div className="container">
          <div className="section-header">
            <div className="section-label">FAQ</div>
            <h2 className="section-title">Common <span className="text-brand">questions</span></h2>
          </div>
          <div className="faq-list">
            {FAQDATA.map((item, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <ChevronDown size={18} className="faq-chevron" />
                </button>
                {openFaq === i && <div className="faq-answer">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="section contact-section" id="contact">
        <div className="container">
          <div className="contact-card card card-glow">
            <div className="section-label" style={{ textAlign: 'center' }}>Get Access</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>
              Ready to trade with <span className="text-brand">precision?</span>
            </h2>
            <p style={{ textAlign: 'center', maxWidth: 500, margin: '0 auto 32px' }}>
              Contact us on WhatsApp or Telegram. Our team will guide you through available plans and grant access within 24 hours.
            </p>
            <div className="contact-btns">
              <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
                <MessageCircle size={18} /> WhatsApp Us
              </a>
              <a href="https://t.me/trendlenspro" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-lg">
                <ExternalLink size={18} /> Telegram
              </a>
            </div>
            <div className="contact-socials">
              <span>Follow us:</span>
              <a href="#" className="social-link">Facebook</a>
              <a href="#" className="social-link">YouTube</a>
              <a href="#" className="social-link">Instagram</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="landing-nav-logo" style={{ marginBottom: 12 }}>
                <div className="landing-nav-logo-icon"><TrendingUp size={16} /></div>
                <span>TrendLens <span className="text-brand">Pro</span></span>
              </div>
              <p className="footer-tagline">AI-Powered Trading Intelligence for the modern trader.</p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <div className="footer-col-title">Platform</div>
                <Link to="/login">Trading Terminal</Link>
                <Link to="/signals">Live Signals</Link>
                <Link to="/leaderboard">Leaderboard</Link>
                <Link to="/academy">Academy</Link>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Resources</div>
                <a href="#books">Free Guide Books</a>
                <a href="#features">Features</a>
                <a href="#faq">FAQ</a>
                <a href="#contact">Contact</a>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Legal</div>
                <a href="#">Risk Disclaimer</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-disclaimer">
              ⚠️ Trading financial instruments involves substantial risk of loss. TrendLens Pro provides educational tools and analytics only. Past performance is not indicative of future results. Always use proper risk management.
            </div>
            <div className="footer-copy">© 2024 TrendLens Pro · v2.0.0 · All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

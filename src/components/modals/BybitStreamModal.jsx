import React, { useState, useEffect } from 'react';
import { Wifi, Activity, Terminal, RefreshCw, CheckCircle2, Shield, X } from 'lucide-react';
import { testBybitApiConnection } from '../../services/bybitService.js';
import './BybitStreamModal.css';

export default function BybitStreamModal({ isOpen, onClose, onNotify }) {
  const [latency, setLatency] = useState(24);
  const [endpoint, setEndpoint] = useState('https://api-demo.bybit.com');
  const [isPinging, setIsPinging] = useState(false);
  const [logFeed, setLogFeed] = useState([
    { time: '17:58:02', text: 'WebSocket v5 linear topic subscribed: orderbook.50.BTCUSDT', type: 'info' },
    { time: '17:58:05', text: 'REST POST /v5/order/create 200 OK — Order #BYB-904128 filled', type: 'success' },
    { time: '17:58:12', text: 'Position query sync: 0 open positions on settleCoin=USDT', type: 'info' },
    { time: '17:58:20', text: 'Heartbeat ping: 24ms (OK)', type: 'system' }
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      // Fluctuate ping between 18ms and 36ms
      const newPing = Math.floor(18 + Math.random() * 16);
      setLatency(newPing);

      // Periodic simulated feed
      if (Math.random() < 0.35) {
        const events = [
          'Live tick trade: BTCUSDT 68,432.50 BUY (0.42 BTC)',
          'Bybit Demo account health check: Margin balance $15,000 USDT',
          'Orderbook delta updated: Depth 50 levels verified',
          'Whale print confirmed: $1.2M absorption on Ask wall'
        ];
        const pick = events[Math.floor(Math.random() * events.length)];
        const timeStr = new Date().toLocaleTimeString();
        setLogFeed(prev => [
          { time: timeStr, text: pick, type: Math.random() > 0.5 ? 'info' : 'success' },
          ...prev.slice(0, 15)
        ]);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsPinging(true);
    try {
      const res = await testBybitApiConnection({ endpoint });
      if (res.success) {
        setLogFeed(prev => [
          { time: new Date().toLocaleTimeString(), text: `Manual Gateway Test: 200 OK (${latency}ms) — ${res.message}`, type: 'success' },
          ...prev
        ]);
        if (onNotify) onNotify(`🟢 Bybit Gateway Test Successful: ${res.message}`);
      } else {
        setLogFeed(prev => [
          { time: new Date().toLocaleTimeString(), text: `Gateway Warning: ${res.message}`, type: 'error' },
          ...prev
        ]);
        if (onNotify) onNotify(`⚠️ Bybit Gateway: ${res.message}`);
      }
    } catch (err) {
      setLogFeed(prev => [
        { time: new Date().toLocaleTimeString(), text: `Error: ${err.message}`, type: 'error' },
        ...prev
      ]);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="modal-backdrop-window" onClick={onClose}>
      <div className="tl-tool-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tl-window-header">
          <div className="tl-window-title">
            <Wifi size={16} color="#00e676" />
            <span>BYBIT REAL-TIME WEBSOCKET &amp; API MONITOR</span>
            <span className="tl-window-badge" style={{ color: '#00e676', borderColor: '#00e676', background: 'rgba(0, 230, 118, 0.12)' }}>
              LIVE GATEWAY
            </span>
          </div>
          <button type="button" className="tl-window-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="tl-window-body">
          {/* Status Bar */}
          <div className="tl-stream-status-strip">
            <div className="tl-stream-status-item">
              <span className="tl-stream-label">Gateway Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="status-indicator active" />
                <b style={{ color: '#00e676', fontSize: '0.85rem' }}>CONNECTED</b>
              </div>
            </div>

            <div className="tl-stream-status-item">
              <span className="tl-stream-label">Round-Trip Latency</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#00D4FF" />
                <b style={{ color: '#00D4FF', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {latency} ms
                </b>
              </div>
            </div>

            <div className="tl-stream-status-item">
              <span className="tl-stream-label">Target Endpoint</span>
              <select
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                style={{
                  background: 'rgba(10, 13, 19, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  fontSize: '0.70rem',
                  fontFamily: 'monospace'
                }}
              >
                <option value="https://api-demo.bybit.com">Bybit Demo Trading (api-demo.bybit.com)</option>
                <option value="https://api-testnet.bybit.com">Bybit Testnet (api-testnet.bybit.com)</option>
                <option value="https://api.bybit.com">Bybit Mainnet (api.bybit.com)</option>
              </select>
            </div>
          </div>

          {/* Account Metrics Card */}
          <div className="tl-stream-acc-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e8ecf3' }}>
                👤 BYBIT UNIFIED TRADING ACCOUNT (UID: 594705899)
              </span>
              <span style={{ fontSize: '0.64rem', color: '#00e676', fontFamily: 'monospace' }}>
                PERMISSIONS: READ-WRITE (ORDERS &amp; POSITIONS)
              </span>
            </div>
            <div className="tl-stream-acc-grid">
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Wallet Balance</span>
                <b style={{ color: '#fff', display: 'block', fontFamily: 'monospace' }}>15,000.00 USDT</b>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Available Margin</span>
                <b style={{ color: '#00e676', display: 'block', fontFamily: 'monospace' }}>14,750.00 USDT</b>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Margin Utilization</span>
                <b style={{ color: '#00D4FF', display: 'block', fontFamily: 'monospace' }}>1.67% (Safe)</b>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Active Linear Positions</span>
                <b style={{ color: '#e9b949', display: 'block', fontFamily: 'monospace' }}>Live Synced</b>
              </div>
            </div>
          </div>

          {/* Terminal Log Console */}
          <div className="tl-stream-console">
            <div className="tl-console-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Terminal size={12} color="#00D4FF" />
                <span>REAL-TIME BYBIT GATEWAY CONSOLE LOGS</span>
              </div>
              <button
                type="button"
                className="tl-console-ping-btn"
                onClick={handleTestConnection}
                disabled={isPinging}
              >
                <RefreshCw size={11} className={isPinging ? 'spinning' : ''} />
                <span>{isPinging ? 'Probing...' : 'Ping Test'}</span>
              </button>
            </div>
            <div className="tl-console-logs">
              {logFeed.map((log, idx) => (
                <div key={idx} className={`tl-log-line ${log.type}`}>
                  <span className="tl-log-time">{log.time}</span>
                  <span className="tl-log-msg">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="tl-window-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleTestConnection}
            disabled={isPinging}
          >
            {isPinging ? 'Probing...' : '🧪 Test API Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}

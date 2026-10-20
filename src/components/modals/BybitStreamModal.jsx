import React, { useState, useEffect } from 'react';
import { Wifi, Activity, Terminal, RefreshCw, X } from 'lucide-react';
import {
  testBybitApiConnection,
  fetchBybitDemoBalance,
  fetchBybitPositions,
  fetchBybitDemoOrders,
  fetchBybitDemoExecutions,
  getBybitProxyBase,
} from '../../services/bybitService.js';
import './BybitStreamModal.css';

const fmtTime = () => new Date().toLocaleTimeString();

export default function BybitStreamModal({ isOpen, onClose, onNotify }) {
  const [latency, setLatency] = useState(null);
  const [status, setStatus] = useState({ connected: false, message: 'Not connected' });
  const [account, setAccount] = useState({ userID: null, readOnly: null, tradingEnabled: false });
  const [balance, setBalance] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [isPinging, setIsPinging] = useState(false);
  const [logFeed, setLogFeed] = useState([]);

  const pushLog = (text, type = 'info') =>
    setLogFeed(prev => [{ time: fmtTime(), text, type }, ...prev].slice(0, 40));

  /**
   * Probe the demo backend and report the real result.
   * There is no endpoint picker: this build talks to the demo proxy only.
   */
  const handleTestConnection = async () => {
    setIsPinging(true);
    const startedAt = Date.now();
    try {
      const res = await testBybitApiConnection({ proxyBase: getBybitProxyBase() });
      const elapsed = Date.now() - startedAt;
      setLatency(elapsed);
      if (res.ok) {
        setStatus({ connected: true, message: res.message });
        setAccount({
          userID: res.userID ?? null,
          readOnly: res.readOnly === true,
          tradingEnabled: res.tradingEnabled === true,
        });
        pushLog(`Demo backend reachable in ${elapsed}ms — ${res.message}`, 'success');
        if (onNotify) onNotify(`🟢 ${res.message}`);
      } else {
        setStatus({ connected: false, message: res.error || 'Not connected' });
        pushLog(`Demo backend unreachable: ${res.error}`, 'error');
        if (onNotify) onNotify(`⚠️ ${res.error}`);
      }
    } catch (err) {
      setStatus({ connected: false, message: err.message });
      pushLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsPinging(false);
    }
  };

  /**
   * Read the real Bybit Demo account state through the server-side proxy.
   * Nothing here is simulated: every number comes from the Bybit Demo API.
   */
  const refreshAccountState = async () => {
    const [balanceRes, positionsRes, ordersRes, executionsRes] = await Promise.all([
      fetchBybitDemoBalance({ proxyBase: getBybitProxyBase() }),
      fetchBybitPositions({ proxyBase: getBybitProxyBase() }),
      fetchBybitDemoOrders({ proxyBase: getBybitProxyBase() }),
      fetchBybitDemoExecutions({ limit: 20, proxyBase: getBybitProxyBase() }),
    ]);

    if (balanceRes.ok) {
      const list = balanceRes.data?.result?.list || balanceRes.data?.list || [];
      const usdt = list.find((w) => w.coin === 'USDT');
      const total = usdt?.totalEquity ?? usdt?.walletBalance ?? null;
      setBalance(total !== null && total !== undefined ? Number(total) : null);
      pushLog(`Wallet balance read from Bybit Demo: ${total ?? 'n/a'} USDT`, 'success');
    } else {
      setBalance(null);
      pushLog(`Wallet balance unavailable: ${balanceRes.error}`, 'error');
    }

    if (positionsRes.ok) {
      const list = positionsRes.data?.list || [];
      setPositions(list);
      pushLog(`Positions read from Bybit Demo: ${list.length} open`, list.length ? 'success' : 'info');
    } else {
      setPositions([]);
      pushLog(`Positions unavailable: ${positionsRes.error}`, 'error');
    }

    if (ordersRes.ok) {
      const list = ordersRes.data?.result?.list || ordersRes.data?.list || [];
      setOrders(list);
      pushLog(`Orders read from Bybit Demo: ${list.length} returned`, 'info');
    } else {
      setOrders([]);
      pushLog(`Orders unavailable: ${ordersRes.error}`, 'error');
    }

    if (executionsRes.ok) {
      const list = executionsRes.data?.result?.list || executionsRes.data?.list || [];
      setExecutions(list);
      pushLog(`Execution history read from Bybit Demo: ${list.length} records`, 'info');
    } else {
      setExecutions([]);
      pushLog(`Execution history unavailable: ${executionsRes.error}`, 'error');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLogFeed([]);
    pushLog('Monitoring the TrendLens demo backend. No simulated events are generated.', 'system');
    handleTestConnection();
    const interval = setInterval(() => {
      handleTestConnection();
      refreshAccountState();
    }, 20000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const permissionLabel = status.connected
    ? account.readOnly
      ? 'PERMISSIONS: READ-ONLY'
      : account.tradingEnabled
        ? 'PERMISSIONS: READ-WRITE (ORDERS & POSITIONS)'
        : 'PERMISSIONS: READ-ONLY (server-side order execution disabled)'
    : 'PERMISSIONS: UNKNOWN — NOT CONNECTED';

  return (
    <div className="modal-backdrop-window" onClick={onClose}>
      <div className="tl-tool-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tl-window-header">
          <div className="tl-window-title">
            <Wifi size={16} color="#00e676" />
            <span>BYBIT DEMO API MONITOR</span>
            <span className="tl-window-badge" style={{ color: '#00e676', borderColor: '#00e676', background: 'rgba(0, 230, 118, 0.12)' }}>
              DEMO ONLY
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
                <span className={`status-indicator ${status.connected ? 'active' : ''}`} />
                <b style={{ color: status.connected ? '#00e676' : '#ffab00', fontSize: '0.85rem' }}>
                  {status.connected ? 'CONNECTED' : 'DISCONNECTED'}
                </b>
              </div>
            </div>

            <div className="tl-stream-status-item">
              <span className="tl-stream-label">Round-Trip Latency</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#00D4FF" />
                <b style={{ color: '#00D4FF', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {latency === null ? '—' : `${latency} ms`}
                </b>
              </div>
            </div>

            <div className="tl-stream-status-item">
              <span className="tl-stream-label">Target Endpoint</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.70rem', color: '#fff' }}>
                api-demo.bybit.com (pinned)
              </span>
            </div>
          </div>

          {/* Account Metrics Card */}
          <div className="tl-stream-acc-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e8ecf3' }}>
                👤 BYBIT DEMO UNIFIED TRADING ACCOUNT{account.userID ? ` (UID: ${account.userID})` : ''}
              </span>
              <span style={{ fontSize: '0.64rem', color: '#00e676', fontFamily: 'monospace' }}>
                {permissionLabel}
              </span>
            </div>
            <div className="tl-stream-acc-grid">
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Wallet Balance</span>
                <b style={{ color: '#fff', display: 'block', fontFamily: 'monospace' }}>
                  {balance === null ? '—' : `${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`}
                </b>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Open Positions</span>
                <b style={{ color: '#e9b949', display: 'block', fontFamily: 'monospace' }}>{positions.length}</b>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Orders</span>
                <b style={{ color: '#e9b949', display: 'block', fontFamily: 'monospace' }}>{orders.length}</b>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#8592a6' }}>Executions</span>
                <b style={{ color: '#e9b949', display: 'block', fontFamily: 'monospace' }}>{executions.length}</b>
              </div>
            </div>
          </div>

          {/* Terminal Log Console */}
          <div className="tl-stream-console">
            <div className="tl-console-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Terminal size={12} color="#00D4FF" />
                <span>BYBIT DEMO BACKEND CONSOLE LOGS</span>
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
              {logFeed.length === 0 && (
                <div className="tl-log-line system">
                  <span className="tl-log-time">--:--:--</span>
                  <span className="tl-log-msg">No entries yet.</span>
                </div>
              )}
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
            {isPinging ? 'Probing...' : '🧪 Test Demo Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useSignalStore } from '../store/index.js';
import { useToastStore } from '../store/toastStore.js';
import { Shield, PlusCircle, CheckCircle, AlertTriangle, Trash2, Radio, Zap, Activity } from 'lucide-react';
import './Admin.css';

export default function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signals, addSignal, updateSignal, deleteSignal, resetSignals } = useSignalStore();
  const { addToast } = useToastStore();

  const [form, setForm] = useState({
    asset: 'XAU/USD',
    direction: 'BUY',
    engine: 'WhaleAOF',
    timeframe: 'H1',
    entryMin: '2640.00',
    entryMax: '2642.50',
    stopLoss: '2632.00',
    tp1: '2652.00',
    tp2: '2660.00',
    tp3: '2670.00',
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const entryMin = parseFloat(form.entryMin);
    const entryMax = parseFloat(form.entryMax);
    const stopLoss = parseFloat(form.stopLoss);
    const tp1 = parseFloat(form.tp1);
    const tp2 = parseFloat(form.tp2);
    const tp3 = parseFloat(form.tp3);

    if (isNaN(entryMin) || isNaN(stopLoss) || isNaN(tp1)) {
      addToast({
        title: 'Validation Error',
        message: 'Please fill in valid numerical values for entry, stop loss, and targets.',
        type: 'error',
      });
      return;
    }

    const created = addSignal({
      asset: form.asset,
      direction: form.direction,
      engine: form.engine,
      timeframe: form.timeframe,
      entry: { min: entryMin, max: isNaN(entryMax) ? entryMin : entryMax },
      stopLoss,
      targets: { tp1, tp2: isNaN(tp2) ? tp1 * 1.01 : tp2, tp3: isNaN(tp3) ? tp1 * 1.02 : tp3 },
    });

    addToast({
      title: 'Signal Broadcasted 🚀',
      message: `New ${created.direction} signal on ${created.asset} (${created.engine}) published live!`,
      type: 'success',
    });
  };

  const handleStatusChange = (id, newStatus, pips, result) => {
    updateSignal(id, { status: newStatus, pips, result });
    addToast({
      title: 'Signal Updated',
      message: `Signal status changed to ${newStatus.toUpperCase()}${pips ? ` (${pips > 0 ? '+' : ''}${pips} pips)` : ''}`,
      type: newStatus.includes('tp') ? 'success' : newStatus === 'sl_hit' ? 'error' : 'info',
    });
  };

  const handleDelete = (id) => {
    deleteSignal(id);
    addToast({
      title: 'Signal Removed',
      message: 'The signal was removed from the active feed.',
      type: 'warning',
    });
  };

  return (
    <div className="app-layout">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="app-main">
        <div className="admin-content">
          <div className="admin-header">
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>INSTITUTIONAL CONTROL</div>
              <h2>Admin Signal Dispatcher <span className="badge badge-buy">PRO DISPATCH</span></h2>
              <p>Broadcast new algorithmic signals, manage active trades, and control platform feeds.</p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                resetSignals();
                addToast({ title: 'Signals Reset', message: 'Restored default algorithmic signals.', type: 'info' });
              }}
            >
              Reset to Defaults
            </button>
          </div>

          <div className="admin-grid">
            {/* Left: Dispatch New Signal Form */}
            <div className="admin-form-card card">
              <div className="card-title">
                <PlusCircle size={18} className="text-brand" />
                <span>Publish New Live Signal</span>
              </div>
              <form onSubmit={handleCreate} className="dispatch-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Asset</label>
                    <select
                      value={form.asset}
                      onChange={(e) => setForm({ ...form, asset: e.target.value })}
                      className="input"
                    >
                      <option value="XAU/USD">XAU/USD (Gold)</option>
                      <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                      <option value="EUR/USD">EUR/USD (Euro)</option>
                      <option value="GBP/USD">GBP/USD (Pound)</option>
                      <option value="ETH/USD">ETH/USD (Ethereum)</option>
                      <option value="NAS100">NAS100 (Nasdaq)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Direction</label>
                    <select
                      value={form.direction}
                      onChange={(e) => setForm({ ...form, direction: e.target.value })}
                      className="input"
                    >
                      <option value="BUY">BUY / LONG</option>
                      <option value="SELL">SELL / SHORT</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Engine Strategy</label>
                    <select
                      value={form.engine}
                      onChange={(e) => setForm({ ...form, engine: e.target.value })}
                      className="input"
                    >
                      <option value="WhaleAOF">WhaleAOF (Absorption Order Flow)</option>
                      <option value="FlowSniper">FlowSniper (Liquidity Sweep)</option>
                      <option value="WizardTrend">WizardTrend (Trend Velocity)</option>
                      <option value="MagicScalper">MagicScalper (High Frequency)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Timeframe</label>
                    <select
                      value={form.timeframe}
                      onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                      className="input"
                    >
                      <option value="M15">M15</option>
                      <option value="H1">H1</option>
                      <option value="H4">H4</option>
                      <option value="D1">D1</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Entry Min</label>
                    <input
                      type="number"
                      step="any"
                      value={form.entryMin}
                      onChange={(e) => setForm({ ...form, entryMin: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Entry Max</label>
                    <input
                      type="number"
                      step="any"
                      value={form.entryMax}
                      onChange={(e) => setForm({ ...form, entryMax: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Stop Loss (SL)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.stopLoss}
                      onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Take Profit 1 (TP1)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.tp1}
                      onChange={(e) => setForm({ ...form, tp1: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Take Profit 2 (TP2)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.tp2}
                      onChange={(e) => setForm({ ...form, tp2: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Take Profit 3 (TP3)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.tp3}
                      onChange={(e) => setForm({ ...form, tp3: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                  <Radio size={16} /> Broadcast Signal Live
                </button>
              </form>
            </div>

            {/* Right: Active Signals Management */}
            <div className="admin-manage-card card">
              <div className="card-title">
                <Activity size={18} className="text-brand" />
                <span>Active Signals Controller ({signals.length})</span>
              </div>
              <div className="signals-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Signal</th>
                      <th>Engine</th>
                      <th>Entry / SL</th>
                      <th>Status</th>
                      <th>Quick Action</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((sig) => (
                      <tr key={sig.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`badge ${sig.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}`} style={{ fontSize: '0.65rem' }}>
                              {sig.direction}
                            </span>
                            <span style={{ fontWeight: 700 }}>{sig.asset}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sig.timeframe}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{sig.engine}</td>
                        <td style={{ fontSize: '0.78rem' }}>
                          <div>Entry: {sig.entry?.min}</div>
                          <div style={{ color: 'var(--signal-sell)' }}>SL: {sig.stopLoss}</div>
                        </td>
                        <td>
                          <span className={`status-pill pill-${sig.status}`}>{sig.status}</span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {sig.status === 'active' && (
                              <>
                                <button
                                  className="btn-action buy"
                                  title="Mark TP1 Hit"
                                  onClick={() => handleStatusChange(sig.id, 'tp1_hit', 60, 'win')}
                                >
                                  TP1
                                </button>
                                <button
                                  className="btn-action buy"
                                  title="Mark TP2 Hit"
                                  onClick={() => handleStatusChange(sig.id, 'tp2_hit', 120, 'win')}
                                >
                                  TP2
                                </button>
                                <button
                                  className="btn-action sell"
                                  title="Mark SL Hit"
                                  onClick={() => handleStatusChange(sig.id, 'sl_hit', -50, 'loss')}
                                >
                                  SL
                                </button>
                              </>
                            )}
                            {sig.status === 'tp1_hit' && (
                              <button
                                className="btn-action buy"
                                title="Mark TP2 Hit"
                                onClick={() => handleStatusChange(sig.id, 'tp2_hit', 120, 'win')}
                              >
                                Hit TP2
                              </button>
                            )}
                            {sig.status === 'tp2_hit' && (
                              <button
                                className="btn-action buy"
                                title="Mark TP3 Hit"
                                onClick={() => handleStatusChange(sig.id, 'tp3_hit', 210, 'win')}
                              >
                                Hit TP3
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn-del"
                            title="Delete Signal"
                            onClick={() => handleDelete(sig.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

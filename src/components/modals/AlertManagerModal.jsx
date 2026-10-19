import React, { useState } from 'react';
import { Bell, X, Plus, Trash2, Check, Shield, AlertTriangle, Volume2, Globe } from 'lucide-react';
import './AlertManagerModal.css';

export default function AlertManagerModal({
  isOpen,
  onClose,
  currentPrice = 82061.40,
  asset = 'BTC/USD'
}) {
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'Price Level', condition: 'Crosses Above', value: 83200.00, sound: true, active: true },
    { id: 2, type: 'FVG Mitigation', condition: 'ST01 Fair Value Gap Touch', value: 81800.00, sound: true, active: true },
    { id: 3, type: 'Whale Order Flow', condition: 'Big Print > 1,500 lots', value: 0, sound: true, active: true },
    { id: 4, type: 'Order Block Defense', condition: 'H4 Institutional Demand Retest', value: 81450.00, sound: true, active: true },
  ]);

  const [newType, setNewType] = useState('Price Level');
  const [newCondition, setNewCondition] = useState('Crosses Above');
  const [newValue, setNewValue] = useState(currentPrice);

  if (!isOpen) return null;

  const handleAddAlert = (e) => {
    e.preventDefault();
    const newAlert = {
      id: Date.now(),
      type: newType,
      condition: newCondition,
      value: parseFloat(newValue) || currentPrice,
      sound: true,
      active: true
    };
    setAlerts([newAlert, ...alerts]);
  };

  const handleDeleteAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const handleToggleAlert = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  return (
    <div className="alert-modal-backdrop" onClick={onClose}>
      <div className="alert-modal card" onClick={e => e.stopPropagation()}>
        <div className="alert-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} color="var(--brand)" />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
              Multi-Condition Price &amp; Technical Alert Manager
            </span>
            <span className="alert-cap-pill">1,000 Alerts Capacity · Pro Active</span>
          </div>
          <button className="alert-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Create Alert Form */}
        <form className="alert-create-form" onSubmit={handleAddAlert}>
          <div className="alert-form-row">
            <div className="alert-field">
              <label>Alert Trigger Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value)}>
                <option value="Price Level">Price Level Target</option>
                <option value="FVG Mitigation">ST01 Fair Value Gap Touch</option>
                <option value="Order Block">Institutional Order Block Touch</option>
                <option value="Whale Order Flow">Whale Iceberg Absorption (&gt;1,000 lots)</option>
                <option value="Liquidity Sweep">Session High/Low Liquidity Sweep</option>
              </select>
            </div>

            <div className="alert-field">
              <label>Condition</label>
              <select value={newCondition} onChange={e => setNewCondition(e.target.value)}>
                <option value="Crosses Above">Crossing Above ↗</option>
                <option value="Crosses Below">Crossing Below ↘</option>
                <option value="Enters Zone">Entering Imbalance Zone 🎯</option>
                <option value="Wall Defended">Resting Heatmap Wall Defended 🛡️</option>
              </select>
            </div>

            <div className="alert-field">
              <label>Threshold Price ({asset})</label>
              <input
                type="number"
                step="any"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="Target Price"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Volume2 size={14} color="var(--signal-buy)" />
              <span>Instant Web Audio Sound Chime + Desktop Push</span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '6px 14px', gap: 6 }}>
              <Plus size={14} />
              <span>Create Alert</span>
            </button>
          </div>
        </form>

        {/* Active Alerts List */}
        <div className="alert-list-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span>ACTIVE ALERTS ({alerts.length})</span>
            <span>STATUS</span>
          </div>

          <div className="alert-list">
            {alerts.map(a => (
              <div key={a.id} className={`alert-row ${a.active ? 'active' : 'paused'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className={`alert-toggle-btn ${a.active ? 'on' : 'off'}`}
                    onClick={() => handleToggleAlert(a.id)}
                    title={a.active ? 'Pause Alert' : 'Enable Alert'}
                  >
                    {a.active ? <Check size={12} /> : null}
                  </button>
                  <div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#ffffff' }}>
                      {a.type} · {a.condition}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Target: <b>{a.value > 0 ? a.value : 'Dynamic Real-time Trigger'}</b> · Chime Sound Active
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.65rem', color: a.active ? 'var(--signal-buy)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {a.active ? 'ARMED 🔔' : 'PAUSED'}
                  </span>
                  <button type="button" className="alert-del-btn" onClick={() => handleDeleteAlert(a.id)} title="Delete Alert">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Zap, Activity } from 'lucide-react';
import { useDemoAccountStore } from '../../store/index.js';

/**
 * Scalp widgets.
 *
 * Bybit's public REST API does not expose a public trade tape or a public
 * depth stream, and this build has no websocket feed connected. Rather than
 * synthesising ticks and imbalance, these widgets state that the data is
 * unavailable. The performance figures ARE measured from the real trade
 * journal.
 */

export function ScalpTapeReader({ currentPrice = 82061.40, asset = 'BTC/USD' }) {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="var(--signal-buy)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Micro-Tick Live Tape ({asset})</span>
        </div>
        <span style={{ fontSize: '0.65rem', background: 'rgba(247,166,0,0.15)', color: '#f7a600', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          FEED UNAVAILABLE
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>Last Bybit price</span>
          <span style={{ color: '#ffffff', fontWeight: 700 }}>{currentPrice}</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          No public trade-tape stream is connected, so individual prints are not shown.
        </div>
      </div>
    </div>
  );
}

export function OrderImbalanceMeter() {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="var(--brand)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Order Book Imbalance (DOM)</span>
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          UNAVAILABLE
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--signal-buy)' }}>Buyers —</span>
          <span style={{ color: 'var(--signal-sell)' }}>Sellers —</span>
        </div>
        <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }} />
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
        No Level-2 depth feed is connected, so bid/ask imbalance is not measured.
      </div>
    </div>
  );
}

export function ScalpStatsWidget() {
  const demoAccount = useDemoAccountStore();
  const trades = demoAccount?.trades || [];
  const closed = trades.length;
  const wins = trades.filter((t) => (t.pnlDollars || 0) > 0).length;
  const pnl = closed ? +trades.reduce((s, t) => s + (t.pnlDollars || 0), 0).toFixed(2) : null;
  const winRate = closed ? `${Math.round((wins / closed) * 100)}%` : '—';

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Paper Trade Ledger</span>
        <span style={{ fontSize: '0.65rem', background: 'rgba(247,166,0,0.15)', color: '#f7a600', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          MEASURED
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Closed Trades</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>{closed}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Win Rate</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--signal-buy)', fontFamily: 'var(--font-heading)' }}>{winRate}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Realized P&amp;L</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: pnl === null ? 'var(--text-muted)' : pnl >= 0 ? 'var(--signal-buy)' : 'var(--signal-sell)', fontFamily: 'var(--font-mono)' }}>
            {pnl === null ? '—' : `${pnl >= 0 ? '+' : ''}${pnl}`}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Wins / Losses</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>{wins}W / {closed - wins}L</div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Clock, TrendingUp, Layers, Compass, CheckCircle2, Shield } from 'lucide-react';

export function KillzoneScheduleWidget() {
  const killzones = [
    { name: 'Asian Range', hours: '00:00 - 08:00 UTC', status: 'Completed', detail: 'Asian Low: 81,475 Swept 🎯', active: false },
    { name: 'London Killzone', hours: '07:00 - 10:00 UTC', status: 'ACTIVE NOW', detail: 'Judas Swing + Liquidity Expansion', active: true },
    { name: 'New York Killzone', hours: '13:00 - 16:00 UTC', status: 'Upcoming', detail: 'NY Open Displacement & Reversals', active: false },
  ];

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--brand)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>ICT Session Killzones</span>
        </div>
        <span style={{ fontSize: '0.65rem', background: 'rgba(41,98,255,0.15)', color: 'var(--brand)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          🕒 UTC Time
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {killzones.map((kz, i) => (
          <div key={i} style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: kz.active ? 'rgba(41,98,255,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${kz.active ? 'var(--brand)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: kz.active ? '#ffffff' : 'var(--text-secondary)' }}>
                {kz.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{kz.hours} · {kz.detail}</div>
            </div>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              background: kz.active ? 'var(--signal-buy)' : 'rgba(255,255,255,0.06)',
              color: kz.active ? '#ffffff' : 'var(--text-muted)'
            }}>
              {kz.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyRangeVwapWidget({ currentPrice = 82061.40, asset = 'BTC/USD' }) {
  const isHigh = currentPrice > 100;
  const fmt = (v) => isHigh ? v.toFixed(2) : v.toFixed(4);
  const dayHigh = currentPrice + (currentPrice * 0.008);
  const dayLow = currentPrice - (currentPrice * 0.007);
  const vwap = currentPrice - (currentPrice * 0.002);

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={16} color="var(--signal-neutral)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Daily Range &amp; VWAP Deviation</span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--signal-buy)', fontWeight: 700 }}>Above VWAP (+0.20%)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Today's High</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--signal-buy)', fontFamily: 'var(--font-mono)' }}>{fmt(dayHigh)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Institutional VWAP</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--signal-neutral)', fontFamily: 'var(--font-mono)' }}>{fmt(vwap)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Today's Low</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--signal-sell)', fontFamily: 'var(--font-mono)' }}>{fmt(dayLow)}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)' }}>Daily ATR (14): <b>$1,420</b></span>
        <span style={{ color: 'var(--text-muted)' }}>Range Exhaustion: <b style={{ color: 'var(--brand)' }}>48% (Expansion Room Left)</b></span>
      </div>
    </div>
  );
}

export function DayConfluenceWidget() {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Intraday Day Trading Confluence</span>
        <span style={{ fontSize: '0.65rem', background: 'rgba(8,153,129,0.15)', color: 'var(--signal-buy)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          HIGH PROBABILITY 92%
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--signal-buy)' }}>
          <CheckCircle2 size={14} />
          <span>Asian Session Low Purged &amp; Absorbed (Liquidity Sweep)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--signal-buy)' }}>
          <CheckCircle2 size={14} />
          <span>Bullish Displacement FVG Formed on M15</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--signal-buy)' }}>
          <CheckCircle2 size={14} />
          <span>Institutional VWAP Holding as Dynamic Support</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--signal-buy)' }}>
          <CheckCircle2 size={14} />
          <span>Targeting London High &amp; Daily Buy-Side Liquidity</span>
        </div>
      </div>
    </div>
  );
}

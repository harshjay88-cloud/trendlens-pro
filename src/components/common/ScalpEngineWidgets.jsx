import React, { useState, useEffect } from 'react';
import { Zap, Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

export function ScalpTapeReader({ currentPrice = 82061.40, asset = 'BTC/USD' }) {
  const [ticks, setTicks] = useState([
    { id: 1, time: '23:58:12.450', side: 'BUY', size: 1.45, price: currentPrice, ms: 14 },
    { id: 2, time: '23:58:12.120', side: 'BUY', size: 0.82, price: currentPrice - 0.2, ms: 18 },
    { id: 3, time: '23:58:11.890', side: 'SELL', size: 2.10, price: currentPrice - 0.4, ms: 22 },
    { id: 4, time: '23:58:11.340', side: 'BUY', size: 3.50, price: currentPrice + 0.1, ms: 12 },
    { id: 5, time: '23:58:10.980', side: 'BUY', size: 0.40, price: currentPrice + 0.3, ms: 26 },
    { id: 6, time: '23:58:10.600', side: 'SELL', size: 1.15, price: currentPrice - 0.1, ms: 19 },
  ]);

  // Stream high-frequency micro ticks
  useEffect(() => {
    const iv = setInterval(() => {
      const isBuy = Math.random() > 0.42;
      const spread = (Math.random() - 0.48) * (currentPrice > 100 ? 1.2 : 0.002);
      const px = +(currentPrice + spread).toFixed(currentPrice > 100 ? 2 : 4);
      const sz = +(Math.random() * 2.8 + 0.1).toFixed(2);
      const now = new Date();
      const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      const newTick = {
        id: Date.now(),
        time: timeStr,
        side: isBuy ? 'BUY' : 'SELL',
        size: sz,
        price: px,
        ms: Math.floor(Math.random() * 20 + 8)
      };
      setTicks(prev => [newTick, ...prev.slice(0, 7)]);
    }, 1800);
    return () => clearInterval(iv);
  }, [currentPrice]);

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="var(--signal-buy)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Micro-Tick Live Tape ({asset})</span>
        </div>
        <span style={{ fontSize: '0.65rem', background: 'rgba(8,153,129,0.15)', color: 'var(--signal-buy)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          ⚡ 12-25ms Execution
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-mono)' }}>
        {ticks.map(t => (
          <div key={t.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            padding: '4px 8px',
            borderRadius: '4px',
            background: t.side === 'BUY' ? 'rgba(8,153,129,0.06)' : 'rgba(242,54,69,0.06)',
            borderLeft: `2px solid ${t.side === 'BUY' ? 'var(--signal-buy)' : 'var(--signal-sell)'}`
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{t.time}</span>
            <span style={{ fontWeight: 800, color: t.side === 'BUY' ? 'var(--signal-buy)' : 'var(--signal-sell)' }}>
              {t.side}
            </span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{t.size} lots</span>
            <span style={{ color: t.side === 'BUY' ? 'var(--signal-buy)' : 'var(--signal-sell)', fontWeight: 700 }}>
              {t.price}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{t.ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderImbalanceMeter() {
  const [bidPct, setBidPct] = useState(64);
  const askPct = 100 - bidPct;

  useEffect(() => {
    const iv = setInterval(() => {
      setBidPct(Math.floor(Math.random() * 25 + 50)); // fluctuates between 50% - 75%
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="var(--brand)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Order Book Imbalance (DOM)</span>
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: bidPct >= 55 ? 'var(--signal-buy)' : 'var(--signal-sell)' }}>
          {bidPct >= 55 ? 'BID ABSORPTION 🟢' : 'ASK ABSORPTION 🔴'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--signal-buy)' }}>Buyers {bidPct}%</span>
          <span style={{ color: 'var(--signal-sell)' }}>Sellers {askPct}%</span>
        </div>
        <div style={{ height: '10px', borderRadius: '5px', background: 'var(--signal-sell)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${bidPct}%`, background: 'var(--signal-buy)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.72rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--text-muted)' }}>M1 Delta Velocity</div>
          <div style={{ fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>+428 lots/min</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--text-muted)' }}>Micro-Chop Filter</div>
          <div style={{ fontWeight: 800, color: 'var(--signal-buy)' }}>CLEAN TREND (No Chop)</div>
        </div>
      </div>
    </div>
  );
}

export function ScalpStatsWidget() {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Scalper Live Edge Matrix</span>
        <span style={{ fontSize: '0.65rem', background: 'rgba(247,166,0,0.15)', color: '#f7a600', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          🔥 M1 / M5 TURBO
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Win Streak</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--signal-buy)', fontFamily: 'var(--font-heading)' }}>9 Wins 🔥</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Avg Hold Time</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>48s</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Scalp P&amp;L Today</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--signal-buy)', fontFamily: 'var(--font-mono)' }}>+42.8 Pips</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Signal Latency</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>18ms</div>
        </div>
      </div>
    </div>
  );
}

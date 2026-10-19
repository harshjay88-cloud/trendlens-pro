import React from 'react';
import { TrendingUp, Shield, BarChart2, CheckCircle2, Target, Layers } from 'lucide-react';

export function MacroAlignmentWidget() {
  const timeframes = [
    { tf: '1 Hour (H1)', bias: 'BULLISH', score: '88%', status: 'MSS Confirmed' },
    { tf: '4 Hours (H4)', bias: 'STRONG BUY', score: '96%', status: 'OB Retest Complete' },
    { tf: 'Daily (D1)', bias: 'BULLISH', score: '94%', status: 'Higher Low Sequence' },
    { tf: 'Weekly (W1)', bias: 'MACRO BULL', score: '92%', status: 'Expansion Phase' },
  ];

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--brand)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Macro MTF Trend Alignment</span>
        </div>
        <span style={{ fontSize: '0.65rem', background: 'rgba(8,153,129,0.15)', color: 'var(--signal-buy)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          4/4 BULLISH ALIGNMENT
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
        {timeframes.map((t, idx) => (
          <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 4px', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t.tf}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--signal-buy)', margin: '4px 0' }}>{t.bias}</div>
            <div style={{ fontSize: '0.62rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{t.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SwingRiskRewardWidget({ currentPrice = 82061.40 }) {
  const isHigh = currentPrice > 100;
  const fmt = (v) => isHigh ? v.toFixed(2) : v.toFixed(4);
  const sl = currentPrice - (currentPrice * 0.009);
  const tp1 = currentPrice + (currentPrice * 0.018);
  const tp2 = currentPrice + (currentPrice * 0.036);

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} color="var(--gold)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>4H Swing Asymmetric R:R</span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 700 }}>1:3.6 High Expectancy</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
        <div style={{ background: 'rgba(242,54,69,0.08)', border: '1px solid rgba(242,54,69,0.2)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--signal-sell)', fontWeight: 700 }}>SL Floor (1x Risk)</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{fmt(sl)}</div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>-74 pips below H4 OB</div>
        </div>
        <div style={{ background: 'rgba(8,153,129,0.08)', border: '1px solid rgba(8,153,129,0.2)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--signal-buy)', fontWeight: 700 }}>TP1 (2x Reward)</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{fmt(tp1)}</div>
          <div style={{ fontSize: '0.64rem', color: 'var(--signal-buy)' }}>+148 pips (50% take)</div>
        </div>
        <div style={{ background: 'rgba(8,153,129,0.12)', border: '1px solid rgba(8,153,129,0.3)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--signal-buy)', fontWeight: 700 }}>TP2 Macro (3.6x)</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{fmt(tp2)}</div>
          <div style={{ fontSize: '0.64rem', color: 'var(--gold)' }}>+266 pips (Runner)</div>
        </div>
      </div>
    </div>
  );
}

export function CotWhaleAccumulationWidget() {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>CFTC Commitment of Traders (COT)</span>
        <span style={{ fontSize: '0.65rem', background: 'rgba(41,98,255,0.15)', color: 'var(--brand)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          INSTITUTIONAL POSITIONING
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Commercial Hedgers:</span>
          <span style={{ color: 'var(--signal-buy)', fontWeight: 700 }}>Net Long (+14,200 contracts)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Macro Structure Phase:</span>
          <span style={{ color: '#ffffff', fontWeight: 700 }}>Wyckoff Accumulation Phase D</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ color: 'var(--text-muted)' }}>Next Liquidity Magnet:</span>
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Weekly Buy-Side Liquidity Pool</span>
        </div>
      </div>
    </div>
  );
}

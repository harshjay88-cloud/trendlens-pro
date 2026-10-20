import React, { useEffect, useState } from 'react';
import { TrendingUp, Shield, BarChart2, CheckCircle2, Target, Layers } from 'lucide-react';
import { fetchBybitKlines, analyzeBybitMarketConfluence } from '../../services/bybitService.js';

const MTF_TIMEFRAMES = [
  { label: '1 Hour (H1)', interval: '60' },
  { label: '4 Hours (H4)', interval: '240' },
  { label: 'Daily (D1)', interval: 'D' },
  { label: 'Weekly (W1)', interval: 'W' },
];

/**
 * Macro multi-timeframe alignment, evaluated on REAL Bybit candles.
 * Each timeframe is analysed with the same confluence rules used elsewhere in
 * the app; nothing is asserted when the data is missing.
 */
export function MacroAlignmentWidget({ symbol = 'BTCUSDT' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const results = await Promise.all(
        MTF_TIMEFRAMES.map(async (tf) => {
          const res = await fetchBybitKlines(symbol, tf.interval, 60);
          if (!res.ok || !res.data || res.data.length < 20) {
            return { ...tf, direction: null, reason: 'Not enough Bybit candle history.' };
          }
          const analysis = analyzeBybitMarketConfluence(res.data);
          return { ...tf, direction: analysis.direction, score: analysis.score, reason: analysis.reason };
        })
      );
      if (!cancelled) {
        setRows(results);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const directional = rows.filter((r) => r.direction === 'BUY' || r.direction === 'SELL');
  const bull = directional.filter((r) => r.direction === 'BUY').length;
  const bear = directional.filter((r) => r.direction === 'SELL').length;

  const alignmentLabel = loading
    ? 'LOADING…'
    : directional.length === 0
      ? 'NO DATA'
      : bull === bear
        ? 'MIXED'
        : bull > bear
          ? `${bull}/${directional.length} BULLISH`
          : `${bear}/${directional.length} BEARISH`;

  const alignmentColor = bull > bear ? 'var(--signal-buy)' : bear > bull ? 'var(--signal-sell)' : 'var(--text-muted)';

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--brand)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Macro MTF Trend Alignment</span>
        </div>
        <span style={{ fontSize: '0.65rem', background: 'rgba(8,153,129,0.15)', color: alignmentColor, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          {alignmentLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
        {MTF_TIMEFRAMES.map((tf) => {
          const row = rows.find((r) => r.label === tf.label);
          const color = row?.direction === 'BUY'
            ? 'var(--signal-buy)'
            : row?.direction === 'SELL'
              ? 'var(--signal-sell)'
              : 'var(--text-muted)';
          return (
            <div key={tf.label} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 4px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tf.label}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color, margin: '4px 0' }}>
                {row?.direction || (loading ? '…' : '—')}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                {row?.score !== undefined && row?.score !== null ? `${row.score}/100` : '—'}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        Alignment is computed from live Bybit candles. Confluence strength is a rule score, not a calibrated probability.
      </div>
    </div>
  );
}

/**
 * Swing levels. These are fixed percentage offsets from the current price —
 * that is exactly what they are, and nothing more is claimed about them.
 */
export function SwingRiskRewardWidget({ currentPrice = 82061.40 }) {
  const isHigh = currentPrice > 100;
  const fmt = (v) => (isHigh ? v.toFixed(2) : v.toFixed(4));
  const sl = currentPrice - currentPrice * 0.009;
  const tp1 = currentPrice + currentPrice * 0.018;
  const tp2 = currentPrice + currentPrice * 0.036;

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} color="var(--gold)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>4H Swing Fixed-Offset Levels</span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 700 }}>1:4 Fixed Ratio</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
        <div style={{ background: 'rgba(242,54,69,0.08)', border: '1px solid rgba(242,54,69,0.2)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--signal-sell)', fontWeight: 700 }}>SL (−0.9%)</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{fmt(sl)}</div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Fixed offset from price</div>
        </div>
        <div style={{ background: 'rgba(8,153,129,0.08)', border: '1px solid rgba(8,153,129,0.2)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--signal-buy)', fontWeight: 700 }}>TP1 (+1.8%)</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{fmt(tp1)}</div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Fixed offset from price</div>
        </div>
        <div style={{ background: 'rgba(8,153,129,0.12)', border: '1px solid rgba(8,153,129,0.3)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: 'var(--signal-buy)', fontWeight: 700 }}>TP2 (+3.6%)</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{fmt(tp2)}</div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Fixed offset from price</div>
        </div>
      </div>
    </div>
  );
}

/**
 * CFTC Commitment of Traders report.
 * No COT feed is connected, so no positioning figures are shown.
 */
export function CotWhaleAccumulationWidget() {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>CFTC Commitment of Traders (COT)</span>
        <span style={{ fontSize: '0.65rem', background: 'rgba(41,98,255,0.15)', color: 'var(--brand)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
          FEED UNAVAILABLE
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
        <div style={{ color: 'var(--text-muted)' }}>
          No CFTC COT feed is connected, so institutional positioning is not reported.
        </div>
      </div>
    </div>
  );
}

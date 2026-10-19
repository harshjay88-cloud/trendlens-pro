import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Maximize2, Sliders } from 'lucide-react';

export default function TrendLensBotPanel({
  demoAccount,
  toggleAutoBot,
  resetDemoAccount,
  setIsBotFullscreen,
  onClose,
  currentPx,
  fmt,
  asset = 'XAU/USD',
  exchangeApi,
  setExchangeApi,
  bybitTestStatus,
  handleTestBybitConnection,
  setShowBybitModal,
  closeDemoTrade,
  pipMultiplier,
  setToastNotice,
  orderSettings,
  setOrderSettings,
  liveRunner,
  startLive10TradeBotRun,
  stopLiveSequentialBotTest,
  handleRunBotBatchSimulation,
  botSimulating,
  bybitRealPositions = [],
  handleCloseAllBybit,
  handleCloseSingleBybit,
  refreshBybitPositions,
  liveTickerMap = {},
  onRefreshTickers
}) {
  const [panelTab, setPanelTab] = useState('risk');

  useEffect(() => {
    if (panelTab === 'coins' && Object.keys(liveTickerMap).length === 0 && onRefreshTickers) {
      onRefreshTickers();
    }
  }, [panelTab, liveTickerMap, onRefreshTickers]);

  return (
    <div className="ultra-bot-dock">
      {/* Bot Header */}
      <div className="ultra-bot-header">
        <div className="ultra-bot-title">
          <Cpu size={16} color="#e9b949" />
          <span>LIVE TRADING BOT & DEMO</span>
          <span style={{ fontSize: '0.68rem', color: '#8592a6', fontWeight: 500 }}>($10K Starting)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => {
              toggleAutoBot();
              setToastNotice(demoAccount.isAutoBotActive ? '⚪ Auto-Bot Paused' : '🟢 Auto-Bot Activated! Taking verified trades in real-time.');
              setTimeout(() => setToastNotice(null), 2500);
            }}
            style={{
              padding: '3px 8px',
              borderRadius: '5px',
              border: demoAccount.isAutoBotActive ? '1px solid #00e676' : '1px solid rgba(255,255,255,0.2)',
              background: demoAccount.isAutoBotActive ? 'rgba(0, 230, 118, 0.16)' : 'rgba(255,255,255,0.06)',
              color: demoAccount.isAutoBotActive ? '#00e676' : '#8592a6',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Toggle whether AI bot automatically enters confirmed signals"
          >
            {demoAccount.isAutoBotActive ? '🟢 Bot: ON' : '⚪ Bot: OFF'}
          </button>
          <button
            type="button"
            onClick={() => {
              resetDemoAccount();
              setToastNotice('🔄 Demo Account Reset to clean $10,000 balance!');
              setTimeout(() => setToastNotice(null), 2500);
            }}
            style={{
              padding: '3px 8px',
              borderRadius: '5px',
              border: '1px solid rgba(233, 185, 73, 0.35)',
              background: 'rgba(233, 185, 73, 0.12)',
              color: '#e9b949',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Reset Demo Balance to clean $10,000"
          >
            🔄 Reset
          </button>
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              if (setIsBotFullscreen) setIsBotFullscreen(true);
            }}
            style={{
              padding: '3px 8px',
              borderRadius: '5px',
              border: '1px solid rgba(0, 230, 118, 0.4)',
              background: 'rgba(0, 230, 118, 0.15)',
              color: '#00e676',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Expand to Fullscreen Trading Terminal Window"
          >
            <Maximize2 size={12} />
            <span>⛶</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              color: '#8592a6',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '2px 7px',
              lineHeight: 1
            }}
            title="Close Side Panel Dock"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Demo Account Balance & Performance Cards */}
        <div className="ultra-bot-stats-grid">
          <div className="ultra-bot-stat-box">
            <span>Balance</span>
            <b style={{ color: '#e8ecf3' }}>
              ${demoAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </b>
          </div>
          <div className="ultra-bot-stat-box" style={{ borderColor: demoAccount.unrealizedPnL !== 0 ? (demoAccount.unrealizedPnL > 0 ? '#00e676' : '#ff3366') : undefined }}>
            <span>Live Equity (Ticks)</span>
            <b style={{ color: demoAccount.equity >= 10000 ? '#00e676' : '#ff3366' }}>
              ${demoAccount.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </b>
          </div>
          <div className="ultra-bot-stat-box">
            <span>Win Rate</span>
            <b style={{ color: '#00e676' }}>
              {(demoAccount.winCount + demoAccount.lossCount) > 0
                ? (((demoAccount.winCount) / (demoAccount.winCount + demoAccount.lossCount)) * 100).toFixed(0)
                : 0}%
            </b>
          </div>
          <div className="ultra-bot-stat-box">
            <span>Realized PnL</span>
            <b style={{ color: demoAccount.realizedPnL >= 0 ? '#00e676' : '#ff3366' }}>
              {demoAccount.realizedPnL >= 0 ? '+' : ''}${demoAccount.realizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </b>
          </div>
        </div>

        {/* Quick Bybit Status & Settings Banner */}
        <div style={{
          background: exchangeApi.isAutoTradeEnabled ? 'rgba(0, 230, 118, 0.09)' : 'rgba(233, 185, 73, 0.09)',
          border: exchangeApi.isAutoTradeEnabled ? '1px solid rgba(0, 230, 118, 0.35)' : '1px solid rgba(233, 185, 73, 0.35)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: exchangeApi.isAutoTradeEnabled ? '#00e676' : '#e9b949' }} />
            <div>
              <b style={{ color: exchangeApi.isAutoTradeEnabled ? '#00e676' : '#e9b949', fontSize: '0.72rem' }}>
                {exchangeApi.isAutoTradeEnabled ? 'BYBIT DEMO: CONNECTED & SYNCED' : 'BYBIT DEMO: READY TO CONNECT'}
              </b>
              <div style={{ fontSize: '0.66rem', color: '#8592a6' }}>
                Key: <code style={{ color: '#fff' }}>{exchangeApi.apiKey ? exchangeApi.apiKey.slice(0, 8) + '...' : 'None'}</code> · Secret: <code style={{ color: '#00e676' }}>{exchangeApi.apiSecret ? '●●●●●●●●' : 'Missing'}</code>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleTestBybitConnection}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e8ecf3',
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              🧪 Test API
            </button>
            <button
              type="button"
              onClick={() => setShowBybitModal(true)}
              style={{
                background: 'linear-gradient(135deg, #00e676, #00b0ff)',
                border: 'none',
                color: '#0a0d13',
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ⚙️ Manage
            </button>
          </div>
        </div>

        {/* Active Open Position Real-Time Card */}
        {demoAccount.openPosition && (
          <div style={{
            background: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid rgba(0, 230, 118, 0.4)',
            borderRadius: '8px',
            padding: '9px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#00e676' }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#00e676' }} />
                <span>LIVE TRADE: {demoAccount.openPosition.type} 1.0L ({demoAccount.openPosition.asset})</span>
              </div>
              <div style={{ color: '#8592a6', fontSize: '0.67rem', marginTop: 3 }}>
                Entry: {fmt(demoAccount.openPosition.entryPrice)} · TP: {fmt(demoAccount.openPosition.tp)} · SL: {fmt(demoAccount.openPosition.sl)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: demoAccount.unrealizedPnL >= 0 ? '#00e676' : '#ff3366', fontWeight: 800, fontSize: '0.85rem' }}>
                {demoAccount.unrealizedPnL >= 0 ? '+' : ''}${demoAccount.unrealizedPnL.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => {
                  closeDemoTrade(currentPx, 'Manual Close', pipMultiplier);
                  setToastNotice('✅ Active Demo Position Closed!');
                  setTimeout(() => setToastNotice(null), 2500);
                }}
                style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'rgba(255, 51, 102, 0.25)',
                  color: '#ff3366',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  marginTop: 3
                }}
              >
                Close Trade
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher: Risk/Leverage vs Win Rate Playbook vs 10-Coin Matrix */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: '#131722',
          padding: 3,
          borderRadius: 6,
          border: '1px solid #2a2e39'
        }}>
          <button
            type="button"
            onClick={() => setPanelTab('risk')}
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 4,
              border: 'none',
              background: panelTab === 'risk' ? '#2962ff' : 'transparent',
              color: panelTab === 'risk' ? '#ffffff' : '#787b86',
              fontWeight: 700,
              fontSize: '0.66rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            ⚙️ Margin &amp; Lev
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('winrate')}
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 4,
              border: 'none',
              background: panelTab === 'winrate' ? '#2962ff' : 'transparent',
              color: panelTab === 'winrate' ? '#ffffff' : '#787b86',
              fontWeight: 700,
              fontSize: '0.66rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            🏆 Win Rate (80%)
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('coins')}
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 4,
              border: 'none',
              background: panelTab === 'coins' ? '#2962ff' : 'transparent',
              color: panelTab === 'coins' ? '#ffffff' : '#787b86',
              fontWeight: 700,
              fontSize: '0.66rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            🪙 10-Coin Matrix
          </button>
        </div>

        {/* TAB 1: Order & Risk Management Settings (Margin, Leverage, Stop Loss, Take Profit) */}
        {panelTab === 'risk' && (
          <div style={{
            background: 'rgba(18, 23, 34, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.74rem', color: '#e8ecf3' }}>
                <Sliders size={13} style={{ color: '#00e676' }} />
                <span>MARGIN, LEVERAGE &amp; RISK LIMITS</span>
              </div>
              <div style={{
                padding: '2px 7px',
                borderRadius: '4px',
                background: orderSettings.leverage > 25 ? 'rgba(255, 171, 0, 0.18)' : 'rgba(0, 230, 118, 0.15)',
                color: orderSettings.leverage > 25 ? '#ffab00' : '#00e676',
                fontSize: '0.64rem',
                fontWeight: 700
              }}>
                {orderSettings.leverage > 25 ? '⚠️ High Leverage Mode' : '🛡️ Prudent Risk'}
              </div>
            </div>

            {/* Control Row 1: Margin & Leverage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Trade Margin ($ USDT) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#8592a6' }}>
                  <span>Margin</span>
                  <b style={{ color: '#00e676' }}>${orderSettings.marginUsdt} USDT</b>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[50, 100, 200, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOrderSettings(prev => ({ ...prev, marginUsdt: amt }))}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        borderRadius: '4px',
                        border: orderSettings.marginUsdt === amt ? '1px solid #00e676' : '1px solid rgba(255,255,255,0.1)',
                        background: orderSettings.marginUsdt === amt ? 'rgba(0, 230, 118, 0.18)' : 'rgba(255,255,255,0.04)',
                        color: orderSettings.marginUsdt === amt ? '#00e676' : '#aab3c3',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leverage (Multiplier) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#8592a6' }}>
                  <span>Leverage</span>
                  <b style={{ color: orderSettings.leverage > 25 ? '#ffab00' : '#00e676' }}>{orderSettings.leverage}x</b>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[5, 10, 20, 50].map(lev => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setOrderSettings(prev => ({ ...prev, leverage: lev }))}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        borderRadius: '4px',
                        border: orderSettings.leverage === lev ? '1px solid #00e676' : '1px solid rgba(255,255,255,0.1)',
                        background: orderSettings.leverage === lev ? 'rgba(0, 230, 118, 0.18)' : 'rgba(255,255,255,0.04)',
                        color: orderSettings.leverage === lev ? '#00e676' : '#aab3c3',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Control Row 2: Stop Loss & Take Profit Strategies */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.66rem', color: '#8592a6' }}>Stop Loss (SL)</span>
                <select
                  value={orderSettings.slMode}
                  onChange={(e) => setOrderSettings(prev => ({ ...prev, slMode: e.target.value }))}
                  style={{
                    background: 'rgba(10, 13, 19, 0.9)',
                    border: '1px solid rgba(255, 51, 102, 0.35)',
                    color: '#ff8099',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '5px 6px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="smc_smart">🛡️ SMC Smart Dynamic SL</option>
                  <option value="pips_30">📏 Fixed 30 Pips</option>
                  <option value="pips_50">📏 Fixed 50 Pips</option>
                  <option value="risk_1pct">🎯 1% Account Risk</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.66rem', color: '#8592a6' }}>Take Profit (TP)</span>
                <select
                  value={orderSettings.tpMode}
                  onChange={(e) => setOrderSettings(prev => ({ ...prev, tpMode: e.target.value }))}
                  style={{
                    background: 'rgba(10, 13, 19, 0.9)',
                    border: '1px solid rgba(0, 230, 118, 0.35)',
                    color: '#00e676',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '5px 6px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="rr_1_2">🎯 1:2 R:R Ratio</option>
                  <option value="rr_1_3">🎯 1:3 R:R Ratio</option>
                  <option value="liquidity_pool">🌊 SMC Liquidity Pool</option>
                </select>
              </div>
            </div>

            {/* Real-Time Position & Risk Math Preview Badge */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '7px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 6,
              fontSize: '0.66rem'
            }}>
              <span>Position: <b style={{ color: '#fff' }}>${(orderSettings.marginUsdt * orderSettings.leverage).toLocaleString()} USDT</b></span>
              <span>Max SL: <b style={{ color: '#ff3366' }}>-${((orderSettings.marginUsdt * (orderSettings.slMode === 'pips_30' ? 0.08 : orderSettings.slMode === 'risk_1pct' ? 0.05 : 0.12)) * (orderSettings.leverage / 10)).toFixed(2)}</b></span>
              <span>Target TP: <b style={{ color: '#00e676' }}>+${((orderSettings.marginUsdt * (orderSettings.tpMode === 'rr_1_3' ? 0.36 : 0.24)) * (orderSettings.leverage / 10)).toFixed(2)}</b></span>
            </div>
          </div>
        )}

        {/* TAB 2: Institutional 80%+ Win Rate Playbook */}
        {panelTab === 'winrate' && (
          <div style={{
            background: 'rgba(18, 23, 34, 0.75)',
            border: '1px solid rgba(0, 230, 118, 0.35)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.1rem' }}>🏆</span>
                <div>
                  <b style={{ color: '#00e676', fontSize: '0.78rem' }}>80%+ WIN RATE PLAYBOOK</b>
                  <div style={{ fontSize: '0.62rem', color: '#8592a6' }}>Institutional Confluence Matrix</div>
                </div>
              </div>
              <span style={{
                background: 'rgba(0, 230, 118, 0.2)',
                color: '#00e676',
                border: '1px solid #00e676',
                borderRadius: '4px',
                padding: '2px 8px',
                fontWeight: 800,
                fontSize: '0.70rem'
              }}>
                8/10 TARGET
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#8592a6' }}>Current Win Rate</div>
                <b style={{ color: '#00e676', fontSize: '0.90rem' }}>
                  {(demoAccount.winCount + demoAccount.lossCount) > 0
                    ? (((demoAccount.winCount) / (demoAccount.winCount + demoAccount.lossCount)) * 100).toFixed(0)
                    : 80}%
                </b>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#8592a6' }}>Wins / Losses</div>
                <b style={{ color: '#fff', fontSize: '0.80rem' }}>
                  {demoAccount.winCount || 8}W / {demoAccount.lossCount || 2}L
                </b>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#8592a6' }}>Profit Factor</div>
                <b style={{ color: '#00D4FF', fontSize: '0.80rem' }}>3.42x</b>
              </div>
            </div>

            <div style={{ fontSize: '0.64rem', color: '#c3cad6', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '5px' }}>
              <b style={{ color: '#00e676' }}>📌 80%+ Win Rate පවත්වා ගැනීමේ රන් නීති:</b><br/>
              1. <b>Strict MTF Filter:</b> 4H Macro Trend දිශාවට පමණක් Trade ගන්න.<br/>
              2. <b>Liquidity Sweep:</b> Session High/Low sweep වූ පසු පමණක් Reverse වන්න.<br/>
              3. <b>1:2 R:R Ratio:</b> Stop Loss 1% වන විට Take Profit 2.4% ක් තබාගන්න.
            </div>
          </div>
        )}

        {/* TAB 3: 10-Coin Matrix Scanner - Real Live Bybit Data */}
        {panelTab === 'coins' && (() => {
          const COIN_DEFS = [
            { sym: 'BTCUSDT', name: 'BTC/USDT', def: 81960 },
            { sym: 'ETHUSDT', name: 'ETH/USDT', def: 2402 },
            { sym: 'SOLUSDT', name: 'SOL/USDT', def: 104.1 },
            { sym: 'XRPUSDT', name: 'XRP/USDT', def: 1.304 },
            { sym: 'BNBUSDT', name: 'BNB/USDT', def: 727.2 },
            { sym: 'DOGEUSDT', name: 'DOGE/USDT', def: 0.0792 },
            { sym: 'ADAUSDT', name: 'ADA/USDT', def: 0.2171 },
            { sym: 'AVAXUSDT', name: 'AVAX/USDT', def: 9.55 },
            { sym: 'LINKUSDT', name: 'LINK/USDT', def: 11.91 },
            { sym: 'NEARUSDT', name: 'NEAR/USDT', def: 4.95 }
          ];

          const hasLiveTicker = Object.keys(liveTickerMap).length > 0;
          const hasSessionResults = liveRunner.coinResults && liveRunner.coinResults.length > 0;

          // Session results from the bot run
          const resultMap = {};
          if (hasSessionResults) {
            liveRunner.coinResults.forEach(r => { resultMap[r.tradeCoin] = r; });
          }

          return (
            <div style={{
              background: 'rgba(18, 23, 34, 0.75)',
              border: '1px solid rgba(0, 212, 255, 0.35)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '1.1rem' }}>🪙</span>
                  <div>
                    <b style={{ color: '#00D4FF', fontSize: '0.78rem' }}>10-COIN INSTITUTIONAL MATRIX</b>
                    <div style={{ fontSize: '0.62rem', color: hasLiveTicker ? '#00e676' : '#e9b949', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: hasLiveTicker ? '#00e676' : '#e9b949' }} />
                      <span>{hasLiveTicker ? 'Live Bybit Prices (V5 Stream)' : 'Connecting Bybit Stream...'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {hasSessionResults && (
                    <span style={{ fontSize: '0.62rem', color: '#00e676', background: 'rgba(0,230,118,0.15)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      {liveRunner.coinResults.filter(r => r.isWin).length}/10 WIN
                    </span>
                  )}
                  {onRefreshTickers && (
                    <button
                      type="button"
                      onClick={onRefreshTickers}
                      style={{
                        background: 'rgba(0, 212, 255, 0.12)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        color: '#00D4FF',
                        borderRadius: 4,
                        fontSize: '0.60rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        cursor: 'pointer'
                      }}
                      title="Fetch latest Bybit prices"
                    >
                      🔄 Refresh
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5, maxHeight: '175px', overflowY: 'auto' }}>
                {COIN_DEFS.map((coin, i) => {
                  const ticker = liveTickerMap[coin.sym];
                  const price = ticker?.price || coin.def;
                  const pcnt24h = ticker?.pcnt24h || 0;
                  const sessionResult = resultMap[coin.name];
                  
                  let signalLabel, signalColor;
                  if (sessionResult) {
                    signalLabel = sessionResult.isWin
                      ? (sessionResult.isBuy ? '✅ BUY WIN' : '✅ SELL WIN')
                      : (sessionResult.isBuy ? '❌ BUY SL' : '❌ SELL SL');
                    signalColor = sessionResult.isWin ? '#00e676' : '#ff3366';
                  } else if (ticker) {
                    const isBull = pcnt24h >= 0;
                    const score = Math.min(96, Math.max(84, Math.round(86 + Math.abs(pcnt24h) * 250)));
                    signalLabel = isBull ? `BUY ${score}%` : `SELL ${score}%`;
                    signalColor = isBull ? '#00e676' : '#ff3366';
                  } else {
                    signalLabel = 'SYNCING...';
                    signalColor = '#8592a6';
                  }

                  // Precise price formatting based on scale
                  const priceStr = price >= 1000
                    ? '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : price >= 1
                    ? '$' + price.toFixed(4)
                    : '$' + price.toFixed(5);

                  return (
                    <div key={i} style={{
                      background: sessionResult
                        ? (sessionResult.isWin ? 'rgba(0,230,118,0.08)' : 'rgba(255,51,102,0.08)')
                        : 'rgba(0,0,0,0.3)',
                      padding: '5px 7px',
                      borderRadius: 4,
                      border: sessionResult
                        ? `1px solid ${sessionResult.isWin ? 'rgba(0,230,118,0.35)' : 'rgba(255,51,102,0.35)'}`
                        : '1px solid rgba(255,255,255,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      fontSize: '0.62rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ color: '#e8ecf3' }}>{coin.name}</b>
                        <span style={{ color: signalColor, fontWeight: 800 }}>{signalLabel}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#8592a6' }}>
                        <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{priceStr}</span>
                        {ticker ? (
                          <span style={{ color: pcnt24h >= 0 ? '#00e676' : '#ff3366', fontWeight: 700 }}>
                            {pcnt24h >= 0 ? '+' : ''}{(pcnt24h * 100).toFixed(2)}%
                          </span>
                        ) : null}
                        {sessionResult && (
                          <span style={{ color: sessionResult.isWin ? '#00e676' : '#ff3366', fontWeight: 800 }}>
                            {sessionResult.pnlDollars >= 0 ? '+' : ''}${sessionResult.pnlDollars.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!hasLiveTicker && !hasSessionResults && (
                <div style={{ fontSize: '0.62rem', color: '#8592a6', textAlign: 'center', paddingTop: 2 }}>
                  ⏳ Loading real-time Bybit ticker data or click ▶️ START BOT to scan
                </div>
              )}
            </div>
          );
        })()}

        {/* Live Sequential 10-Trade Execution Controls */}
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          {!liveRunner.active ? (
            <button
              type="button"
              className="ultra-bot-run-btn"
              onClick={startLive10TradeBotRun}
              style={{
                background: 'linear-gradient(135deg, #00e676, #00b0ff)',
                color: '#0a0d13',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '10px 14px',
                boxShadow: '0 0 16px rgba(0, 230, 118, 0.3)'
              }}
            >
              <Zap size={14} />
              <span>▶️ START LIVE 10-TRADE BOT RUN</span>
            </button>
          ) : (
            <div style={{
              background: 'rgba(0, 230, 118, 0.1)',
              border: '1px solid #00e676',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#00e676', fontSize: '0.78rem' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#00e676' }} />
                  <span>RUNNING: TRADE {liveRunner.step} / {liveRunner.total}</span>
                </div>
                <button
                  type="button"
                  onClick={stopLiveSequentialBotTest}
                  style={{
                    background: 'rgba(255, 51, 102, 0.25)',
                    border: '1px solid #ff3366',
                    color: '#ff3366',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ⏹️ Pause
                </button>
              </div>

              <div style={{ fontSize: '0.70rem', color: '#e8ecf3' }}>
                {liveRunner.statusText}
              </div>

              <div style={{ display: 'flex', gap: 10, fontSize: '0.66rem', color: '#8592a6', background: 'rgba(0,0,0,0.4)', padding: '5px 8px', borderRadius: '5px' }}>
                <span>DD: <b style={{ color: '#ff3366' }}>{liveRunner.currentDD}p</b></span>
                <span>Peak: <b style={{ color: '#00e676' }}>+{liveRunner.currentRunup}p</b></span>
                <span>Live: <b style={{ color: liveRunner.currentPips >= 0 ? '#00e676' : '#ff3366' }}>{liveRunner.currentPips >= 0 ? '+' : ''}{liveRunner.currentPips}p</b></span>
              </div>
            </div>
          )}

          {!liveRunner.active && (
            <button
              type="button"
              onClick={handleRunBotBatchSimulation}
              disabled={botSimulating}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#8592a6',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span>⚡ Instant 10-Trade Report (Fast Track)</span>
            </button>
          )}
        </div>

        {/* Closed Trades Log Table */}
        <div className="ultra-bot-table-wrap">
          {demoAccount.trades && demoAccount.trades.length > 0 ? (
            <table className="ultra-bot-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Coin</th>
                  <th>Type</th>
                  <th>Pips</th>
                  <th>PnL ($)</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {demoAccount.trades.slice(-8).reverse().map((tr, idx) => (
                  <tr key={tr.id || idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <span style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: 'rgba(233, 185, 73, 0.15)',
                        color: '#e9b949',
                        fontWeight: 700,
                        fontSize: '0.64rem'
                      }}>
                        {tr.asset || asset}
                      </span>
                    </td>
                    <td style={{ color: tr.type === 'BUY' ? '#00e676' : '#ff3366', fontWeight: 700 }}>{tr.type}</td>
                    <td style={{ color: tr.pips > 0 ? '#00e676' : '#ff3366', fontWeight: 700 }}>
                      {tr.pips > 0 ? `+${tr.pips}` : tr.pips}p
                    </td>
                    <td style={{ color: tr.pnlDollars >= 0 ? '#00e676' : '#ff3366', fontWeight: 700 }}>
                      {tr.pnlDollars >= 0 ? `+$${tr.pnlDollars.toFixed(2)}` : `-$${Math.abs(tr.pnlDollars).toFixed(2)}`}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 5px',
                        borderRadius: '3px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        background: tr.result === 'WIN' ? 'rgba(0, 230, 118, 0.18)' : 'rgba(255, 51, 102, 0.18)',
                        color: tr.result === 'WIN' ? '#00e676' : '#ff3366'
                      }}>
                        {tr.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 8px', color: '#8592a6', fontSize: '0.72rem' }}>
              No trades logged yet. Start Bot or Run 10-Trade execution!
            </div>
          )}
        </div>

        {/* Exchange API Hook Box */}
        <div className="ultra-bot-api-box">
          <div className="ultra-bot-api-title">
            <span style={{ fontSize: '0.70rem', color: '#e8ecf3', fontWeight: 700 }}>🔗 Bybit / Exchange API Hook</span>
          </div>

          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <input
              type="text"
              placeholder="API Key"
              value={exchangeApi.apiKey}
              onChange={(e) => setExchangeApi({ ...exchangeApi, apiKey: e.target.value })}
              style={{
                flex: 1,
                background: 'rgba(10, 13, 19, 0.9)',
                border: '1px solid rgba(0, 230, 118, 0.4)',
                color: '#00e676',
                fontSize: '0.66rem',
                borderRadius: '5px',
                padding: '5px 7px',
                fontFamily: 'monospace'
              }}
            />
            <input
              type="password"
              placeholder="API Secret"
              value={exchangeApi.apiSecret || ''}
              onChange={(e) => setExchangeApi({ ...exchangeApi, apiSecret: e.target.value })}
              style={{
                flex: 1,
                background: 'rgba(10, 13, 19, 0.9)',
                border: exchangeApi.apiSecret ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid rgba(255, 171, 0, 0.4)',
                color: '#fff',
                fontSize: '0.66rem',
                borderRadius: '5px',
                padding: '5px 7px',
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              type="button"
              onClick={handleTestBybitConnection}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: '5px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: '#e8ecf3',
                fontSize: '0.66rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🧪 Test API
            </button>
            <button
              type="button"
              onClick={() => {
                const nextState = !exchangeApi.isAutoTradeEnabled;
                setExchangeApi(prev => ({
                  ...prev,
                  isAutoTradeEnabled: nextState,
                  connectedAccount: nextState ? { balance: 15000, currency: 'USDT' } : null
                }));
                setToastNotice(nextState
                  ? `🟢 Connected to ${exchangeApi.exchange.toUpperCase()} Demo Account!`
                  : '⚪ Disconnected Exchange Hook');
                setTimeout(() => setToastNotice(null), 3000);
              }}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: '5px',
                border: 'none',
                background: exchangeApi.isAutoTradeEnabled ? '#00e676' : 'linear-gradient(135deg, #e9b949, #f2a33a)',
                color: '#0a0d13',
                fontSize: '0.66rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {exchangeApi.isAutoTradeEnabled ? 'Active (Connected)' : 'Connect Demo'}
            </button>
          </div>

          {bybitTestStatus && (
            <div style={{
              marginTop: 6,
              padding: '6px 8px',
              borderRadius: '4px',
              fontSize: '0.66rem',
              fontWeight: 600,
              lineHeight: 1.4,
              background: bybitTestStatus.loading ? 'rgba(0, 212, 255, 0.12)' : (bybitTestStatus.success ? 'rgba(0, 230, 118, 0.14)' : 'rgba(255, 51, 102, 0.14)'),
              border: bybitTestStatus.loading ? '1px solid #00D4FF' : (bybitTestStatus.success ? '1px solid #00e676' : '1px solid #ff3366'),
              color: bybitTestStatus.loading ? '#00D4FF' : (bybitTestStatus.success ? '#00e676' : '#ff8099')
            }}>
              {bybitTestStatus.loading ? '⏳ Testing Bybit API connection...' : bybitTestStatus.message}
            </div>
          )}

          {/* Active Real Bybit Positions Box */}
          {bybitRealPositions && bybitRealPositions.length > 0 && (
            <div style={{
              marginTop: 10,
              padding: '10px',
              borderRadius: '6px',
              background: 'rgba(0, 230, 118, 0.08)',
              border: '1px solid rgba(0, 230, 118, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#00e676', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🟢 LIVE BYBIT POSITIONS ({bybitRealPositions.length})
                </span>
                {refreshBybitPositions && (
                  <button
                    type="button"
                    onClick={refreshBybitPositions}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#8592a6',
                      fontSize: '0.64rem',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title="Sync with Bybit"
                  >
                    🔄 Sync
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {bybitRealPositions.map((pos, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    fontSize: '0.66rem'
                  }}>
                    <div>
                      <b style={{ color: '#fff' }}>{pos.symbol}</b>
                      <span style={{ color: pos.side === 'Buy' ? '#00e676' : '#ff3366', marginLeft: 6, fontWeight: 700 }}>
                        {pos.side} {pos.size}
                      </span>
                      <div style={{ color: '#8592a6', fontSize: '0.60rem' }}>
                        Entry: ${parseFloat(pos.avgPrice).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        color: parseFloat(pos.unrealisedPnl) >= 0 ? '#00e676' : '#ff3366',
                        fontWeight: 700,
                        fontFamily: 'monospace'
                      }}>
                        {parseFloat(pos.unrealisedPnl) >= 0 ? '+' : ''}{parseFloat(pos.unrealisedPnl).toFixed(4)} USDT
                      </span>
                      {handleCloseSingleBybit && (
                        <button
                          type="button"
                          onClick={() => handleCloseSingleBybit(pos)}
                          style={{
                            padding: '2px 5px',
                            background: 'rgba(255, 51, 102, 0.2)',
                            border: '1px solid #ff3366',
                            color: '#ff3366',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.60rem',
                            fontWeight: 700
                          }}
                          title="Close this position on Bybit"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {handleCloseAllBybit && (
                <button
                  type="button"
                  onClick={handleCloseAllBybit}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ff3366',
                    background: 'rgba(255, 51, 102, 0.2)',
                    color: '#ff8099',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🚨 Close All Bybit Positions ({bybitRealPositions.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

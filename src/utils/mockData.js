// Mock Data for TrendLens Pro (Based on GoldVIP Pro System Architecture)

export const MOCK_PRICES = {
  // Commodities & Metals
  'XAU/USD': { category: 'Metals', price: 2645.82, change: +12.34, changePct: +0.47, high: 2658.10, low: 2631.20, spread: 0.12 },
  'XAG/USD': { category: 'Metals', price: 31.45,   change: +0.38,  changePct: +1.22, high: 31.80,  low: 30.95,  spread: 0.02 },
  'XPT/USD': { category: 'Metals', price: 984.60,  change: +6.20,   changePct: +0.63, high: 991.00,  low: 978.40,  spread: 0.40 },
  'WTI/OIL': { category: 'Energy', price: 71.20,   change: -0.65,  changePct: -0.91, high: 72.40,  low: 70.80,  spread: 0.03 },
  'BRENT/OIL': { category: 'Energy', price: 75.80, change: -0.72,  changePct: -0.94, high: 76.90,  low: 75.10,  spread: 0.04 },

  // ─── FOREX MAJORS & CROSSES (Full 38+ Pair Suite) ───
  // Majors
  'EUR/USD': { category: 'Forex', price: 1.0872,  change: +0.0023, changePct: +0.21, high: 1.0895, low: 1.0849, spread: 0.0001 },
  'GBP/USD': { category: 'Forex', price: 1.2634,  change: -0.0041, changePct: -0.32, high: 1.2685, low: 1.2601, spread: 0.0001 },
  'USD/JPY': { category: 'Forex', price: 152.40,  change: +0.75,   changePct: +0.49, high: 152.90, low: 151.60, spread: 0.01 },
  'AUD/USD': { category: 'Forex', price: 0.6580,  change: +0.0015, changePct: +0.23, high: 0.6610, low: 0.6555, spread: 0.0001 },
  'USD/CAD': { category: 'Forex', price: 1.3890,  change: -0.0018, changePct: -0.13, high: 1.3920, low: 1.3865, spread: 0.0001 },
  'USD/CHF': { category: 'Forex', price: 0.8650,  change: +0.0008, changePct: +0.09, high: 0.8675, low: 0.8632, spread: 0.0001 },
  'NZD/USD': { category: 'Forex', price: 0.5985,  change: -0.0012, changePct: -0.20, high: 0.6015, low: 0.5970, spread: 0.0001 },

  // Euro Crosses
  'EUR/GBP': { category: 'Forex', price: 0.8605,  change: +0.0014, changePct: +0.16, high: 0.8630, low: 0.8585, spread: 0.00015 },
  'EUR/JPY': { category: 'Forex', price: 165.68,  change: +0.92,   changePct: +0.56, high: 166.10, low: 164.80, spread: 0.015 },
  'EUR/AUD': { category: 'Forex', price: 1.6522,  change: +0.0035, changePct: +0.21, high: 1.6560, low: 1.6480, spread: 0.0002 },
  'EUR/CAD': { category: 'Forex', price: 1.5101,  change: +0.0028, changePct: +0.19, high: 1.5140, low: 1.5060, spread: 0.0002 },
  'EUR/CHF': { category: 'Forex', price: 0.9405,  change: +0.0012, changePct: +0.13, high: 0.9430, low: 0.9380, spread: 0.00015 },
  'EUR/NZD': { category: 'Forex', price: 1.8165,  change: +0.0045, changePct: +0.25, high: 1.8210, low: 1.8110, spread: 0.00025 },

  // GBP Crosses
  'GBP/JPY': { category: 'Forex', price: 192.55,  change: +0.65,   changePct: +0.34, high: 193.10, low: 191.80, spread: 0.02 },
  'GBP/AUD': { category: 'Forex', price: 1.9200,  change: +0.0040, changePct: +0.21, high: 1.9250, low: 1.9140, spread: 0.0002 },
  'GBP/CAD': { category: 'Forex', price: 1.7548,  change: +0.0032, changePct: +0.18, high: 1.7595, low: 1.7490, spread: 0.0002 },
  'GBP/CHF': { category: 'Forex', price: 1.0928,  change: +0.0018, changePct: +0.16, high: 1.0960, low: 1.0890, spread: 0.0002 },
  'GBP/NZD': { category: 'Forex', price: 2.1105,  change: +0.0055, changePct: +0.26, high: 2.1170, low: 2.1030, spread: 0.0003 },

  // Yen Crosses
  'AUD/JPY': { category: 'Forex', price: 100.28,  change: +0.45,   changePct: +0.45, high: 100.60, low: 99.80,  spread: 0.015 },
  'CAD/JPY': { category: 'Forex', price: 109.72,  change: +0.52,   changePct: +0.48, high: 110.10, low: 109.20, spread: 0.018 },
  'CHF/JPY': { category: 'Forex', price: 176.18,  change: +0.68,   changePct: +0.39, high: 176.70, low: 175.40, spread: 0.02 },
  'NZD/JPY': { category: 'Forex', price: 91.20,   change: +0.38,   changePct: +0.42, high: 91.55,  low: 90.75,  spread: 0.016 },

  // Other Crosses
  'AUD/CAD': { category: 'Forex', price: 0.9140,  change: +0.0015, changePct: +0.16, high: 0.9165, low: 0.9110, spread: 0.00015 },
  'AUD/CHF': { category: 'Forex', price: 0.5692,  change: +0.0009, changePct: +0.16, high: 0.5715, low: 0.5665, spread: 0.00015 },
  'AUD/NZD': { category: 'Forex', price: 1.0994,  change: +0.0022, changePct: +0.20, high: 1.1020, low: 1.0965, spread: 0.0002 },
  'CAD/CHF': { category: 'Forex', price: 0.6228,  change: +0.0008, changePct: +0.13, high: 0.6250, low: 0.6200, spread: 0.00015 },
  'NZD/CAD': { category: 'Forex', price: 0.8315,  change: +0.0012, changePct: +0.14, high: 0.8340, low: 0.8285, spread: 0.00015 },
  'NZD/CHF': { category: 'Forex', price: 0.5178,  change: +0.0007, changePct: +0.14, high: 0.5200, low: 0.5150, spread: 0.00015 },

  // Emerging & Exotics
  'USD/TRY': { category: 'Forex', price: 34.25,   change: +0.12,   changePct: +0.35, high: 34.40,  low: 34.10,  spread: 0.05 },
  'USD/ZAR': { category: 'Forex', price: 17.65,   change: -0.08,   changePct: -0.45, high: 17.80,  low: 17.52,  spread: 0.02 },
  'USD/MXN': { category: 'Forex', price: 19.88,   change: +0.09,   changePct: +0.46, high: 20.02,  low: 19.74,  spread: 0.02 },
  'USD/SGD': { category: 'Forex', price: 1.3140,  change: +0.0015, changePct: +0.11, high: 1.3165, low: 1.3115, spread: 0.0003 },
  'USD/HKD': { category: 'Forex', price: 7.7725,  change: +0.0010, changePct: +0.01, high: 7.7750, low: 7.7700, spread: 0.0002 },
  'USD/SEK': { category: 'Forex', price: 10.58,   change: +0.04,   changePct: +0.38, high: 10.65,  low: 10.51,  spread: 0.01 },
  'USD/NOK': { category: 'Forex', price: 10.92,   change: +0.05,   changePct: +0.46, high: 11.01,  low: 10.84,  spread: 0.01 },
  'USD/CNH': { category: 'Forex', price: 7.1240,  change: +0.0085, changePct: +0.12, high: 7.1350, low: 7.1120, spread: 0.0005 },
  'EUR/TRY': { category: 'Forex', price: 37.24,   change: +0.18,   changePct: +0.49, high: 37.45,  low: 37.02,  spread: 0.06 },
  'USD/INR': { category: 'Forex', price: 84.06,   change: +0.05,   changePct: +0.06, high: 84.15,  low: 83.95,  spread: 0.02 },

  // ─── CRYPTOCURRENCIES (Comprehensive Top 55+ Portfolio) ───
  // Layer 1 & Major Bluechips
  'BTC/USD': { category: 'Crypto', price: 67842.50, change: -823.10, changePct: -1.20, high: 69100.00, low: 66500.00, spread: 1.50 },
  'ETH/USD': { category: 'Crypto', price: 3412.75,  change: +67.20,  changePct: +2.01, high: 3455.00,  low: 3330.00,  spread: 0.35 },
  'SOL/USD': { category: 'Crypto', price: 184.20,   change: +9.40,   changePct: +5.38, high: 188.00,   low: 173.50,  spread: 0.08 },
  'BNB/USD': { category: 'Crypto', price: 588.60,   change: +12.40,  changePct: +2.15, high: 595.00,   low: 574.00,  spread: 0.20 },
  'XRP/USD': { category: 'Crypto', price: 0.5480,   change: +0.0210, changePct: +3.98, high: 0.5590,   low: 0.5230,  spread: 0.0005 },
  'ADA/USD': { category: 'Crypto', price: 0.3580,   change: +0.0090, changePct: +2.58, high: 0.3660,   low: 0.3470,  spread: 0.0003 },
  'AVAX/USD': { category: 'Crypto', price: 28.45,   change: +1.65,   changePct: +6.16, high: 29.20,    low: 26.50,   spread: 0.03 },
  'SUI/USD': { category: 'Crypto', price: 2.14,     change: +0.19,   changePct: +9.74, high: 2.22,     low: 1.92,    spread: 0.005 },
  'NEAR/USD': { category: 'Crypto', price: 5.12,    change: +0.28,   changePct: +5.79, high: 5.25,     low: 4.80,    spread: 0.01 },
  'APT/USD': { category: 'Crypto', price: 10.35,    change: +0.82,   changePct: +8.60, high: 10.60,    low: 9.45,    spread: 0.02 },
  'TON/USD': { category: 'Crypto', price: 5.34,     change: -0.08,   changePct: -1.48, high: 5.48,     low: 5.26,    spread: 0.01 },
  'DOT/USD': { category: 'Crypto', price: 4.48,     change: +0.11,   changePct: +2.52, high: 4.58,     low: 4.34,    spread: 0.01 },
  'LTC/USD': { category: 'Crypto', price: 73.80,    change: +1.45,   changePct: +2.00, high: 74.90,    low: 71.80,   spread: 0.05 },
  'MATIC/USD': { category: 'Crypto', price: 0.3890, change: +0.0140, changePct: +3.73, high: 0.3980,   low: 0.3720,  spread: 0.0004 },
  'ATOM/USD': { category: 'Crypto', price: 4.62,    change: +0.15,   changePct: +3.36, high: 4.75,     low: 4.42,    spread: 0.01 },
  'FTM/USD': { category: 'Crypto', price: 0.725,    change: +0.048,  changePct: +7.09, high: 0.748,    low: 0.672,   spread: 0.001 },
  'ALGO/USD': { category: 'Crypto', price: 0.132,   change: +0.005,  changePct: +3.94, high: 0.138,    low: 0.126,   spread: 0.0003 },
  'ICP/USD': { category: 'Crypto', price: 8.65,     change: +0.38,   changePct: +4.60, high: 8.92,     low: 8.21,    spread: 0.02 },
  'KAS/USD': { category: 'Crypto', price: 0.138,    change: +0.006,  changePct: +4.55, high: 0.144,    low: 0.130,   spread: 0.0005 },
  'SEI/USD': { category: 'Crypto', price: 0.445,    change: +0.032,  changePct: +7.75, high: 0.462,    low: 0.408,   spread: 0.001 },

  // Layer 2 & Scaling
  'ARB/USD': { category: 'Crypto', price: 0.582,    change: +0.024,  changePct: +4.30, high: 0.598,    low: 0.551,   spread: 0.001 },
  'OP/USD': { category: 'Crypto', price: 1.68,      change: +0.09,   changePct: +5.66, high: 1.74,     low: 1.57,    spread: 0.005 },
  'STRK/USD': { category: 'Crypto', price: 0.428,   change: +0.026,  changePct: +6.47, high: 0.446,    low: 0.398,   spread: 0.001 },
  'IMX/USD': { category: 'Crypto', price: 1.52,     change: +0.08,   changePct: +5.56, high: 1.58,     low: 1.43,    spread: 0.004 },

  // DeFi & Infrastructure
  'LINK/USD': { category: 'Crypto', price: 12.18,   change: +0.54,   changePct: +4.64, high: 12.45,    low: 11.55,   spread: 0.02 },
  'UNI/USD': { category: 'Crypto', price: 7.95,     change: +0.42,   changePct: +5.58, high: 8.15,     low: 7.48,    spread: 0.02 },
  'AAVE/USD': { category: 'Crypto', price: 156.40,  change: +8.20,   changePct: +5.53, high: 161.00,   low: 147.50,  spread: 0.25 },
  'MKR/USD': { category: 'Crypto', price: 1245.00,  change: +42.00,  changePct: +3.49, high: 1270.00,  low: 1195.00, spread: 1.50 },
  'INJ/USD': { category: 'Crypto', price: 21.40,    change: +1.35,   changePct: +6.73, high: 22.10,    low: 19.80,   spread: 0.03 },
  'TIA/USD': { category: 'Crypto', price: 6.25,     change: +0.42,   changePct: +7.20, high: 6.45,     low: 5.75,    spread: 0.01 },
  'RUNE/USD': { category: 'Crypto', price: 5.42,    change: +0.31,   changePct: +6.07, high: 5.60,     low: 5.08,    spread: 0.01 },
  'PENDLE/USD': { category: 'Crypto', price: 4.88,  change: +0.35,   changePct: +7.73, high: 5.06,     low: 4.49,    spread: 0.01 },
  'JUP/USD': { category: 'Crypto', price: 1.05,     change: +0.07,   changePct: +7.14, high: 1.10,     low: 0.97,    spread: 0.003 },
  'ENA/USD': { category: 'Crypto', price: 0.585,    change: +0.042,  changePct: +7.73, high: 0.608,    low: 0.538,   spread: 0.001 },
  'PYTH/USD': { category: 'Crypto', price: 0.365,   change: +0.024,  changePct: +7.04, high: 0.378,    low: 0.339,   spread: 0.001 },
  'ONDO/USD': { category: 'Crypto', price: 0.812,   change: +0.054,  changePct: +7.12, high: 0.842,    low: 0.752,   spread: 0.002 },

  // AI & Data / DePIN
  'RENDER/USD': { category: 'Crypto', price: 5.82,  change: +0.48,   changePct: +8.99, high: 5.98,     low: 5.28,    spread: 0.015 },
  'TAO/USD': { category: 'Crypto', price: 582.40,   change: +38.50,  changePct: +7.08, high: 596.00,   low: 539.00,  spread: 0.80 },
  'FET/USD': { category: 'Crypto', price: 1.45,     change: +0.11,   changePct: +8.21, high: 1.51,     low: 1.32,    spread: 0.004 },
  'FIL/USD': { category: 'Crypto', price: 3.85,     change: +0.12,   changePct: +3.22, high: 3.98,     low: 3.69,    spread: 0.008 },
  'WLD/USD': { category: 'Crypto', price: 2.28,     change: +0.16,   changePct: +7.55, high: 2.38,     low: 2.10,    spread: 0.005 },
  'JASMY/USD': { category: 'Crypto', price: 0.0215, change: +0.0014, changePct: +6.97, high: 0.0224,   low: 0.0199,  spread: 0.00004 },
  'STX/USD': { category: 'Crypto', price: 1.84,     change: +0.11,   changePct: +6.36, high: 1.91,     low: 1.71,    spread: 0.005 },
  'ORDI/USD': { category: 'Crypto', price: 36.20,   change: +2.10,   changePct: +6.16, high: 37.50,    low: 33.80,   spread: 0.06 },

  // Meme & High-Beta
  'DOGE/USD': { category: 'Crypto', price: 0.1425,  change: +0.0115, changePct: +8.78, high: 0.1480,   low: 0.1290,  spread: 0.0002 },
  'SHIB/USD': { category: 'Crypto', price: 0.0000189, change: +0.0000007, changePct: +3.85, high: 0.0000196, low: 0.0000181, spread: 0.00000003 },
  'PEPE/USD': { category: 'Crypto', price: 0.0000108, change: +0.0000008, changePct: +8.00, high: 0.0000114, low: 0.0000098, spread: 0.00000002 },
  'WIF/USD': { category: 'Crypto', price: 2.68,     change: +0.22,   changePct: +8.94, high: 2.79,     low: 2.42,    spread: 0.005 },
  'BONK/USD': { category: 'Crypto', price: 0.0000224, change: +0.0000018, changePct: +8.74, high: 0.0000238, low: 0.0000204, spread: 0.00000004 },
  'FLOKI/USD': { category: 'Crypto', price: 0.000158, change: +0.000012, changePct: +8.22, high: 0.000166, low: 0.000144, spread: 0.0000003 },
  'NOT/USD': { category: 'Crypto', price: 0.0084,   change: +0.0006, changePct: +7.69, high: 0.0089,   low: 0.0077,  spread: 0.00002 },

  // Major Indices
  'NAS100':  { category: 'Indices', price: 19872.40, change: +145.30, changePct: +0.74, high: 19920.00, low: 19700.00, spread: 0.80 },
  'US30':    { category: 'Indices', price: 42865.00, change: +210.50, changePct: +0.49, high: 42950.00, low: 42600.00, spread: 1.20 },
  'SPX500':  { category: 'Indices', price: 5824.60,  change: +28.40,  changePct: +0.49, high: 5840.00,  low: 5790.00, spread: 0.30 },
  'GER40':   { category: 'Indices', price: 19480.00, change: +85.00,  changePct: +0.44, high: 19520.00, low: 19370.00, spread: 1.00 },
};

/**
 * DEMO SIGNAL DATASET - illustrative examples, not live signals.
 * Every figure is a placeholder; no accuracy, touch probability or order-flow
 * value here was measured.
 */
export const MOCK_SIGNALS = [
  // --- METALS & COMMODITIES ---
  {
    id: 'sig_001', asset: 'XAU/USD', marketCategory: 'Metals', direction: 'BUY', engine: 'WhaleAOF',
    timeframe: 'H1', entry: { min: 2638.50, max: 2640.00 }, stopLoss: 2630.00,
    targets: { tp1: 2650.00, tp2: 2658.00, tp3: 2668.00 },
    status: 'tp2_hit', createdAt: new Date(Date.now() - 3600000 * 2),
    result: 'win', pips: 175, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Asian Session Liquidity Sweep @ 2,638.50 + Bullish FVG Fill',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Institutional absorption confirmed. Buyers defending structural support.'
    }
  },
  {
    id: 'sig_002', asset: 'XAU/USD', marketCategory: 'Metals', direction: 'BUY', engine: 'FlowSniper',
    timeframe: 'H4', entry: { min: 2641.00, max: 2643.50 }, stopLoss: 2633.00,
    targets: { tp1: 2655.00, tp2: 2663.00, tp3: 2672.00 },
    status: 'active', createdAt: new Date(Date.now() - 1800000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'H4 Bullish Order Block mitigation with Market Structure Shift (MSS)',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'High-probability momentum continuation toward London session high.'
    }
  },
  {
    id: 'sig_003', asset: 'XAG/USD', marketCategory: 'Metals', direction: 'BUY', engine: 'MagicScalper',
    timeframe: 'M15', entry: { min: 31.25, max: 31.35 }, stopLoss: 30.90,
    targets: { tp1: 31.65, tp2: 32.10, tp3: 32.60 },
    status: 'active', createdAt: new Date(Date.now() - 2100000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'SMT Divergence: Silver making higher low while Gold swept low',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Strong institutional accumulation in precious metals.'
    }
  },
  {
    id: 'sig_004', asset: 'WTI/OIL', marketCategory: 'Commodities', direction: 'SELL', engine: 'WizardTrend',
    timeframe: 'H1', entry: { min: 71.50, max: 71.80 }, stopLoss: 72.40,
    targets: { tp1: 70.80, tp2: 70.10, tp3: 69.20 },
    status: 'active', createdAt: new Date(Date.now() - 3200000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Break of Structure (BOS) on H1 + Bearish breaker block rejection',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Inventory build up leading to downside expansion.'
    }
  },

  // --- CRYPTOCURRENCY ---
  {
    id: 'sig_005', asset: 'BTC/USD', marketCategory: 'Crypto', direction: 'SELL', engine: 'WizardTrend',
    timeframe: 'H4', entry: { min: 68200, max: 68500 }, stopLoss: 69200,
    targets: { tp1: 67000, tp2: 65800, tp3: 64500 },
    status: 'tp1_hit', createdAt: new Date(Date.now() - 7200000),
    result: 'win', pips: 120, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Buy-Side Liquidity (BSL) swept above $68,400 followed by displacement',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Smart money capping rally. Distribution into retail stops.'
    }
  },
  {
    id: 'sig_006', asset: 'BTC/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'WhaleAOF',
    timeframe: 'H1', entry: { min: 66800, max: 67100 }, stopLoss: 66100,
    targets: { tp1: 68200, tp2: 69500, tp3: 71000 },
    status: 'active', createdAt: new Date(Date.now() - 1200000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Sell-Side Liquidity sweep of $66,900 Asian low + strong market displacement',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Institutional absorption floor confirmed on Bitcoin.'
    }
  },
  {
    id: 'sig_007', asset: 'ETH/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'FlowSniper',
    timeframe: 'H4', entry: { min: 3380, max: 3410 }, stopLoss: 3310,
    targets: { tp1: 3480, tp2: 3560, tp3: 3680 },
    status: 'active', createdAt: new Date(Date.now() - 1500000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Daily discount array retest with Bullish Fair Value Gap fill',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Smart money accumulation prior to US session expansion.'
    }
  },
  {
    id: 'sig_008', asset: 'SOL/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'MagicScalper',
    timeframe: 'M15', entry: { min: 181.50, max: 183.00 }, stopLoss: 177.00,
    targets: { tp1: 188.00, tp2: 194.00, tp3: 202.00 },
    status: 'active', createdAt: new Date(Date.now() - 800000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'M15 liquidity run into 1-minute order block with aggressive wick rejection',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'High-momentum Solana scalp targeting daily highs.'
    }
  },
  {
    id: 'sig_009', asset: 'BNB/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'WizardTrend',
    timeframe: 'H1', entry: { min: 585.00, max: 589.00 }, stopLoss: 574.00,
    targets: { tp1: 602.00, tp2: 615.00, tp3: 630.00 },
    status: 'active', createdAt: new Date(Date.now() - 2700000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Equilibrium retest of weekly range + structural higher high',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Trend continuation setup with favorable 1:3.2 R:R ratio.'
    }
  },
  {
    id: 'sig_009_b', asset: 'SUI/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'WhaleAOF',
    timeframe: 'H1', entry: { min: 2.08, max: 2.12 }, stopLoss: 1.96,
    targets: { tp1: 2.25, tp2: 2.38, tp3: 2.55 },
    status: 'active', createdAt: new Date(Date.now() - 600000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Break of Structure (BOS) on H1 + Bullish FVG Mitigation',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Aggressive institutional buying into new all-time high discovery.'
    }
  },
  {
    id: 'sig_009_c', asset: 'DOGE/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'FlowSniper',
    timeframe: 'M15', entry: { min: 0.138, max: 0.141 }, stopLoss: 0.131,
    targets: { tp1: 0.148, tp2: 0.156, tp3: 0.168 },
    status: 'active', createdAt: new Date(Date.now() - 950000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'M15 Asian liquidity sweep followed by sharp displacement candle',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Breakout continuation from high-volume consolidation base.'
    }
  },
  {
    id: 'sig_009_d', asset: 'AVAX/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'WizardTrend',
    timeframe: 'H4', entry: { min: 27.60, max: 28.10 }, stopLoss: 26.20,
    targets: { tp1: 29.80, tp2: 31.50, tp3: 33.80 },
    status: 'active', createdAt: new Date(Date.now() - 1400000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Discount array retest at $27.80 with bullish market structure shift',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Layer-1 rotation flow providing strong tailwinds.'
    }
  },
  {
    id: 'sig_009_e', asset: 'XRP/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'MagicScalper',
    timeframe: 'H1', entry: { min: 0.538, max: 0.545 }, stopLoss: 0.521,
    targets: { tp1: 0.565, tp2: 0.585, tp3: 0.615 },
    status: 'active', createdAt: new Date(Date.now() - 1900000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Equal lows swept at $0.5350 followed by immediate rejection wick',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Accumulation confirmed with favorable risk-to-reward ratio.'
    }
  },
  {
    id: 'sig_009_f', asset: 'TAO/USD', marketCategory: 'Crypto', direction: 'BUY', engine: 'WhaleAOF',
    timeframe: 'H4', entry: { min: 565.00, max: 578.00 }, stopLoss: 535.00,
    targets: { tp1: 615.00, tp2: 650.00, tp3: 710.00 },
    status: 'active', createdAt: new Date(Date.now() - 2100000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'H4 Order block mitigation + clean liquidity sweep above $580',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'AI narrative momentum driving institutional accumulation.'
    }
  },

  // --- FOREX MAJORS & CROSSES ---
  {
    id: 'sig_010', asset: 'EUR/USD', marketCategory: 'Forex', direction: 'BUY', engine: 'MagicScalper',
    timeframe: 'M15', entry: { min: 1.0855, max: 1.0860 }, stopLoss: 1.0840,
    targets: { tp1: 1.0875, tp2: 1.0890, tp3: 1.0910 },
    status: 'active', createdAt: new Date(Date.now() - 900000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'London Open Killzone Judas Swing rejection + discount array entry',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Clean scalp continuation targeting Asian session high.'
    }
  },
  {
    id: 'sig_011', asset: 'GBP/USD', marketCategory: 'Forex', direction: 'SELL', engine: 'WizardTrend',
    timeframe: 'H4', entry: { min: 1.2680, max: 1.2690 }, stopLoss: 1.2720,
    targets: { tp1: 1.2640, tp2: 1.2600, tp3: 1.2550 },
    status: 'tp3_hit', createdAt: new Date(Date.now() - 86400000 * 2),
    result: 'win', pips: 140, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Premium Fair Value Gap (FVG) retest during NY session open',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Trend exhaustion at key institutional resistance zone.'
    }
  },
  {
    id: 'sig_012', asset: 'USD/JPY', marketCategory: 'Forex', direction: 'BUY', engine: 'WhaleAOF',
    timeframe: 'H1', entry: { min: 151.90, max: 152.10 }, stopLoss: 151.40,
    targets: { tp1: 152.80, tp2: 153.40, tp3: 154.20 },
    status: 'active', createdAt: new Date(Date.now() - 2400000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Previous day low tapped & rejected with strong institutional displacement',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Macro yield differential momentum confirmed by L2 depth.'
    }
  },
  {
    id: 'sig_013', asset: 'AUD/USD', marketCategory: 'Forex', direction: 'BUY', engine: 'FlowSniper',
    timeframe: 'H1', entry: { min: 0.6565, max: 0.6575 }, stopLoss: 0.6540,
    targets: { tp1: 0.6610, tp2: 0.6650, tp3: 0.6700 },
    status: 'active', createdAt: new Date(Date.now() - 1700000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Asian range breakout retest with institutional order block mitigation',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'High-conviction commodity currency swing long setup.'
    }
  },
  {
    id: 'sig_014', asset: 'USD/CAD', marketCategory: 'Forex', direction: 'SELL', engine: 'MagicScalper',
    timeframe: 'M15', entry: { min: 1.3910, max: 1.3920 }, stopLoss: 1.3945,
    targets: { tp1: 1.3870, tp2: 1.3830, tp3: 1.3780 },
    status: 'active', createdAt: new Date(Date.now() - 1100000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Equal Highs (EQH) liquidity sweep followed by sharp displacement lower',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Oil strength causing Loonie appreciation against the Dollar.'
    }
  },
  {
    id: 'sig_015', asset: 'USD/CHF', marketCategory: 'Forex', direction: 'SELL', engine: 'WizardTrend',
    timeframe: 'H4', entry: { min: 0.8870, max: 0.8885 }, stopLoss: 0.8920,
    targets: { tp1: 0.8820, tp2: 0.8760, tp3: 0.8700 },
    status: 'active', createdAt: new Date(Date.now() - 4100000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Weekly liquidity pool rejection + bearish market structure change',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Safe haven CHF demand accelerating into London fixing.'
    }
  },
  {
    id: 'sig_016', asset: 'EUR/GBP', marketCategory: 'Forex', direction: 'BUY', engine: 'WhaleAOF',
    timeframe: 'H1', entry: { min: 0.8560, max: 0.8570 }, stopLoss: 0.8535,
    targets: { tp1: 0.8605, tp2: 0.8640, tp3: 0.8690 },
    status: 'active', createdAt: new Date(Date.now() - 5200000),
    result: null, pips: null, accuracy: null,
    confluence: {
      dailyBias: 'Not determined - no futures positioning feed is connected.',
      ictConcept: 'Double bottom liquidity sweep on H1 chart with rapid reclaim',
      orderFlow: 'Unavailable - no order-flow feed is connected.',
      targetsTouchProb: null,
      verdict: 'Clean mean-reversion setup off institutional support.'
    }
  },
];

// GoldVIP Pro System Guide — Complete Indicator Suite Specification
export const HSR_INDICATORS_SUITE = [
  {
    id: 'ultra_signal',
    name: 'HSR Ultra 2.0 Signal Engine',
    category: 'Core Signals',
    badge: 'Flagship',
    type: 'On-Chart Signals',
    description: 'On-chart high-probability BUY/SELL signals powered by multi-timeframe order flow filters and server-side licensing.',
    features: ['Non-repainting on candle close', 'Embedded ATR stop loss & multi-target projection', 'Real-time alert chime & Telegram push', 'Auto spread & slippage compensation'],
    color: '#00E676',
    status: 'Implemented (real Bybit candles)',
    edge: 'Not measured',
  },
  {
    id: 'heatmap',
    name: 'HSR Heatmap (Bookmap-Style)',
    category: 'Order Flow',
    badge: 'Pro Depth',
    type: 'Volume Heatmap',
    description: 'Visualizes resting institutional liquidity depth directly on the chart. Bright horizontal bands act as price magnets or rejection walls.',
    features: ['Reads genuine broker Level-2 depth', 'Zero blue background wash (high contrast display)', 'Magnets vs Absorption walls detection', 'Visualizes real bid/ask resting limit orders'],
    color: '#00D4FF',
    status: 'Not connected - no Level-2 depth feed',
    edge: 'Not measured',
  },
  {
    id: 'targets_magnet',
    name: 'HSR Targets & Touch Probability',
    category: 'Target Engine',
    badge: 'Proprietary',
    type: 'Magnet Levels',
    description: 'Ranks the strongest market levels (HVN, POC, liquidity pools, prior-day high/low) and computes mathematical Touch Probability % for each.',
    features: ['Automated High Volume Node (HVN) & Point of Control (POC)', 'Dynamic Touch Probability % calculation', 'Draws ranked institutional target lines', 'Eliminates guesswork in Take Profit placement'],
    color: '#FFB300',
    status: 'Partially implemented - fixed price offsets only',
    edge: 'Not measured',
  },
  {
    id: 'footprint',
    name: 'Advanced Footprint & Cluster Delta',
    category: 'Order Flow',
    badge: 'Tape Reader',
    type: 'Cluster Chart',
    description: 'Displays the bid x ask volume executed inside every single candle to reveal institutional traps and absorption at extremes.',
    features: ['Diagonal bid/ask volume clusters', 'Unfinished business / auction market flags', 'Imbalance highlighting (>300% ratio)', 'Point of Control (POC) per candle bar'],
    color: '#818CF8',
    status: 'Not connected - no trade tape feed',
    edge: 'Not measured',
  },
  {
    id: 'bubble_flow',
    name: 'Bubble Flow (Aggressor Tape)',
    category: 'Execution',
    badge: 'Real-time',
    type: 'Aggressor Visualizer',
    description: 'Paints executed market orders as dynamic bubbles sized proportional to contract lot size. Instant identification of institutional market orders.',
    features: ['Size-proportional visual bubbles', 'Distinct green (market buys) & red (market sells)', 'Speed of tape velocity detector', 'Filter out retail noise (<10 lots)'],
    color: '#F43F5E',
    status: 'Not connected - no trade tape feed',
    edge: 'Not measured',
  },
  {
    id: 'cvd_divergence',
    name: 'CVD & CCI-CVD Divergence',
    category: 'Momentum',
    badge: 'Reversal',
    type: 'Delta Oscillator',
    description: 'Cumulative Volume Delta tracking that flags market divergence between price highs/lows and net aggressive buyer/seller participation.',
    features: ['Spot smart-money exhaustion before price turns', 'CCI momentum confluence overlay', 'Automatic divergence trendline drawing', 'Bullish & Bearish divergence alerts'],
    color: '#34D399',
    status: 'Not connected - no trade tape feed',
    edge: 'Not measured',
  },
  {
    id: 'orderflow_detector',
    name: 'OrderFlow Absorption Detector',
    category: 'Order Flow',
    badge: 'Absorption',
    type: 'Smart Money Overlay',
    description: 'Monitors the broker Level-2 book in real-time and detects when large institutional orders absorb aggressive retail momentum.',
    features: ['Instant absorption alerts (Bullish/Bearish)', 'Calculates bid/ask skew ratio (e.g. 67% Buy / 33% Sell)', 'Identifies iceberg orders & block trades', 'Real Level-2 depth tracking for Gold & FX'],
    color: '#38BDF8',
    status: 'Not connected - no Level-2 depth feed',
    edge: 'Not measured',
  },
  {
    id: 'vp_reversal',
    name: 'VP Reversal System',
    category: 'Volume Profile',
    badge: 'Exhaustion',
    type: 'Statistical Reversal',
    description: 'Statistical volume profile exhaustion model that identifies when auction price deviates into low-volume rejection territory.',
    features: ['Value Area High (VAH) & Value Area Low (VAL) bounds', 'Statistical 2-sigma deviation reversals', 'Volume profile distribution curves', 'High-confidence mean-reversion entries'],
    color: '#A78BFA',
    status: 'Partially implemented - volume profile only',
    edge: 'Not measured',
  },
  {
    id: 'renko_generator',
    name: 'Noise-Free Renko & Tick Generator',
    category: 'Charting',
    badge: 'Structure',
    type: 'Synthetic Bricks',
    description: 'Constructs custom tick-based and ATR-based Renko bricks to eliminate market chop and reveal pristine trend swings.',
    features: ['Time-independent price movement bricks', 'Clear breakout and pullback structure', 'Integrates with HSR Ultra signal engine', 'Ideal for fast scalping on Gold (XAU/USD)'],
    color: '#FB923C',
    status: 'Implemented (price derived)',
    edge: 'Not measured',
  },
];

// GoldVIP Pro System Guide — Section 5 AI Engines
export const AI_STRATEGY_ENGINES = [
  {
    id: 'whale_aof',
    name: 'Whale AOF Engine (Absorption Order Flow)',
    type: 'Institutional Tracking',
    description: 'Aggregates large institutional block orders across connected markets and delivers an automated plain-language absorption verdict.',
    logic: 'Detects large market orders that price fails to break through (absorption). A whale buy that price holds above = aggressive demand. A whale sell that price fails to break below = absorption of supply.',
    status: 'Not connected - no Level-2 feed',
    accuracy: null,
  },
  {
    id: 'daily_target_engine',
    name: 'Daily Target Engine',
    type: 'Session Directional Bias',
    description: 'Computes a once-a-day data-driven directional bias (BUY or SELL) from futures market history and projects session magnet targets.',
    logic: 'Analyzes overnight institutional positioning, futures settlement deltas, and volatility expansion bounds to dictate whether the day is Bullish or Bearish.',
    status: 'Partially implemented - fixed offsets',
    accuracy: null,
  },
  {
    id: 'ict_smart_money',
    name: 'ICT Smart-Money Engine',
    type: 'Structure & Liquidity',
    description: 'Maps institutional market structure, internal/external range liquidity, order blocks, and Fair Value Gaps (FVG).',
    logic: 'Waits for clean liquidity sweeps of Asian/London session highs or lows, confirms with a Market Structure Shift (MSS), and triggers entries on FVG mitigations.',
    status: 'Implemented (real Bybit candles)',
    accuracy: null,
  },
  {
    id: 'lstm_sequence_model',
    name: 'LSTM Deep Learning Sequence Model',
    type: 'Predictive Neural Net',
    description: 'Trained recurrent neural network that learns short-term non-linear price trajectory patterns from order book micro-deltas.',
    logic: 'Processes 500 preceding ticks of bid/ask depth changes to calculate instantaneous upward/downward velocity probabilities.',
    status: 'Not implemented - no neural network in this build',
    accuracy: null,
  },
  {
    id: 'hft_scalp_bot',
    name: 'Scalp & HFT Micro-Bot',
    type: 'High Frequency Scalper',
    description: 'Executes lightning-fast momentum scalps on M1-M15 timeframes during high volatility sessions (London & New York open).',
    logic: 'Capitalizes on transient liquidity voids and imbalance spikes with tight 10-15 pip stops and rapid 20-30 pip profit harvesting.',
    status: 'Not implemented - no HFT engine in this build',
    accuracy: null,
  },
];

/**
 * DEMO LEADERBOARD DATASET - illustrative rows. These are not real traders
 * and their win rates, pips and streaks were never measured.
 */
export const MOCK_LEADERBOARD = [
  { rank: 1, username: 'TrendMaster_Ali', avatar: '🦅', country: '🇦🇪', countryName: 'UAE',      winRate: 94.8, pips: 3284, signals: 187, streak: 12, sparkline: [120,180,95,210,165,240,195] },
  { rank: 2, username: 'GoldSniper_Kai',  avatar: '🎯', country: '🇯🇵', countryName: 'Japan',    winRate: 91.2, pips: 2876, signals: 143, streak: 8,  sparkline: [90,140,175,110,200,155,180] },
  { rank: 3, username: 'FlowTrader_Emma', avatar: '💎', country: '🇬🇧', countryName: 'UK',       winRate: 89.5, pips: 2541, signals: 164, streak: 6,  sparkline: [80,110,95,155,130,175,160] },
  { rank: 4, username: 'WhaleHunter_Max', avatar: '🐋', country: '🇩🇪', countryName: 'Germany',  winRate: 87.3, pips: 2208, signals: 129, streak: 5,  sparkline: [70,95,120,85,140,115,130] },
  { rank: 5, username: 'NeonTrader_Zara', avatar: '⚡', country: '🇫🇷', countryName: 'France',   winRate: 85.9, pips: 1987, signals: 118, streak: 4,  sparkline: [60,80,100,75,120,95,110] },
  { rank: 6, username: 'CryptoSage_Leo',  avatar: '🔮', country: '🇺🇸', countryName: 'USA',      winRate: 84.1, pips: 1756, signals: 97,  streak: 3,  sparkline: [50,70,90,65,105,80,95] },
  { rank: 7, username: 'PipsMaster_Sam',  avatar: '🚀', country: '🇨🇦', countryName: 'Canada',   winRate: 82.6, pips: 1543, signals: 88,  streak: 7,  sparkline: [40,60,80,55,90,70,85] },
  { rank: 8, username: 'BullRider_Hana',  avatar: '🐂', country: '🇰🇷', countryName: 'S.Korea',  winRate: 81.0, pips: 1398, signals: 76,  streak: 2,  sparkline: [35,55,70,45,80,60,75] },
  { rank: 9, username: 'SmartMoney_Ivan', avatar: '🧠', country: '🇷🇺', countryName: 'Russia',   winRate: 79.4, pips: 1244, signals: 69,  streak: 1,  sparkline: [30,48,62,40,72,52,65] },
  { rank: 10, username: 'SwingKing_Omar', avatar: '👑', country: '🇸🇦', countryName: 'Saudi',    winRate: 78.2, pips: 1102, signals: 62,  streak: 0,  sparkline: [25,42,55,35,65,45,58] },
];

export const MOCK_DAILY_TARGET = {
  bias: 'BULLISH',
  date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
  currentPrice: 2645.82,
  targets: [
    { label: 'TP1 (HVN Magnet)', price: 2658.00, hit: false, touchProb: '94%' },
    { label: 'TP2 (Liquidity Pool)', price: 2665.00, hit: false, touchProb: '88%' },
    { label: 'TP3 (Prior Day High)', price: 2674.00, hit: false, touchProb: '72%' },
  ],
  support: [
    { label: 'S1 (L2 Demand Wall)', price: 2638.00 },
    { label: 'S2 (Daily Low)', price: 2630.00 },
  ],
  whaleActivity: 'ACCUMULATING (Absorption Verified)',
  sessionOpen: 2633.50,
};

export const MOCK_ORDER_FLOW = {
  buyPct: 67, sellPct: 33,
  bigOrders: [
    { time: '14:32', side: 'BUY',  size: 15400, price: 2641.50, verdict: 'Absorption Buy' },
    { time: '14:18', side: 'BUY',  size: 22000, price: 2639.80, verdict: 'Aggressive Sweep' },
    { time: '13:55', side: 'SELL', size: 8700,  price: 2648.20, verdict: 'Passive Resistance' },
    { time: '13:41', side: 'BUY',  size: 31200, price: 2637.60, verdict: 'Institutional Iceberg' },
  ],
};

export const MOCK_USER = {
  id: 'u_001', username: 'TrendLens_User', email: 'user@trendlenspro.com',
  avatar: '🎯', plan: 'pro', country: '🌍',
  stats: { winRate: 88.4, totalSignals: 124, pips: 2341, streak: 5 },
};

export const MOCK_MODULES = [
  { id: 'm1', title: 'Market Basics & Structure', level: 'Beginner', lessons: 8, progress: 100, isCompleted: true, thumb: '📚' },
  { id: 'm2', title: 'Reading Candlesticks & Liquidity', level: 'Beginner', lessons: 6, progress: 80, isCompleted: false, thumb: '📊' },
  { id: 'm3', title: 'Order Flow & Level-2 Bookmap Concepts', level: 'Intermediate', lessons: 10, progress: 40, isCompleted: false, thumb: '🌊' },
  { id: 'm4', title: 'Support, Resistance & Volume Profile', level: 'Intermediate', lessons: 8, progress: 0, isCompleted: false, thumb: '📐' },
  { id: 'm5', title: 'Whale AOF Engine Mastery', level: 'Advanced', lessons: 12, progress: 0, isCompleted: false, thumb: '🐋' },
  { id: 'm6', title: 'AI Signal Configuration & MT5 Bridge', level: 'Advanced', lessons: 9, progress: 0, isCompleted: false, thumb: '🤖' },
];

export const BOOKS = [
  { id: 'b1', title: "Beginner's Guide to Gold Trading", lang: 'English', desc: 'Complete handbook on XAU/USD market dynamics, sessions, and risk management.', cover: '📘' },
  { id: 'b2', title: 'دليل تداول الذهب للمبتدئين', lang: 'Arabic', desc: 'دليل شامل لتداول الذهب وإدارة المخاطر للناطقين بالعربية.', cover: '📗' },
  { id: 'b3', title: 'Guide du Trader Débutant', lang: 'French', desc: 'Guide pratique pour débuter sur le marché de l’or avec les concepts d’Order Flow.', cover: '📕' },
  { id: 'b4', title: 'රන් වෙළඳපල මූලික අත්පොත (GoldVIP Sinhala)', lang: 'Sinhala', desc: 'Gold & Forex වෙළඳපොල ආයතනික Order Flow ක්‍රමවේදය සිංහලෙන් ඉගෙන ගන්න.', cover: '📙' },
];

export const PLANS = [
  {
    name: 'Starter Tier',
    price: 0,
    period: 'forever',
    color: '#8892A4',
    popular: false,
    cta: 'Get Started Free',
    features: ['Access to Public Leaderboard', 'Download 4 Free Guide Books', '1 Daily AI Market Bias setup', 'Community Trading Chat'],
  },
  {
    name: 'TrendLens Pro',
    price: 49,
    period: 'month',
    color: '#00D4FF',
    popular: true,
    cta: 'Claim Pro Access',
    features: ['All Live Multi-Asset Signals (Gold, FX, Crypto)', 'TradingView Pro Chart with Multi-Timeframes', 'Full Academy Access (All Modules)', 'MT5 Webhook Bridge & Instant Copy', 'Real-Time Sound Chime Alerts'],
  },
  {
    name: 'Institutional Elite',
    price: 99,
    period: 'month',
    color: '#00E676',
    popular: false,
    cta: 'Join Institutional Elite',
    features: ['Everything in Pro Plan', 'Whale AOF Absorption Engine L2', 'HSR Bookmap-Style Heatmap Access', 'Magnet Targets Touch Probability %', 'Direct VIP Telegram Dispatch Stream', '1-on-1 Strategy Mentorship'],
  },
];

export const MOCK_TESTIMONIALS = [
  { name: 'Heshan Ranasinghe', role: 'Commodities Trader', country: '🇱🇰', rating: 5, text: 'The Whale AOF engine completely changed how I trade Gold. Seeing absorption at key levels gives you confidence retail traders never have.' },
  { name: 'Tariq Al-Mansoor', role: 'Forex Prop Firm Trader', country: '🇦🇪', rating: 5, text: 'HSR Magnet Targets are incredible. Having touch probability percentages for TP1 and TP2 took away all my exit emotion.' },
  { name: 'Alexandre Dubois', role: 'Crypto & FX Scalper', country: '🇫🇷', rating: 5, text: 'TrendLens Pro bridges the institutional Order Flow tools of Bookmap directly into clean, fast signals. 10/10 recommend.' },
];

export const FAQDATA = [
  { q: 'I have no trading experience. Is this for me?', a: 'Yes! Start with our 4 free beginner guide books in English, Sinhala, Arabic and French, then complete the Academy modules. Always start on a demo account first.' },
  { q: 'Are the guide books really free?', a: 'Yes. The beginner guide books are 100% free to read and download with zero payment required.' },
  { q: 'Which markets are supported by the signals and indicators?', a: 'Gold (XAU/USD), Silver (XAG/USD), Major Forex Pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD), and Crypto (BTC, ETH, SOL).' },
  { q: 'How does the Whale AOF Engine work?', a: 'It monitors broker Level-2 depth in real-time and detects institutional absorption — identifying when big players are silently buying or capping a rally.' },
  { q: 'Can I connect these signals to MetaTrader 5 (MT5)?', a: 'Yes! We provide Webhook and MT5 bridge integration so signals can execute directly on your MT5 terminal.' },
  { q: 'Are you a broker?', a: 'No, we are not a broker. You can use any regulated broker (Exness, XM, IC Markets, Binance, etc.). We provide educational intelligence and analytics.' },
];


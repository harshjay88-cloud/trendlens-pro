// ── Comprehensive 50+ Professional Technical Indicators Library ──
export const ALL_INDICATORS = [
  // 1. Trend (12)
  { id: 'ema9', cat: 'Trend', name: 'EMA 9 (Fast Moving Average)', desc: 'Short-term momentum trigger curve' },
  { id: 'ema21', cat: 'Trend', name: 'EMA 21 (Baseline Trend Filter)', desc: 'Dynamic institutional support/resistance' },
  { id: 'ema50', cat: 'Trend', name: 'EMA 50 (Intermediate Trend)', desc: 'Institutional swing retest benchmark' },
  { id: 'ema200', cat: 'Trend', name: 'EMA 200 (Macro Bull/Bear Baseline)', desc: 'Long-term secular market trend divider' },
  { id: 'sma20', cat: 'Trend', name: 'SMA 20 (Simple Moving Average)', desc: 'Classic 20-period baseline average' },
  { id: 'supertrend', cat: 'Trend', name: 'Supertrend (ATR 10, Factor 3)', desc: 'Dynamic trailing trend stop & reversal line' },
  { id: 'ichimoku', cat: 'Trend', name: 'Ichimoku Kinko Hyo (Cloud)', desc: 'Tenkan, Kijun, and Senkou Span equilibrium cloud' },
  { id: 'bollinger', cat: 'Trend', name: 'Bollinger Bands (20, 2)', desc: '2-sigma volatility expansion & contraction bands' },
  { id: 'keltner', cat: 'Trend', name: 'Keltner Channels (20, 1.5 ATR)', desc: 'ATR-based volatility channel envelope' },
  { id: 'donchian', cat: 'Trend', name: 'Donchian Channels (20)', desc: '20-period highest high and lowest low bands' },
  { id: 'parabolic', cat: 'Trend', name: 'Parabolic SAR (0.02, 0.2)', desc: 'Trailing stop and reverse momentum dots' },
  { id: 'zigzag', cat: 'Trend', name: 'ZigZag Trend Extrema (5%)', desc: 'Identifies major swing highs and swing lows' },

  // 2. Momentum & Oscillators (12)
  { id: 'rsi14', cat: 'Momentum', name: 'RSI 14 (Relative Strength Index)', desc: 'Classic 30/70 overbought & oversold oscillator' },
  { id: 'macd', cat: 'Momentum', name: 'MACD (12, 26, 9)', desc: 'MACD fast line, signal line, and volume histogram' },
  { id: 'stoch', cat: 'Momentum', name: 'Stochastic Oscillator (14, 3, 3)', desc: '%K and %D momentum cross oscillator' },
  { id: 'stochrsi', cat: 'Momentum', name: 'Stochastic RSI (14, 14, 3, 3)', desc: 'Ultra-sensitive fast momentum momentum oscillator' },
  { id: 'cci', cat: 'Momentum', name: 'CCI (Commodity Channel Index 20)', desc: 'Cyclical price statistical deviation' },
  { id: 'williams', cat: 'Momentum', name: 'Williams %R (14)', desc: 'Momentum oscillator bounded between -100 and 0' },
  { id: 'ao', cat: 'Momentum', name: 'Awesome Oscillator (AO)', desc: 'Bill Williams 5/34 period SMA difference' },
  { id: 'mfi', cat: 'Momentum', name: 'Money Flow Index (MFI 14)', desc: 'Volume-weighted institutional RSI oscillator' },
  { id: 'roc', cat: 'Momentum', name: 'Rate of Change (ROC 9)', desc: 'Percentage velocity of price displacement' },
  { id: 'tsi', cat: 'Momentum', name: 'True Strength Index (TSI)', desc: 'Double-smoothed momentum direction' },
  { id: 'ultimate', cat: 'Momentum', name: 'Ultimate Oscillator (7, 14, 28)', desc: 'Multi-timeframe weighted momentum oscillator' },
  { id: 'cmo', cat: 'Momentum', name: 'Chande Momentum Oscillator (CMO)', desc: 'Unsmoothed price momentum ratio' },

  // 3. Volume & Orderflow (10)
  { id: 'vpvr', cat: 'Volume', name: 'Orderflow Volume Profile (VPVR)', desc: 'Horizontal volume at price with Gold POC line' },
  { id: 'poc', cat: 'Volume', name: 'Point of Control (POC)', desc: 'Price node with highest traded volume' },
  { id: 'vah_val', cat: 'Volume', name: 'Value Area High / Low (VAH / VAL)', desc: '70% volume distribution boundary levels' },
  { id: 'vwap', cat: 'Volume', name: 'Institutional VWAP + Dev Bands', desc: 'Volume Weighted Average Price session anchor' },
  { id: 'obv', cat: 'Volume', name: 'On-Balance Volume (OBV)', desc: 'Cumulative volume flow trend indicator' },
  { id: 'cmf', cat: 'Volume', name: 'Chaikin Money Flow (CMF 20)', desc: 'Institutional accumulation and distribution' },
  { id: 'vol_osc', cat: 'Volume', name: 'Volume Oscillator (5, 10)', desc: 'Short vs long volume moving average' },
  { id: 'net_vol', cat: 'Volume', name: 'Net Volume Delta', desc: 'Aggressive buyers minus aggressive sellers delta' },
  { id: 'ad_line', cat: 'Volume', name: 'Accumulation / Distribution Line', desc: 'Volume and close location price measure' },
  { id: 'vol_sma', cat: 'Volume', name: 'Volume SMA 20 Baseline', desc: 'Average trading volume benchmark' },

  // 4. Smart Money Concepts (SMC) (8)
  { id: 'fvg', cat: 'SMC', name: 'ST01 Fair Value Gaps (FVG Zones)', desc: 'Bullish & bearish displacement imbalances' },
  { id: 'ob', cat: 'SMC', name: 'Institutional Order Blocks (OB)', desc: 'Last opposite candle before market displacement' },
  { id: 'sweeps', cat: 'SMC', name: 'Liquidity Pool Sweeps (Session H/L)', desc: 'Asian/London High & Low liquidity stop runs' },
  { id: 'mss_bos', cat: 'SMC', name: 'Market Structure Shift (BOS/CHoCH)', desc: 'Break of structure structural continuation' },
  { id: 'eqh_eql', cat: 'SMC', name: 'Equal Highs / Equal Lows (EQH/EQL)', desc: 'Retail liquidity magnet target levels' },
  { id: 'prem_disc', cat: 'SMC', name: 'Premium & Discount Equilibrium (50%)', desc: 'Fibonacci 0.5 institutional fair value level' },
  { id: 'breaker', cat: 'SMC', name: 'Breaker Blocks (Mitigated OBs)', desc: 'Failed order block flipped into support/resistance' },
  { id: 'bookmap_inferno', cat: 'SMC', name: 'Bookmap Inferno Liquidity Wall Heatmap', desc: 'Real-time resting limit order heatmap' },

  // 5. Volatility (8)
  { id: 'atr14', cat: 'Volatility', name: 'Average True Range (ATR 14)', desc: 'True market volatility expansion in pips' },
  { id: 'bb_width', cat: 'Volatility', name: 'Bollinger Band Width (Squeeze)', desc: 'Detects volatility compression and breakout' },
  { id: 'std_dev', cat: 'Volatility', name: 'Standard Deviation (20)', desc: 'Statistical dispersion of asset prices' },
  { id: 'hist_vol', cat: 'Volatility', name: 'Historical Volatility (HV 30)', desc: 'Annualized price volatility percentage' },
  { id: 'keltner_w', cat: 'Volatility', name: 'Keltner Channel Width', desc: 'Channel boundary volatility range' },
  { id: 'chaikin_vol', cat: 'Volatility', name: 'Chaikin Volatility (10, 10)', desc: 'Spread between high and low expansion' },
  { id: 'mass_index', cat: 'Volatility', name: 'Mass Index (25)', desc: 'Predicts trend reversals via range widening' },
  { id: 'rvi', cat: 'Volatility', name: 'Relative Volatility Index (RVI)', desc: 'Direction of volatility changes' },
];

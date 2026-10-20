/**
 * TrendLens Pro — Simulation data.
 *
 * SIMULATED market data lives here and ONLY here. It is deliberately kept out
 * of the live market-data path so that a simulated price can never be mixed
 * into a real candle series.
 *
 * Rules for this module:
 *  - every function here is explicitly named `generateSimulation*`;
 *  - every candle it returns is tagged `source: 'simulation'`;
 *  - callers must opt in explicitly. There is no automatic fallback: when the
 *    live feed fails the chart shows an unavailable state instead.
 */

/**
 * Generate a simulated OHLCV series.
 *
 * @param {object} options
 * @param {number} options.initialPrice  last price of the series
 * @param {number} options.count          number of bars
 * @param {number} options.barIntervalMs  duration of one bar
 * @param {number} [options.volatility]   volatility factor (0..1)
 * @param {number} [options.decimals=2]   price decimals
 * @param {number} [options.now]          injectable clock
 * @returns {Array<{o,h,l,c,v,t,source}>}
 */
export function generateSimulationCandles({
  initialPrice,
  count = 75,
  barIntervalMs = 60 * 60 * 1000,
  volatility = 0.0018,
  decimals = 2,
  now = Date.now(),
} = {}) {
  const price = Number(initialPrice);
  if (!Number.isFinite(price) || price <= 0) return [];

  const bars = count > 0 ? Math.floor(count) : 0;
  const volBase = price * volatility;

  const rawPrices = [price * 0.98];
  let momentum = 0;
  for (let i = 1; i < bars; i++) {
    if (i % 10 === 0) momentum = (Math.random() - 0.46) * volBase * 0.9;
    const noise = (Math.random() - 0.5) * volBase * 1.4;
    const nextP = Math.max(price * 0.25, rawPrices[rawPrices.length - 1] + momentum + noise);
    rawPrices.push(nextP);
  }

  // Calibrate so the final bar matches the requested price exactly.
  const diffToEnd = price - rawPrices[rawPrices.length - 1];
  const calibrated = rawPrices.map((value, idx) => value + diffToEnd * (idx / Math.max(1, bars - 1)));

  const out = [];
  for (let i = 0; i < bars; i++) {
    const c = +calibrated[i].toFixed(decimals);
    const o = +(i === 0 ? c - volBase * 0.4 : calibrated[i - 1]).toFixed(decimals);
    const wickH = Math.random() * volBase * 0.65;
    const wickL = Math.random() * volBase * 0.65;
    const h = +(Math.max(o, c) + wickH).toFixed(decimals);
    const l = +(Math.min(o, c) - wickL).toFixed(decimals);
    const t = now - (bars - 1 - i) * barIntervalMs;
    out.push({ o, h, l, c, v: Math.floor(Math.random() * 8500 + 1500), t, source: 'simulation' });
  }
  return out;
}

/**
 * Simulated MACRO / multi-year series used by the long-range chart views.
 */
export function generateSimulationMacroCandles({
  initialPrice,
  count = 260,
  barIntervalMs = 24 * 60 * 60 * 1000,
  decimals = 2,
  now = Date.now(),
} = {}) {
  const price = Number(initialPrice);
  if (!Number.isFinite(price) || price <= 0) return [];

  const bars = count > 0 ? Math.floor(count) : 0;
  const volBase = price * 0.016;
  const rawPrices = [price * 0.58];
  let momentum = 0;
  for (let i = 1; i < bars; i++) {
    if (i % 10 === 0) momentum = (Math.random() - 0.46) * volBase * 0.9;
    const cycleWave = Math.sin((i / bars) * Math.PI * 3.4) * (price * 0.2);
    const noise = (Math.random() - 0.5) * volBase * 1.4;
    const nextP = Math.max(
      price * 0.25,
      rawPrices[rawPrices.length - 1] + momentum + noise + cycleWave * 0.05
    );
    rawPrices.push(nextP);
  }

  const diffToEnd = price - rawPrices[rawPrices.length - 1];
  const calibrated = rawPrices.map((value, idx) => value + diffToEnd * (idx / Math.max(1, bars - 1)));

  const out = [];
  for (let i = 0; i < bars; i++) {
    const c = +calibrated[i].toFixed(decimals);
    const o = +(i === 0 ? c - volBase * 0.4 : calibrated[i - 1]).toFixed(decimals);
    const wickH = Math.random() * volBase * 0.65;
    const wickL = Math.random() * volBase * 0.65;
    const h = +(Math.max(o, c) + wickH).toFixed(decimals);
    const l = +(Math.min(o, c) - wickL).toFixed(decimals);
    const t = now - (bars - 1 - i) * barIntervalMs;
    out.push({ o, h, l, c, v: Math.floor(Math.random() * 8500 + 1500), t, source: 'simulation' });
  }
  return out;
}

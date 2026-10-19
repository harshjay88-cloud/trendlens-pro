import { create } from 'zustand';
import { MOCK_PRICES } from '../utils/mockData.js';

export const useMarketStore = create((set, get) => ({
  prices: { ...MOCK_PRICES },
  selectedCategory: 'All',
  lastUpdated: new Date(),
  isLive: true,

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getCategoryPrices: () => {
    const { prices, selectedCategory } = get();
    if (selectedCategory === 'All') return Object.entries(prices);
    return Object.entries(prices).filter(([_, data]) => data.category === selectedCategory);
  },

  // Update a single asset price with calculated change
  updatePrice: (asset, newPrice, customChangePct = null, customHigh = null, customLow = null) => {
    set(state => {
      const current = state.prices[asset] || { price: newPrice, change: 0, changePct: 0, high: newPrice, low: newPrice, category: 'Crypto' };
      let change, changePct;
      if (customChangePct !== null && typeof customChangePct === 'number') {
        changePct = +customChangePct.toFixed(2);
        change = +(newPrice * (changePct / 100)).toFixed(2);
      } else {
        change = +(newPrice - (current.price - current.change)).toFixed(2);
        const prevBase = current.price - current.change || current.price;
        changePct = +((change / prevBase) * 100).toFixed(2);
      }

      const high = customHigh !== null ? customHigh : Math.max(current.high || newPrice, newPrice);
      const low = customLow !== null ? customLow : Math.min(current.low || newPrice, newPrice);

      return {
        prices: {
          ...state.prices,
          [asset]: {
            ...current,
            price: newPrice,
            change,
            changePct,
            high,
            low,
          },
        },
        lastUpdated: new Date(),
      };
    });
  },

  // Simulate or sync live tick
  tick: () => {
    set(state => {
      const nextPrices = { ...state.prices };
      Object.keys(nextPrices).forEach(asset => {
        const item = nextPrices[asset];
        const isForex = item.category === 'Forex';
        // micro variation
        const deltaPct = (Math.random() - 0.495) * (isForex ? 0.0003 : 0.001);
        const decimals = item.price > 100 ? 2 : 4;
        const newPrice = +(item.price * (1 + deltaPct)).toFixed(decimals);
        const change = +(item.change + (newPrice - item.price)).toFixed(decimals);
        const changePct = +(item.changePct + (deltaPct * 100)).toFixed(2);
        
        nextPrices[asset] = {
          ...item,
          price: newPrice,
          change,
          changePct,
          high: Math.max(item.high, newPrice),
          low: Math.min(item.low, newPrice),
        };
      });

      return {
        prices: nextPrices,
        lastUpdated: new Date(),
      };
    });
  },

  // Fetch real crypto and commodity prices directly from Bybit V5 public endpoint
  fetchLiveCrypto: async () => {
    try {
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
      if (!res.ok) return;
      const data = await res.json();
      if (data.retCode !== 0 || !Array.isArray(data.result?.list)) return;

      const symbolMap = {
        'BTCUSDT': 'BTC/USD',
        'ETHUSDT': 'ETH/USD',
        'SOLUSDT': 'SOL/USD',
        'BNBUSDT': 'BNB/USD',
        'XRPUSDT': 'XRP/USD',
        'DOGEUSDT': 'DOGE/USD',
        'ADAUSDT': 'ADA/USD',
        'AVAXUSDT': 'AVAX/USD',
        'LINKUSDT': 'LINK/USD',
        'SUIUSDT': 'SUI/USD',
        'NEARUSDT': 'NEAR/USD',
        'APTUSDT': 'APT/USD',
        'DOTUSDT': 'DOT/USD',
        'LTCUSDT': 'LTC/USD',
        'UNIUSDT': 'UNI/USD',
        'TONUSDT': 'TON/USD',
        'SHIB1000USDT': 'SHIB/USD',
        'PEPEUSDT': 'PEPE/USD',
        'RENDERUSDT': 'RENDER/USD',
        'TAOUSDT': 'TAO/USD',
        'EURUSDUSDT': 'EUR/USD',
        'GBPUSDUSDT': 'GBP/USD',
        'USDJPYUSDT': 'USD/JPY',
        'XAUUSDT': 'XAU/USD'
      };

      data.result.list.forEach(item => {
        const pair = symbolMap[item.symbol];
        if (pair) {
          const px = parseFloat(item.lastPrice);
          if (px > 0) {
            const pcnt = parseFloat(item.price24hPcnt) * 100;
            const high = parseFloat(item.highPrice24h) || px;
            const low = parseFloat(item.lowPrice24h) || px;
            const decimals = px > 100 ? 2 : px > 1 ? 4 : 6;
            get().updatePrice(pair, +px.toFixed(decimals), pcnt, high, low);
          }
        }
      });
    } catch {
      // Fallback silently if offline
    }
  },
}));

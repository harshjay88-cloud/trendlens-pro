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
  updatePrice: (asset, newPrice) => {
    set(state => {
      const current = state.prices[asset] || { price: newPrice, change: 0, changePct: 0, high: newPrice, low: newPrice, category: 'Forex' };
      const change = +(newPrice - (current.price - current.change)).toFixed(2);
      const prevBase = current.price - current.change || current.price;
      const changePct = +((change / prevBase) * 100).toFixed(2);
      const high = Math.max(current.high || newPrice, newPrice);
      const low = Math.min(current.low || newPrice, newPrice);

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

  // Fetch real crypto prices from Binance public API
  fetchLiveCrypto: async () => {
    try {
      const symbols = [
        "BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT",
        "DOGEUSDT","ADAUSDT","AVAXUSDT","LINKUSDT","SUIUSDT",
        "NEARUSDT","APTUSDT","DOTUSDT","LTCUSDT","UNIUSDT"
      ];
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`);
      if (!res.ok) return;
      const data = await res.json();
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
      };
      data.forEach(item => {
        const pair = symbolMap[item.symbol];
        if (pair) {
          const px = parseFloat(item.lastPrice);
          const decimals = px > 100 ? 2 : px > 1 ? 4 : 6;
          get().updatePrice(pair, +px.toFixed(decimals));
        }
      });
    } catch {
      // Fallback silently if offline or blocked by CORS
    }
  },
}));

import { create } from 'zustand';
import { MOCK_PRICES } from '../utils/mockData.js';
import { BYBIT_PUBLIC_REST_BASE } from '../config/tradingMode.js';

export const FEED_STATUS = Object.freeze({
  LIVE: 'LIVE',
  PARTIAL: 'PARTIAL',
  DEMO: 'DEMO',
  DISCONNECTED: 'DISCONNECTED',
});

export const useMarketStore = create((set, get) => ({
  /**
   * Reference prices. These are DEMO values and are only used until a real
   * Bybit ticker arrives for that instrument. They are never presented as
   * live data — `feedStatus` and `liveAssets` describe exactly which values
   * came from the exchange.
   */
  prices: { ...MOCK_PRICES },
  liveAssets: [],
  feedStatus: FEED_STATUS.DEMO,
  lastUpdated: null,
  selectedCategory: 'All',

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getCategoryPrices: () => {
    const { prices, selectedCategory } = get();
    if (selectedCategory === 'All') return Object.entries(prices);
    return Object.entries(prices).filter(([, data]) => data.category === selectedCategory);
  },

  /** True when the displayed price for this asset came from Bybit. */
  isLiveAsset: (asset) => get().liveAssets.includes(asset),

  // Update a single asset price with calculated change
  updatePrice: (asset, newPrice, customChangePct = null, customHigh = null, customLow = null, isLive = false) => {
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

      const liveAssets = isLive && !state.liveAssets.includes(asset)
        ? [...state.liveAssets, asset]
        : state.liveAssets;

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
            isLive,
          },
        },
        liveAssets,
        lastUpdated: isLive ? new Date() : state.lastUpdated,
      };
    });
  },

  /**
   * Fetch real tickers from Bybit's public endpoint.
   * Failures are surfaced through `feedStatus` instead of being swallowed, so
   * the UI can show a disconnected state rather than silently showing
   * reference values as if they were live.
   */
  fetchLiveCrypto: async () => {
    try {
      const res = await fetch(`${BYBIT_PUBLIC_REST_BASE}/v5/market/tickers?category=linear`);
      if (!res.ok) {
        set(state => ({ feedStatus: state.liveAssets.length ? FEED_STATUS.PARTIAL : FEED_STATUS.DISCONNECTED }));
        return;
      }
      const data = await res.json();
      if (data.retCode !== 0 || !Array.isArray(data.result?.list)) {
        set(state => ({ feedStatus: state.liveAssets.length ? FEED_STATUS.PARTIAL : FEED_STATUS.DISCONNECTED }));
        return;
      }

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
        'TONUSDT': 'TON/USD',
        'SHIB1000USDT': 'SHIB/USD',
        'PEPEUSDT': 'PEPE/USD',
        'RENDERUSDT': 'RENDER/USD',
        'TAOUSDT': 'TAO/USD',
        'ARBUSDT': 'ARB/USD',
        'OPUSDT': 'OP/USD',
        'INJUSDT': 'INJ/USD',
        'TIAUSDT': 'TIA/USD',
        'KASUSDT': 'KAS/USD',
        'FTMUSDT': 'FTM/USD',
        'FILUSDT': 'FIL/USD',
        'ICPUSDT': 'ICP/USD',
        'VETUSDT': 'VET/USD',
        'ALGOUSDT': 'ALGO/USD',
        'AAVEUSDT': 'AAVE/USD',
        'MKRUSDT': 'MKR/USD',
        'STXUSDT': 'STX/USD',
        'RUNEUSDT': 'RUNE/USD',
        'WIFUSDT': 'WIF/USD',
        'BONKUSDT': 'BONK/USD',
        'FLOKIUSDT': 'FLOKI/USD',
        'JASMYUSDT': 'JASMY/USD',
        'NOTUSDT': 'NOT/USD',
        'FETUSDT': 'FET/USD',
        'SEIUSDT': 'SEI/USD',
        'WLDUSDT': 'WLD/USD',
        'IMXUSDT': 'IMX/USD',
        'PYTHUSDT': 'PYTH/USD',
        'PENDLEUSDT': 'PENDLE/USD',
        'ONDOUSDT': 'ONDO/USD',
        'JUPUSDT': 'JUP/USD',
        'STRKUSDT': 'STRK/USD',
        'ORDIUSDT': 'ORDI/USD',
        'ENAUSDT': 'ENA/USD',
        'EURUSDUSDT': 'EUR/USD',
        'GBPUSDUSDT': 'GBP/USD',
        'USDJPYUSDT': 'USD/JPY',
        'XAUUSDT': 'XAU/USD',
        'XAGUSDT': 'XAG/USD',
        'XPTUSDT': 'XPT/USD',
      };

      let applied = 0;
      data.result.list.forEach(item => {
        const pair = symbolMap[item.symbol];
        if (pair) {
          const px = parseFloat(item.lastPrice);
          if (px > 0) {
            const pcnt = parseFloat(item.price24hPcnt) * 100;
            const high = parseFloat(item.highPrice24h) || px;
            const low = parseFloat(item.lowPrice24h) || px;
            const decimals = px > 100 ? 2 : px > 1 ? 4 : 6;
            get().updatePrice(pair, +px.toFixed(decimals), pcnt, high, low, true);
            applied++;
          }
        }
      });

      set(state => ({
        feedStatus: applied > 0 ? FEED_STATUS.LIVE : FEED_STATUS.DISCONNECTED,
        lastUpdated: new Date(),
      }));
    } catch {
      set(() => ({
        feedStatus: state.liveAssets.length ? FEED_STATUS.PARTIAL : FEED_STATUS.DISCONNECTED,
      }));
    }
  },
}));

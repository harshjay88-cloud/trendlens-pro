import React, { useEffect } from 'react';
import { useMarketStore } from '../../store/marketStore.js';
import './PriceTickerBar.css';

export default function PriceTickerBar() {
  const { prices, tick, fetchLiveCrypto } = useMarketStore();

  useEffect(() => {
    // Poll real prices from crypto API
    fetchLiveCrypto();
    const cryptoIv = setInterval(fetchLiveCrypto, 30000);

    // Live tick engine for micro fluctuations
    const tickIv = setInterval(() => {
      tick();
    }, 2500);

    return () => {
      clearInterval(cryptoIv);
      clearInterval(tickIv);
    };
  }, [tick, fetchLiveCrypto]);

  const assets = Object.entries(prices);
  // Duplicate for seamless infinite marquee loop
  const items = [...assets, ...assets];

  return (
    <div className="ticker-bar">
      <div className="ticker-label">
        <span className="live-dot"></span> LIVE
      </div>
      <div className="ticker-track">
        <div className="ticker-inner">
          {items.map(([asset, data], i) => (
            <div key={`${asset}-${i}`} className="ticker-item">
              <span className="ticker-asset">{asset}</span>
              <span className="ticker-price">
                {typeof data.price === 'number' && data.price > 100
                  ? data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : (data.price?.toFixed(4) ?? '---')
                }
              </span>
              <span className={`ticker-change ${data.changePct >= 0 ? 'up' : 'down'}`}>
                {data.changePct >= 0 ? '▲' : '▼'} {Math.abs(data.changePct).toFixed(2)}%
              </span>
              <span className="ticker-sep">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

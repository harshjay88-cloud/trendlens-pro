import React, { useEffect } from 'react';
import { useMarketStore, FEED_STATUS } from '../../store/marketStore.js';
import './PriceTickerBar.css';

const FEED_LABEL = {
  [FEED_STATUS.LIVE]: 'LIVE',
  [FEED_STATUS.PARTIAL]: 'PARTIAL',
  [FEED_STATUS.DEMO]: 'DEMO',
  [FEED_STATUS.DISCONNECTED]: 'OFFLINE',
};

export default function PriceTickerBar() {
  const { prices, feedStatus, fetchLiveCrypto } = useMarketStore();

  useEffect(() => {
    // Poll real prices from the public Bybit market-data endpoint.
    fetchLiveCrypto();
    const cryptoIv = setInterval(fetchLiveCrypto, 4000);

    return () => {
      clearInterval(cryptoIv);
    };
  }, [fetchLiveCrypto]);

  const assets = Object.entries(prices);
  // Duplicate for seamless infinite marquee loop
  const items = [...assets, ...assets];

  return (
    <div className="ticker-bar">
      <div className="ticker-label">
        <span className="live-dot"></span> {FEED_LABEL[feedStatus] || feedStatus}
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

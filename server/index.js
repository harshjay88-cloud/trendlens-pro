/**
 * TrendLens Pro — Bybit Demo proxy entry point.
 *
 * Starts the proxy on the configured host/port.
 */

import { config, hasCredentials } from './config.js';
import { createProxyServer } from './app.js';

const server = createProxyServer();

server.listen(config.port, config.host, () => {
  console.log(`[trendlens-proxy] listening on http://${config.host}:${config.port}/api/bybit`);
  console.log(
    `[trendlens-proxy] environment=bybit-demo credentialsConfigured=${hasCredentials()} tradingEnabled=${config.tradingEnabled}`
  );
});

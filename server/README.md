# TrendLens Pro — Bybit Demo Proxy

A minimal, dependency-free Node server that relays authenticated **Bybit Demo
Trading** requests for the frontend.

## Why this exists

The browser cannot safely hold a Bybit API secret. Any secret shipped to the
frontend is readable by every visitor of the deployed site, by browser
extensions, and by anyone who opens DevTools. This server:

- keeps the API key and secret in server-side environment variables only;
- is the only process that can reach the Bybit Demo REST API;
- **cannot** reach Mainnet or Testnet — the Demo base is a hardcoded constant
  with no override path.

## Requirements

- Node.js 20 or newer
- A Bybit **Demo Trading** API key (create it under Bybit → Account → API Key
  with the Demo environment selected)

## Setup

```bash
cd server
cp .env.example .env      # then fill in BYBIT_DEMO_API_KEY / BYBIT_DEMO_API_SECRET
npm start                 # http://127.0.0.1:8787/api/bybit
```

No `npm install` is required — the server only uses Node built-ins.

## Connecting the frontend

The frontend reads the proxy base from `VITE_BYBIT_PROXY_BASE` and defaults to
the same-origin path `/api/bybit`.

- **Development** — `vite.config.js` already proxies `/api/bybit` to
  `http://127.0.0.1:8787`, so no extra configuration is needed.
- **Production (GitHub Pages)** — the frontend is static, so point it at the
  deployed proxy:

  ```bash
  # .env.production (committed — this is a URL, not a secret)
  VITE_BYBIT_PROXY_BASE=https://your-proxy-host.example.com/api/bybit
  ```

  The proxy must be served over HTTPS and its origin must be listed in
  `ALLOWED_ORIGINS`.

## Routes

| Method | Route | Auth | Mutates account | Notes |
|---|---|---|---|---|
| GET | `/api/bybit/status` | no | no | Environment + readiness. Never returns credentials. |
| GET | `/api/bybit/account/balance` | yes | no | Demo wallet balance. |
| GET | `/api/bybit/positions` | yes | no | Demo open positions. |
| GET | `/api/bybit/orders` | yes | no | Demo orders. |
| GET | `/api/bybit/execution` | yes | no | Demo execution history. |
| POST | `/api/bybit/order` | yes | **yes** | Place a demo order. Gated. |
| POST | `/api/bybit/position/close` | yes | **yes** | Close a demo position. Gated. |
| POST | `/api/bybit/position/close-all` | yes | **yes** | Close all demo positions. Gated. |
| POST | `/api/bybit/leverage` | yes | **yes** | Set demo leverage. Gated. |

### The mutation gate

Every mutating route requires **all** of:

1. `BYBIT_DEMO_TRADING_ENABLED=true` in the server environment (default `false`);
2. the `x-trendlens-confirm: DEMO_ORDER` request header;
3. `x-trendlens-proxy-token: <BYBIT_PROXY_TOKEN>` when `BYBIT_PROXY_TOKEN` is set.

With the default configuration every mutating route answers
`403 { code: "TRADING_DISABLED" }` and **nothing reaches Bybit**.

Symbols are validated against Bybit's public `instruments-info` endpoint before
an order is built, so an unmapped instrument can never be substituted with a
different one.

## Security notes

- The secret is used only to compute the HMAC-SHA256 request signature. It is
  never returned to a client, never logged, and never written to disk by the
  server.
- Request bodies and headers are not logged — only method, path and status.
- Put the proxy behind HTTPS and, ideally, behind an IP allowlist or a
  session-authenticated layer before exposing it publicly. The proxy does not
  implement user authentication; it assumes the caller is the deployed
  frontend.
- Revoke any Bybit key that was ever committed to a public frontend. Removing
  it from source is not enough — it is already in the browser's cache and in
  git history.

## Verification

```bash
curl http://127.0.0.1:8787/api/bybit/status
# {"ok":true,"environment":"bybit-demo","credentialsConfigured":true,"tradingEnabled":false,...}

curl -X POST http://127.0.0.1:8787/api/bybit/order \
  -H 'content-type: application/json' \
  -H 'x-trendlens-confirm: DEMO_ORDER' \
  -d '{"symbol":"BTCUSDT","side":"Buy","qty":"0.001"}'
# {"ok":false,"code":"TRADING_DISABLED",...}   <-- nothing reached Bybit
```

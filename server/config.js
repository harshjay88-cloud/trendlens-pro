/**
 * TrendLens Pro — server configuration.
 *
 * Credentials are read from the process environment (optionally seeded from a
 * local `.env` file that is never committed). Nothing in this module is ever
 * returned to the browser, and no value is written to a log.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const parseEnvFile = (filePath) => {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
};

const fileEnv = parseEnvFile(path.join(here, '.env'));

const readEnv = (key, fallback = undefined) => {
  const value = process.env[key] ?? fileEnv[key] ?? fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  return value;
};

const parseBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const config = {
  port: Number(readEnv('PORT', 8787)),
  host: readEnv('HOST', '127.0.0.1'),

  /** Bybit Demo Trading credentials. Server-side only. */
  apiKey: readEnv('BYBIT_DEMO_API_KEY', ''),
  apiSecret: readEnv('BYBIT_DEMO_API_SECRET', ''),

  /**
   * Master gate for anything that mutates the demo account.
   * Defaults to FALSE. Order placement, position closing and leverage changes
   * are refused with 403 until this is explicitly enabled server-side.
   */
  tradingEnabled: parseBool(readEnv('BYBIT_DEMO_TRADING_ENABLED', false), false),

  /** Optional shared secret the browser must present on mutating routes. */
  proxyToken: readEnv('BYBIT_PROXY_TOKEN', ''),

  /** Origins allowed to call this proxy (dev server + deployed frontend). */
  allowedOrigins: String(readEnv('ALLOWED_ORIGINS', 'http://localhost:5173'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  recvWindow: String(readEnv('BYBIT_RECV_WINDOW', '5000')),
};

export const hasCredentials = () =>
  Boolean(config.apiKey && config.apiSecret && config.apiKey.trim() && config.apiSecret.trim());

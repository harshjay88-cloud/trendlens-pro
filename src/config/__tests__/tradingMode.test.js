import { describe, it, expect } from 'vitest';
import {
  TRADING_MODES,
  BYBIT_DEMO_REST_BASE,
  validatePrivateBase,
  assertPrivateBase,
  resolveBybitSymbol,
  assertBybitSymbol,
  assertOrderAllowed,
  ERROR_CODES,
} from '../tradingMode.js';

describe('private endpoint validation (fail-closed)', () => {
  it('accepts the Bybit Demo REST base', () => {
    const result = validatePrivateBase(BYBIT_DEMO_REST_BASE);
    expect(result.ok).toBe(true);
    expect(result.base).toBe(BYBIT_DEMO_REST_BASE);
  });

  it('rejects mainnet', () => {
    const result = validatePrivateBase('https://api.bybit.com');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.LIVE_TRADING_BLOCKED);
  });

  it('rejects testnet', () => {
    const result = validatePrivateBase('https://api-testnet.bybit.com');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.LIVE_TRADING_BLOCKED);
  });

  it('rejects an unknown endpoint', () => {
    const result = validatePrivateBase('https://example.invalid');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.ENDPOINT_NOT_ALLOWED);
  });

  it('rejects an empty endpoint', () => {
    const result = validatePrivateBase('');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.ENDPOINT_MISSING);
  });

  it('is not fooled by trailing slashes or casing', () => {
    expect(validatePrivateBase('https://api-demo.bybit.com/').ok).toBe(true);
    expect(validatePrivateBase('HTTPS://API-DEMO.BYBIT.COM').ok).toBe(true);
    expect(validatePrivateBase('https://api.bybit.com/').ok).toBe(false);
  });

  it('assertPrivateBase throws with a machine-readable code', () => {
    expect(() => assertPrivateBase('https://api.bybit.com')).toThrowError(
      /Mainnet trading is permanently disabled/
    );
    try {
      assertPrivateBase('https://api.bybit.com');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODES.LIVE_TRADING_BLOCKED);
    }
  });
});

describe('symbol resolution never degrades to BTCUSDT', () => {
  it('maps gold to the real Bybit gold contract', () => {
    expect(resolveBybitSymbol('XAU/USD').symbol).toBe('XAUUSDT');
    expect(resolveBybitSymbol('XAUUSD').symbol).toBe('XAUUSDT');
    expect(resolveBybitSymbol('GOLD').symbol).toBe('XAUUSDT');
  });

  it('never returns BTCUSDT for a non-bitcoin instrument', () => {
    const cases = ['XAU/USD', 'GOLD', 'XAG/USD', 'EUR/USD', 'EURUSD'];
    for (const pair of cases) {
      const result = resolveBybitSymbol(pair);
      if (result.ok) {
        expect(result.symbol).not.toBe('BTCUSDT');
      }
    }
  });

  it('maps major pairs and crypto pairs', () => {
    expect(resolveBybitSymbol('BTC/USD').symbol).toBe('BTCUSDT');
    expect(resolveBybitSymbol('BTCUSDT').symbol).toBe('BTCUSDT');
    expect(resolveBybitSymbol('EUR/USD').symbol).toBe('EURUSDUSDT');
    expect(resolveBybitSymbol('USD/JPY').symbol).toBe('USDJPYUSDT');
  });

  it('rejects an unmappable symbol instead of guessing', () => {
    const result = resolveBybitSymbol('NOT A SYMBOL');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ERROR_CODES.UNSUPPORTED_SYMBOL);
    expect(() => assertBybitSymbol('NOT A SYMBOL')).toThrowError();
  });
});

describe('order execution gate', () => {
  const openGates = {
    mode: TRADING_MODES.BYBIT_DEMO,
    autoTradeEnabled: true,
    consentGiven: true,
    symbol: 'BTCUSDT',
  };

  it('allows an order when every gate is open', () => {
    expect(() => assertOrderAllowed(openGates)).not.toThrow();
  });

  it('refuses in PAPER mode', () => {
    expect(() => assertOrderAllowed({ ...openGates, mode: TRADING_MODES.PAPER })).toThrowError(
      /BYBIT DEMO mode/
    );
  });

  it('refuses in BACKTEST mode', () => {
    expect(() => assertOrderAllowed({ ...openGates, mode: TRADING_MODES.BACKTEST })).toThrowError(
      /BYBIT DEMO mode/
    );
  });

  it('refuses when automated trading is disabled', () => {
    expect(() => assertOrderAllowed({ ...openGates, autoTradeEnabled: false })).toThrowError(
      /Automated trading is disabled/
    );
  });

  it('refuses without explicit consent', () => {
    expect(() => assertOrderAllowed({ ...openGates, consentGiven: false })).toThrowError(
      /explicit user confirmation/
    );
  });

  it('refuses an unmappable symbol', () => {
    expect(() => assertOrderAllowed({ ...openGates, symbol: 'NOPE' })).toThrowError();
  });
});

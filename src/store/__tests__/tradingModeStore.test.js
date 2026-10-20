import { describe, it, expect, beforeEach } from 'vitest';
import { useTradingModeStore, TRADING_MODES } from '../tradingModeStore.js';

const reset = () => {
  useTradingModeStore.setState({
    mode: TRADING_MODES.PAPER,
    autoTradeEnabled: false,
    orderConsentGiven: false,
  });
};

beforeEach(reset);

describe('trading mode store', () => {
  it('defaults to PAPER mode', () => {
    expect(useTradingModeStore.getState().mode).toBe(TRADING_MODES.PAPER);
  });

  it('defaults automated trading to OFF and consent to false', () => {
    const state = useTradingModeStore.getState();
    expect(state.autoTradeEnabled).toBe(false);
    expect(state.orderConsentGiven).toBe(false);
    expect(state.canPlaceExchangeOrders()).toBe(false);
  });

  it('does not allow exchange orders in PAPER mode even with both opt-ins set', () => {
    useTradingModeStore.setState({ autoTradeEnabled: true, orderConsentGiven: true });
    expect(useTradingModeStore.getState().canPlaceExchangeOrders()).toBe(false);
    expect(useTradingModeStore.getState().orderBlockReason()).toBe('MODE_NOT_ALLOWED');
  });

  it('requires the automated-trading opt-in', () => {
    useTradingModeStore.setState({ mode: TRADING_MODES.BYBIT_DEMO, orderConsentGiven: true });
    expect(useTradingModeStore.getState().canPlaceExchangeOrders()).toBe(false);
    expect(useTradingModeStore.getState().orderBlockReason()).toBe('TRADING_DISABLED');
  });

  it('requires explicit consent', () => {
    useTradingModeStore.setState({ mode: TRADING_MODES.BYBIT_DEMO, autoTradeEnabled: true });
    expect(useTradingModeStore.getState().canPlaceExchangeOrders()).toBe(false);
    expect(useTradingModeStore.getState().orderBlockReason()).toBe('CONSENT_REQUIRED');
  });

  it('allows exchange orders only when every gate is open', () => {
    useTradingModeStore.getState().setMode(TRADING_MODES.BYBIT_DEMO);
    useTradingModeStore.getState().setAutoTradeEnabled(true);
    useTradingModeStore.getState().setOrderConsentGiven(true);
    expect(useTradingModeStore.getState().canPlaceExchangeOrders()).toBe(true);
    expect(useTradingModeStore.getState().orderBlockReason()).toBeNull();
  });

  it('clears both opt-ins when the mode changes', () => {
    useTradingModeStore.getState().setMode(TRADING_MODES.BYBIT_DEMO);
    useTradingModeStore.getState().setAutoTradeEnabled(true);
    useTradingModeStore.getState().setOrderConsentGiven(true);
    useTradingModeStore.getState().setMode(TRADING_MODES.PAPER);

    const state = useTradingModeStore.getState();
    expect(state.mode).toBe(TRADING_MODES.PAPER);
    expect(state.autoTradeEnabled).toBe(false);
    expect(state.orderConsentGiven).toBe(false);
  });

  it('clears consent when automated trading is toggled', () => {
    useTradingModeStore.getState().setMode(TRADING_MODES.BYBIT_DEMO);
    useTradingModeStore.getState().setAutoTradeEnabled(true);
    useTradingModeStore.getState().setOrderConsentGiven(true);
    useTradingModeStore.getState().setAutoTradeEnabled(false);
    expect(useTradingModeStore.getState().orderConsentGiven).toBe(false);
  });
});

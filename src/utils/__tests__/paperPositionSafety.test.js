import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  SAFETY_CODES,
  canClosePosition,
  canonicalAssetId,
  findTickerPrice,
  isSameAsset,
  isValidExitPrice,
} from '../paperPositionSafety.js';
import { useDemoAccountStore } from '../../store/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');
const chartPath = path.join(repoRoot, 'src', 'components', 'common', 'TrendLensUltraChart.jsx');
const panelPath = path.join(repoRoot, 'src', 'components', 'common', 'TrendLensBotPanel.jsx');
const terminalPath = path.join(repoRoot, 'src', 'components', 'common', 'BybitProTerminal.jsx');
const chartSource = readFileSync(chartPath, 'utf8');
const panelSource = readFileSync(panelPath, 'utf8');
const terminalSource = readFileSync(terminalPath, 'utf8');

const baseAccount = () => ({
  initialBalance: 10000,
  balance: 10000,
  equity: 10000,
  realizedPnL: 0,
  unrealizedPnL: 0,
  winCount: 0,
  lossCount: 0,
  trades: [],
  simulatedTrades: [],
  openPosition: null,
  isAutoBotActive: false,
});

const resetAccount = () => {
  try { localStorage.removeItem('tl_demo_account'); } catch {}
  useDemoAccountStore.setState({ account: baseAccount() });
};

const account = () => useDemoAccountStore.getState().account;

const openXau = () =>
  useDemoAccountStore.getState().openDemoTrade({
    asset: 'XAU/USD',
    buy: true,
    entry: 2645.8,
    sl: 2630,
    tp1: 2660,
    score: 70,
    reason: 'test',
    lotSize: 1,
    marginUsdt: 200,
    leverage: 20,
    pipMultiplier: 10,
  });

beforeEach(() => resetAccount());

// ── Identity helpers ───────────────────────────────────────────────────────

describe('instrument identity', () => {
  it('resolves the same instrument from different labels', () => {
    expect(canonicalAssetId('XAU/USD')).toBe('XAUUSDT');
    expect(canonicalAssetId('XAUUSDT')).toBe('XAUUSDT');
    expect(canonicalAssetId('BTC/USD')).toBe('BTCUSDT');
    expect(canonicalAssetId('BTC/USDT')).toBe('BTCUSDT');
    expect(isSameAsset('BTC/USD', 'BTC/USDT')).toBe(true);
    expect(isSameAsset('XAU/USD', 'BTC/USD')).toBe(false);
  });

  it('never treats an unresolvable identity as a match', () => {
    expect(isSameAsset('XAU/USD', undefined)).toBe(false);
    expect(isSameAsset('', '')).toBe(false);
    expect(canonicalAssetId(null)).toBeNull();
  });

  it('rejects a missing or malformed exit price', () => {
    expect(isValidExitPrice(100)).toBe(true);
    expect(isValidExitPrice(0)).toBe(false);
    expect(isValidExitPrice(-1)).toBe(false);
    expect(isValidExitPrice(NaN)).toBe(false);
    expect(isValidExitPrice(undefined)).toBe(false);
  });
});

describe('canClosePosition', () => {
  const position = { asset: 'XAU/USD', entryPrice: 2645.8 };

  it('allows a close with a price that belongs to the position', () => {
    const verdict = canClosePosition({ position, exitPrice: 2650, exitAsset: 'XAU/USD' });
    expect(verdict.allowed).toBe(true);
  });

  it('refuses a price from another instrument', () => {
    const verdict = canClosePosition({ position, exitPrice: 80000, exitAsset: 'BTC/USD' });
    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe(SAFETY_CODES.ASSET_MISMATCH);
  });

  it('refuses an unattributed price', () => {
    const verdict = canClosePosition({ position, exitPrice: 2650, exitAsset: undefined });
    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe(SAFETY_CODES.UNVERIFIED_EXIT);
  });

  it('refuses a stale or malformed price', () => {
    expect(canClosePosition({ position, exitPrice: NaN, exitAsset: 'XAU/USD' }).code).toBe(
      SAFETY_CODES.INVALID_EXIT_PRICE
    );
    expect(canClosePosition({ position, exitPrice: 0, exitAsset: 'XAU/USD' }).code).toBe(
      SAFETY_CODES.INVALID_EXIT_PRICE
    );
  });

  it('refuses when there is no position', () => {
    expect(canClosePosition({ position: null, exitPrice: 1, exitAsset: 'XAU/USD' }).code).toBe(
      SAFETY_CODES.NO_POSITION
    );
  });
});

describe('findTickerPrice', () => {
  it('finds a price by canonical instrument', () => {
    const map = { BTCUSDT: { price: 80000 }, XAUUSDT: { price: 2650 } };
    expect(findTickerPrice(map, 'BTC/USD')).toBe(80000);
    expect(findTickerPrice(map, 'XAU/USD')).toBe(2650);
  });

  it('returns null for an instrument that is not present', () => {
    expect(findTickerPrice({ BTCUSDT: { price: 80000 } }, 'XAU/USD')).toBeNull();
    expect(findTickerPrice(null, 'XAU/USD')).toBeNull();
  });
});

// ── Store behaviour (executable integration) ──────────────────────────────

describe('TEST 1 — opening position A succeeds', () => {
  it('opens the position and reports success', () => {
    const result = openXau();
    expect(result.ok).toBe(true);
    expect(account().openPosition).toBeTruthy();
    expect(account().openPosition.asset).toBe('XAU/USD');
    expect(account().balance).toBe(10000);
    expect(account().unrealizedPnL).toBe(0);
  });
});

describe('TEST 2 — opening position B while A remains open is rejected and nothing changes', () => {
  it('rejects the second open and leaves the account untouched', () => {
    openXau();
    const before = JSON.parse(JSON.stringify(account()));

    const second = useDemoAccountStore.getState().openDemoTrade({
      asset: 'BTC/USD',
      buy: false,
      entry: 80000,
      sl: 80500,
      tp1: 79000,
      lotSize: 1,
      marginUsdt: 200,
      leverage: 20,
      pipMultiplier: 10,
    });

    expect(second.ok).toBe(false);
    expect(second.code).toBe(SAFETY_CODES.POSITION_EXISTS);

    const after = account();
    expect(after.openPosition.asset).toBe(before.openPosition.asset);
    expect(after.openPosition.entryPrice).toBe(before.openPosition.entryPrice);
    expect(after.balance).toBe(before.balance);
    expect(after.equity).toBe(before.equity);
    expect(after.unrealizedPnL).toBe(before.unrealizedPnL);
    expect(after.realizedPnL).toBe(before.realizedPnL);
    expect(after.trades.length).toBe(before.trades.length);
    expect(after.winCount).toBe(before.winCount);
    expect(after.lossCount).toBe(before.lossCount);
  });
});

describe('TEST 3 — force:true cannot bypass the position guard', () => {
  it('is rejected exactly like any other second open', () => {
    openXau();
    const forced = useDemoAccountStore.getState().openDemoTrade({
      asset: 'BTC/USD',
      buy: false,
      entry: 80000,
      sl: 80500,
      tp1: 79000,
      force: true,
    });

    expect(forced.ok).toBe(false);
    expect(forced.code).toBe(SAFETY_CODES.POSITION_EXISTS);
    expect(account().openPosition.asset).toBe('XAU/USD');
  });
});

describe('TEST 4 — a rejected open cannot mutate realised or unrealised P&L', () => {
  it('leaves every P&L field unchanged', () => {
    openXau();
    useDemoAccountStore.getState().updateTickPnL(2650, 10, 'XAU/USD');
    const before = { ...account() };

    useDemoAccountStore.getState().openDemoTrade({
      asset: 'BTC/USD',
      buy: true,
      entry: 80000,
      sl: 79000,
      tp1: 82000,
      force: true,
    });

    expect(account().realizedPnL).toBe(before.realizedPnL);
    expect(account().unrealizedPnL).toBe(before.unrealizedPnL);
    expect(account().balance).toBe(before.balance);
    expect(account().equity).toBe(before.equity);
  });
});

describe('TEST 5 — a BTC chart price cannot close an XAU position', () => {
  it('refuses the cross-asset close and leaves the position open', () => {
    openXau();
    const result = useDemoAccountStore.getState().closeDemoTrade(80000, 'BTC price', 10, { asset: 'BTC/USD' });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(SAFETY_CODES.ASSET_MISMATCH);
    expect(account().openPosition).toBeTruthy();
    expect(account().trades.length).toBe(0);
    expect(account().balance).toBe(10000);
  });

  it('closes the position when the price belongs to it', () => {
    openXau();
    const result = useDemoAccountStore.getState().closeDemoTrade(2650, 'TP', 10, { asset: 'XAU/USD' });
    expect(result.ok).toBe(true);
    expect(account().openPosition).toBeNull();
    expect(account().trades.length).toBe(1);
  });
});

describe('TEST 6 — a bracket with missing or mismatched identity cannot close a position', () => {
  it('refuses a close with no declared instrument', () => {
    openXau();
    const result = useDemoAccountStore.getState().closeDemoTrade(2650, 'unknown bracket');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(SAFETY_CODES.UNVERIFIED_EXIT);
    expect(account().openPosition).toBeTruthy();
  });
});

describe('TEST 10 — a rejected paper trade is not counted as executed', () => {
  it('does not change the win/loss counters or the journal', () => {
    openXau();
    const rejected = useDemoAccountStore.getState().openDemoTrade({ asset: 'BTC/USD', entry: 1, force: true });
    expect(rejected.ok).toBe(false);

    expect(account().winCount).toBe(0);
    expect(account().lossCount).toBe(0);
    expect(account().trades.length).toBe(0);
  });
});

describe('TEST 11 — a missing or stale price produces no invented exit fill', () => {
  it('refuses NaN, zero and undefined exit prices', () => {
    openXau();
    for (const price of [NaN, 0, undefined, null]) {
      const result = useDemoAccountStore.getState().closeDemoTrade(price, 'stale', 10, { asset: 'XAU/USD' });
      expect(result.ok).toBe(false);
      expect(result.code).toBe(SAFETY_CODES.INVALID_EXIT_PRICE);
    }
    expect(account().openPosition).toBeTruthy();
    expect(account().trades.length).toBe(0);
  });

  it('does not update the P&L from a missing price', () => {
    openXau();
    useDemoAccountStore.getState().updateTickPnL(NaN, 10, 'XAU/USD');
    expect(account().unrealizedPnL).toBe(0);
  });
});

describe('TEST 12 — a persisted position survives a reload without an automatic close', () => {
  it('restores the position and does not close it', () => {
    openXau();
    useDemoAccountStore.getState().updateTickPnL(2650, 10, 'XAU/USD');
    const persisted = JSON.parse(localStorage.getItem('tl_demo_account'));

    expect(persisted.openPosition).toBeTruthy();
    expect(persisted.openPosition.asset).toBe('XAU/USD');
    expect(persisted.trades.length).toBe(0);
    expect(persisted.balance).toBe(10000);
  });
});

// ── Source-level checks for the surfaces that cannot be unit-tested here ──

describe('callers use the safety guards', () => {
  it('no caller opens a position with force:true', () => {
    expect(chartSource).not.toMatch(/openDemoTrade\(\{[^}]*force:\s*true/);
    expect(terminalSource).not.toMatch(/openDemoTrade\(\{[^}]*force:\s*true/);
    expect(panelSource).not.toMatch(/openDemoTrade\(\{[^}]*force:\s*true/);
  });

  it('the chart monitor requires a matching instrument identity', () => {
    expect(chartSource).toContain('s.activeTrade.asset');
    expect(chartSource).toContain('isSameAsset(s.activeTrade.asset, asset)');
    expect(chartSource).not.toContain('!s.activeTrade.asset || s.activeTrade.asset === asset');
  });

  it('every chart close declares the instrument the exit price belongs to', () => {
    const closes = [...chartSource.matchAll(/closeDemoTrade\(/g)].map((m) => m.index);
    expect(closes.length).toBeGreaterThan(0);
    for (const index of closes) {
      const call = chartSource.slice(index, index + 400).split(');')[0];
      expect(call).toContain('asset');
    }
  });

  it('the runner start path never closes a position', () => {
    const start = chartSource.indexOf('const startLive10TradeBotRun = async () => {');
    const end = chartSource.indexOf('setLiveRunner({', start);
    const block = chartSource.slice(start, end);
    expect(block).toContain('EXISTING_POSITION_OPEN');
    expect(block).not.toContain('closeDemoTrade(');
  });

  it('a second start cannot launch a concurrent runner', () => {
    expect(chartSource).toContain('runnerActiveRef');
    const start = chartSource.indexOf('const startLive10TradeBotRun = async () => {');
    const guard = chartSource.indexOf('if (runnerActiveRef.current)', start);
    expect(guard).toBeGreaterThan(start);
  });

  it('an unresolved position pauses the run and is preserved', () => {
    expect(chartSource).toContain("phase: 'unresolved'");
    expect(chartSource).toContain('is still open');
  });

  it('the bot panel closes with the position’s own price', () => {
    expect(panelSource).toContain('findTickerPrice(liveTickerMap, position?.asset)');
    expect(panelSource).not.toMatch(/closeDemoTrade\(currentPx/);
  });

  it('the terminal declares the instrument on its closes', () => {
    const closes = [...terminalSource.matchAll(/closeDemoTrade\(/g)].map((m) => m.index);
    expect(closes.length).toBeGreaterThan(0);
    for (const index of closes) {
      const window = terminalSource.slice(index, index + 300);
      expect(window.includes('{ asset }')).toBe(true);
    }
  });
});

describe('TEST 13 — the Phase 0 exchange-order gates remain disabled', () => {
  it('the trading mode store still defaults to closed', () => {
    const storeSource = readFileSync(path.join(repoRoot, 'src', 'store', 'tradingModeStore.js'), 'utf8');
    expect(storeSource).toContain('autoTradeEnabled: false');
    expect(storeSource).toContain('orderConsentGiven: false');
  });

  it('the auto bot still defaults to off', () => {
    const accountSource = readFileSync(path.join(repoRoot, 'src', 'store', 'index.js'), 'utf8');
    expect(accountSource).toContain('isAutoBotActive: false');
  });

  it('the chart still routes exchange orders through the explicit permission gate', () => {
    expect(chartSource).toContain('requireExchangeAction');
    expect(chartSource).toContain('placeBybitDemoOrder');
  });

  it('the server proxy still gates every mutating route', () => {
    const appSource = readFileSync(path.join(repoRoot, 'server', 'app.js'), 'utf8');
    expect(appSource).toContain('assertMutationAllowed');
    expect(appSource).toContain('DEMO_ORDER');
  });
});

describe('TEST 14 — S01 and S02 remain intact', () => {
  it('the fabricated signal removal is preserved', () => {
    expect(chartSource).not.toContain('defaultBullPillars');
    expect(chartSource).not.toContain('defaultBearPillars');
    expect(chartSource).not.toContain('(6/6 Confirmed)');
    expect(chartSource).toContain('buildChartMarketState');
  });

  it('the real candle handling is preserved', () => {
    expect(chartSource).not.toMatch(/s\.bars\.push\(/);
    expect(chartSource).toContain('applyCandleUpdate');
    expect(chartSource).toContain('CANDLE_OUTCOME.IGNORED');
    expect(chartSource).toContain('confirmed: k.confirmed === true');
  });

  it('no credential is present in the changed surfaces', () => {
    for (const source of [chartSource, panelSource, terminalSource]) {
      expect(source).not.toContain('X-BAPI-API-KEY');
      expect(source).not.toContain('X-BAPI-SIGN');
      expect(source).not.toContain('crypto.subtle');
    }
  });
});

describe('TASK 2 — the runner never auto-closes an existing position', () => {
  it('blocks the run instead of closing the open position', () => {
    const start = chartSource.indexOf('const startLive10TradeBotRun = async () => {');
    const end = chartSource.indexOf('setLiveRunner({', start);
    const block = chartSource.slice(start, end);

    // The run is blocked with an explicit status.
    expect(block).toContain('EXISTING_POSITION_OPEN');
    expect(block).toContain("phase: 'blocked'");
    // The position is preserved: there is no close call in the start path.
    expect(block).not.toContain('closeDemoTrade(');
  });

  it('the run is blocked even when the position has a live quote available', () => {
    // A live quote must not be used to clear the position.
    const start = chartSource.indexOf('const startLive10TradeBotRun = async () => {');
    const end = chartSource.indexOf('setLiveRunner({', start);
    const block = chartSource.slice(start, end);
    expect(block).toContain('EXISTING_POSITION_OPEN');
    expect(block).not.toMatch(/closeDemoTrade\(/);
    expect(block).not.toContain('findTickerPrice');
  });
});

describe('TASK 3 — position identity protects against a stale same-asset bracket', () => {
  it('a bracket may only close the position whose id it carries', () => {
    const position = { id: 'pos_1', asset: 'BTC/USD', entryPrice: 80000 };

    const wrong = canClosePosition({
      position,
      exitPrice: 80500,
      exitAsset: 'BTC/USD',
      positionId: 'pos_old',
    });
    expect(wrong.allowed).toBe(false);
    expect(wrong.code).toBe(SAFETY_CODES.POSITION_MISMATCH);

    const right = canClosePosition({
      position,
      exitPrice: 80500,
      exitAsset: 'BTC/USD',
      positionId: 'pos_1',
    });
    expect(right.allowed).toBe(true);
  });

  it('the store refuses a close that names a different position', () => {
    openXau();
    const positionId = account().openPosition.id;
    const result = useDemoAccountStore.getState().closeDemoTrade(2650, 'stale bracket', 10, {
      asset: 'XAU/USD',
      positionId: 'pos_from_an_older_trade',
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(SAFETY_CODES.POSITION_MISMATCH);
    expect(account().openPosition).toBeTruthy();

    // The correct position id does close it.
    const ok = useDemoAccountStore.getState().closeDemoTrade(2650, 'TP', 10, {
      asset: 'XAU/USD',
      positionId,
    });
    expect(ok.ok).toBe(true);
    expect(account().openPosition).toBeNull();
  });

  it('the chart monitor requires a matching position id as well as the instrument', () => {
    expect(chartSource).toContain('openPos.id === s.activeTrade.positionId');
    expect(chartSource).toContain('s.activeTrade.positionId &&');
  });

  it('brackets are linked to the position they opened', () => {
    expect(chartSource).toContain('newTrade.positionId = opened.position.id');
    expect(chartSource).toContain('trade.positionId = opened.position.id');
    expect(chartSource).toContain('tradeSetup.positionId = opened.position.id');
  });

  it('no bracket is created on a candle load', () => {
    // S01 removed the auto-created bracket: the load path only builds market state.
    const start = chartSource.indexOf('const applyBarsAndIndicators');
    const end = chartSource.indexOf('const loadCandles', start);
    const block = chartSource.slice(start, end);
    expect(block).toContain('s.activeTrade = null;');
    expect(block).not.toContain('s.activeTrade = newTrade;');
    expect(block).not.toContain('s.activeTrade = trade;');
    expect(block).not.toContain('s.activeTrade = tradeSetup;');
  });
});

describe('TASK 4 — return values and callers', () => {
  it('a successful open returns the position and a rejection returns a failure', () => {
    const ok = openXau();
    expect(ok.ok).toBe(true);
    expect(ok.position).toBeTruthy();
    expect(ok.position.id).toBeTruthy();

    const rejected = useDemoAccountStore.getState().openDemoTrade({ asset: 'BTC/USD', entry: 1 });
    expect(rejected.ok).toBe(false);
    expect(rejected.code).toBe(SAFETY_CODES.POSITION_EXISTS);
    expect(rejected.position).toBeTruthy();
  });

  it('every open call site checks the result', () => {
    const sites = [
      ...[...chartSource.matchAll(/openDemoTrade\(/g)].map((m) => [chartSource, m.index]),
      ...[...terminalSource.matchAll(/openDemoTrade\(/g)].map((m) => [terminalSource, m.index]),
    ];
    expect(sites.length).toBeGreaterThan(0);
    for (const [source, index] of sites) {
      const window = source.slice(index, index + 900);
      expect(window).toContain('opened.ok');
    }
  });

  it('a rejected open does not reach the exchange order dispatch', () => {
    const index = chartSource.indexOf('const opened = openDemoTrade({', chartSource.indexOf('const tradeSetup'));
    const window = chartSource.slice(index, index + 3000);
    const rejectIndex = window.indexOf('if (!opened.ok)');
    const orderIndex = window.indexOf('placeBybitDemoOrder(');
    expect(rejectIndex).toBeGreaterThan(-1);
    expect(orderIndex).toBeGreaterThan(-1);
    expect(rejectIndex).toBeLessThan(orderIndex);
    // The rejection path returns before the order is dispatched.
    expect(window.slice(rejectIndex, orderIndex)).toContain('return;');
  });

  it('a rejected open produces no journal entry', () => {
    openXau();
    useDemoAccountStore.getState().openDemoTrade({ asset: 'BTC/USD', entry: 1, force: true });
    expect(account().trades.length).toBe(0);
  });
});

describe('TASK 5 — runner lifecycle', () => {
  it('the active guard is set before any asynchronous work', () => {
    const start = chartSource.indexOf('const startLive10TradeBotRun = async () => {');
    const block = chartSource.slice(start, start + 1200);
    const guardIndex = block.indexOf('runnerActiveRef.current = true');
    const awaitIndex = block.indexOf('await');
    expect(guardIndex).toBeGreaterThan(-1);
    if (awaitIndex > -1) expect(guardIndex).toBeLessThan(awaitIndex);
  });

  it('the guard is released on block, on an unresolved outcome, on stop and on completion', () => {
    const occurrences = (chartSource.match(/runnerActiveRef\.current = false/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(4);
    const stop = chartSource.indexOf('const stopLiveSequentialBotTest = () => {');
    expect(chartSource.slice(stop, stop + 300)).toContain('runnerActiveRef.current = false');
  });

  it('an unexpected runner failure releases the guard and invents no exit', () => {
    expect(chartSource).toContain('handleRunnerError');
    const index = chartSource.indexOf('const handleRunnerError = (err) => {');
    const block = chartSource.slice(index, index + 700);
    expect(block).toContain('runnerActiveRef.current = false');
    expect(block).not.toContain('closeDemoTrade(');
  });

  it('the runner does not proceed into another trade while a position is open', () => {
    const index = chartSource.indexOf('const opened = openDemoTrade({', chartSource.indexOf('const tradeSetup'));
    const window = chartSource.slice(index, index + 1200);
    const rejectIndex = window.indexOf('if (!opened.ok)');
    expect(rejectIndex).toBeGreaterThan(-1);
    // The rejection returns immediately, so the runner never advances to the
    // next instrument while a position is unresolved.
    expect(window.slice(rejectIndex, rejectIndex + 700)).toContain('return;');
  });
});
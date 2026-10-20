/**
 * Paper position safety helpers.
 *
 * These rules are shared by the chart, the bot panel, the trading terminal and
 * the 10-coin runner so that every surface applies the same guards.
 *
 * RULES
 * -----
 * 1. An open paper position is never overwritten.
 * 2. A position is closed only with an exit price that belongs to THAT
 *    position's instrument. A price from another instrument is refused.
 * 3. If the instrument identity cannot be established, the operation is
 *    refused — the safe direction.
 * 4. A missing, stale or malformed price never produces an exit fill.
 */

import { resolveBybitSymbol } from '../config/tradingMode.js';

export const SAFETY_CODES = Object.freeze({
  POSITION_EXISTS: 'POSITION_EXISTS',
  NO_POSITION: 'NO_POSITION',
  ASSET_MISMATCH: 'ASSET_MISMATCH',
  POSITION_MISMATCH: 'POSITION_MISMATCH',
  UNVERIFIED_EXIT: 'UNVERIFIED_EXIT',
  INVALID_EXIT_PRICE: 'INVALID_EXIT_PRICE',
  PRICE_UNAVAILABLE: 'PRICE_UNAVAILABLE',
  OK: 'OK',
});

/**
 * Canonical instrument identity for an asset label.
 * 'BTC/USD', 'BTC/USDT' and 'BTCUSDT' all resolve to 'BTCUSDT'.
 *
 * @returns {string|null} null when the identity cannot be established
 */
export function canonicalAssetId(asset) {
  if (typeof asset !== 'string') return null;
  const raw = asset.trim();
  if (!raw) return null;
  try {
    const resolved = resolveBybitSymbol(raw);
    if (resolved.ok) return resolved.symbol;
  } catch {
    /* fall through to the normalised form */
  }
  const normalised = raw.toUpperCase().replace(/[/\-_:\s]/g, '');
  return normalised || null;
}

/**
 * True only when both sides resolve to the SAME canonical instrument.
 * An unresolvable identity is never a match.
 */
export function isSameAsset(a, b) {
  const ca = canonicalAssetId(a);
  const cb = canonicalAssetId(b);
  if (!ca || !cb) return false;
  return ca === cb;
}

/** A usable exit price is a finite, strictly positive number. */
export function isValidExitPrice(price) {
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

/**
 * Decide whether a paper position may be closed.
 *
 * @param {object} params
 * @param {object} params.position        the open paper position
 * @param {number} params.exitPrice       the price the caller wants to fill at
 * @param {string} params.exitAsset       the instrument the exit price belongs to
 * @param {string} [params.positionId]    the id of the position the caller
 *        believes it is closing. When supplied it must match the open
 *        position exactly — an asset match alone is never proof of identity.
 * @returns {{ allowed: boolean, code: string, message: string }}
 */
export function canClosePosition({ position, exitPrice, exitAsset, positionId }) {
  if (!position) {
    return {
      allowed: false,
      code: SAFETY_CODES.NO_POSITION,
      message: 'There is no open paper position to close.',
    };
  }

  if (!isValidExitPrice(exitPrice)) {
    return {
      allowed: false,
      code: SAFETY_CODES.INVALID_EXIT_PRICE,
      message: 'No valid market price is available for this position, so no exit fill was created.',
    };
  }

  // Identity: when the caller declares which position it is closing, that id
  // must be the open position. A stale bracket from an earlier position is
  // refused even when the instrument is identical.
  if (positionId !== undefined && positionId !== null && positionId !== '') {
    if (position.id !== positionId) {
      return {
        allowed: false,
        code: SAFETY_CODES.POSITION_MISMATCH,
        message: `This action belongs to position ${positionId}, but position ${position.id} is open. The open position was left unchanged.`,
      };
    }
  }

  if (!exitAsset) {
    return {
      allowed: false,
      code: SAFETY_CODES.UNVERIFIED_EXIT,
      message: 'The exit price could not be attributed to an instrument, so the position was left open.',
    };
  }

  if (!isSameAsset(position.asset, exitAsset)) {
    return {
      allowed: false,
      code: SAFETY_CODES.ASSET_MISMATCH,
      message: `The exit price belongs to ${exitAsset}, not to the open ${position.asset} position. The position was left open.`,
    };
  }

  return { allowed: true, code: SAFETY_CODES.OK, message: 'Close allowed.' };
}

/**
 * Find a price for an instrument inside a ticker map keyed by exchange symbol.
 * Returns null when the instrument is not present (a missing quote).
 */
export function findTickerPrice(tickerMap, asset) {
  if (!tickerMap || typeof tickerMap !== 'object') return null;
  const id = canonicalAssetId(asset);
  if (!id) return null;

  const direct = tickerMap[id];
  if (direct && typeof direct.price === 'number' && direct.price > 0) return direct.price;

  for (const [symbol, value] of Object.entries(tickerMap)) {
    if (canonicalAssetId(symbol) === id && value && typeof value.price === 'number' && value.price > 0) {
      return value.price;
    }
  }
  return null;
}

/**
 * Paper trading accounting rules.
 *
 * These are the single source of truth for how a closed paper trade is
 * classified and how the win / loss / break-even counters are kept.
 *
 * CLASSIFICATION
 * --------------
 *   pnlDollars > 0   -> 'WIN'
 *   pnlDollars < 0   -> 'LOSS'
 *   pnlDollars === 0 -> 'BREAKEVEN'
 *
 * ROUNDING
 * --------
 * The classification uses the SAME rounded value that is booked into the
 * balance (`pnlDollars` is already rounded to two decimals when it is
 * computed). A close whose booked P&L is 0.00 is therefore a break-even,
 * because 0.00 is exactly what the balance and the journal show — no loss is
 * hidden and no gain is invented. No tolerance band is applied: a booked
 * value of -0.01 is a LOSS, never a WIN, and a booked value of 0.01 is a
 * WIN.
 *
 * Fees and slippage are deliberately NOT modelled here. They belong to the
 * shared fill model, which will change the booked P&L and therefore the
 * classification.
 */

export const RESULT = Object.freeze({
  WIN: 'WIN',
  LOSS: 'LOSS',
  BREAKEVEN: 'BREAKEVEN',
});

/** Reasons an accounting value can be rejected. */
export const PNL_REJECTION = Object.freeze({
  MISSING: 'MISSING',
  EMPTY: 'EMPTY',
  NOT_A_NUMBER: 'NOT_A_NUMBER',
  NOT_FINITE: 'NOT_FINITE',
});

/**
 * Validate and normalise a recorded P&L value.
 *
 * Accepts a finite number, or a string that represents a finite number
 * (legacy callers may send numeric strings). Everything else is rejected
 * explicitly rather than being coerced:
 *
 *   undefined, null, '', 'abc', true, [], {}, NaN, Infinity, -Infinity
 *
 * A rejected value must NOT be turned into zero: a zero P&L is a legitimate
 * break-even, and silently converting invalid input into zero would fabricate
 * an accounting result.
 *
 * @param {unknown} value
 * @returns {{ ok: boolean, value: number, reason: string|null }}
 */
export function normalizePnl(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { ok: false, value: NaN, reason: PNL_REJECTION.NOT_FINITE };
    }
    return { ok: true, value, reason: null };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return { ok: false, value: NaN, reason: PNL_REJECTION.EMPTY };
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return { ok: false, value: NaN, reason: PNL_REJECTION.NOT_A_NUMBER };
    }
    return { ok: true, value: parsed, reason: null };
  }

  return { ok: false, value: NaN, reason: PNL_REJECTION.MISSING };
}

/**
 * Classify a realized P&L value.
 *
 * @param {number} pnlDollars a FINITE realized P&L value
 * @returns {'WIN'|'LOSS'|'BREAKEVEN'|null} null when the value cannot be
 *   classified — the caller must reject the operation, never assume zero.
 */
export function classifyResult(pnlDollars) {
  if (typeof pnlDollars !== 'number' || !Number.isFinite(pnlDollars)) return null;
  if (pnlDollars > 0) return RESULT.WIN;
  if (pnlDollars < 0) return RESULT.LOSS;
  return RESULT.BREAKEVEN;
}

export const isWinResult = (result) => result === RESULT.WIN;
export const isLossResult = (result) => result === RESULT.LOSS;
export const isBreakEvenResult = (result) => result === RESULT.BREAKEVEN;

/**
 * The counter deltas a result produces.
 * A break-even increments neither the win nor the loss counter.
 * An unclassifiable result increments nothing.
 */
export function resultCounterDelta(result) {
  return {
    wins: isWinResult(result) ? 1 : 0,
    losses: isLossResult(result) ? 1 : 0,
    breakEvens: isBreakEvenResult(result) ? 1 : 0,
  };
}

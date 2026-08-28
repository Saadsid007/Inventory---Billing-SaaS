import Decimal from 'decimal.js';

/**
 * Money math. Build spec rule 3 and §5.3.
 *
 * Every rupee figure in this system travels as a decimal *string* and is
 * computed with decimal.js. A JS `number` holding 0.1 + 0.2 is 0.30000000000000004;
 * on a 200-line wholesale invoice that error compounds into a mismatch the
 * customer will notice and the CA will call about.
 *
 * Rounding is half-up everywhere, matching how Indian invoices are printed.
 */

/**
 * A private decimal.js constructor. Cloned rather than configured globally so
 * this package can never change rounding behaviour for someone else's Decimal.
 */
export const D = Decimal.clone({
  precision: 34,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -21,
  toExpPos: 21,
});

export type DecimalValue = string | number | Decimal;

export const MONEY_DP = 2;
export const QTY_DP = 3;

/**
 * Parse anything into a Decimal. Throws on garbage rather than yielding NaN.
 *
 * decimal.js raises a plain `Error` for unparseable input and returns a NaN
 * Decimal for Infinity; both are normalised to one TypeError here so callers
 * have a single failure mode to catch.
 */
export function dec(value: DecimalValue): Decimal {
  let d: Decimal;
  try {
    d = new D(value);
  } catch {
    throw new TypeError(`Not a valid decimal: ${String(value)}`);
  }
  if (!d.isFinite()) {
    throw new TypeError(`Not a finite decimal: ${String(value)}`);
  }
  return d;
}

/** Round to 2dp, half-up, and return the string a numeric(12,2) column wants. */
export function money(value: DecimalValue): string {
  return dec(value).toFixed(MONEY_DP);
}

/** Round to 3dp, half-up, for numeric(12,3) quantity columns. */
export function qty(value: DecimalValue): string {
  return dec(value).toFixed(QTY_DP);
}

/** Nearest whole rupee, half-up. Used for invoice grand-total rounding (§5.3). */
export function roundToRupee(value: DecimalValue): string {
  return dec(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(MONEY_DP);
}

export function sumMoney(values: readonly DecimalValue[]): string {
  return values.reduce<Decimal>((acc, v) => acc.plus(dec(v)), new D(0)).toFixed(MONEY_DP);
}

export function sumQty(values: readonly DecimalValue[]): string {
  return values.reduce<Decimal>((acc, v) => acc.plus(dec(v)), new D(0)).toFixed(QTY_DP);
}

export const ZERO_MONEY = '0.00';
export const ZERO_QTY = '0.000';

export function isZeroMoney(value: DecimalValue): boolean {
  return dec(value).isZero();
}

/** a - b, at money scale. */
export function subtractMoney(a: DecimalValue, b: DecimalValue): string {
  return dec(a).minus(dec(b)).toFixed(MONEY_DP);
}

/** Percentage of a base, e.g. `percentOf('1000', '18')` -> '180.00'. */
export function percentOf(base: DecimalValue, percent: DecimalValue): string {
  return dec(base).times(dec(percent)).dividedBy(100).toFixed(MONEY_DP);
}

/** Compare two money strings without converting to float. */
export function compareMoney(a: DecimalValue, b: DecimalValue): -1 | 0 | 1 {
  return dec(a).comparedTo(dec(b)) as -1 | 0 | 1;
}

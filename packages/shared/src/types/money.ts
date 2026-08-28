/**
 * Money and quantity are carried as strings across every boundary.
 *
 * Postgres `numeric` comes back as a string from the driver, and it must stay a
 * string until it reaches `Decimal` in packages/core. Parsing it into a JS
 * `number` anywhere in between is how rounding bugs get into invoices.
 *
 * Build spec rule 3: "Never use JavaScript `number` for currency math."
 */

/** A `numeric(12,2)` value, e.g. "1234.50". */
export type MoneyString = string;

/** A `numeric(12,3)` value, e.g. "12.500". */
export type QuantityString = string;

export const MONEY_SCALE = 2;
export const QUANTITY_SCALE = 3;

const MONEY_PATTERN = /^-?\d{1,10}(\.\d{1,2})?$/;
const QUANTITY_PATTERN = /^-?\d{1,9}(\.\d{1,3})?$/;

export function isMoneyString(value: string): value is MoneyString {
  return MONEY_PATTERN.test(value);
}

export function isQuantityString(value: string): value is QuantityString {
  return QUANTITY_PATTERN.test(value);
}

/**
 * Indian financial year: 1 April to 31 March.
 *
 * The FY string keys the invoice series (spec §5.1) — each business gets a
 * fresh, gapless number sequence per financial year per document kind. Deriving
 * it from the wrong date, or from "now" instead of the invoice date, silently
 * files an invoice under the wrong year's series.
 */

/** `YYYY-MM-DD`, exactly as a Postgres `date` column returns it. */
export type DateString = string;

const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Financial year for a date, formatted `2026-27`.
 *
 * Takes a date STRING, not a Date. A `Date` carries a timezone, and 1 April
 * 00:30 IST is 31 March in UTC — which would file the year's first invoice
 * under the previous year's series. The invoice date is a calendar date with no
 * time component, so it stays a string all the way through.
 */
export function financialYear(date: DateString): string {
  const match = DATE_SHAPE.exec(date);
  if (!match) {
    throw new TypeError(`Expected an ISO date (YYYY-MM-DD), got: ${date}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new RangeError(`Not a valid calendar date: ${date}`);
  }

  // April onwards belongs to the year that just started; Jan–Mar to the one before.
  const startYear = month >= 4 ? year : year - 1;
  const endYY = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYY}`;
}

/** First day of a financial year, e.g. '2026-27' -> '2026-04-01'. */
export function financialYearStart(fy: string): DateString {
  return `${parseFinancialYear(fy).startYear}-04-01`;
}

/** Last day of a financial year, e.g. '2026-27' -> '2027-03-31'. */
export function financialYearEnd(fy: string): DateString {
  return `${parseFinancialYear(fy).startYear + 1}-03-31`;
}

export function parseFinancialYear(fy: string): { startYear: number; endYear: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(fy);
  if (!match) {
    throw new TypeError(`Expected a financial year like '2026-27', got: ${fy}`);
  }
  const startYear = Number(match[1]);
  const expectedEnd = String((startYear + 1) % 100).padStart(2, '0');
  if (match[2] !== expectedEnd) {
    throw new RangeError(`Financial year '${fy}' is not a consecutive pair of years`);
  }
  return { startYear, endYear: startYear + 1 };
}

export function isDateInFinancialYear(date: DateString, fy: string): boolean {
  return financialYear(date) === fy;
}

/** Today's financial year, in IST. Only for defaulting a form. */
export function currentFinancialYear(now: Date = new Date()): string {
  // Server clocks run UTC; the financial year is an Indian calendar concept, so
  // shift by +05:30 before asking which day it is.
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return financialYear(`${y}-${m}-${d}`);
}

/** Today's date in IST as `YYYY-MM-DD`. The default for a new invoice. */
export function todayInIndia(now: Date = new Date()): DateString {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

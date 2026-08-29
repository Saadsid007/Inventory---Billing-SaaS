import type { InvoiceKind } from '@billwise/shared';
import { financialYear, type DateString } from '../gst/financial-year';

/**
 * Invoice numbering. Build spec §5.1.
 *
 * This module owns the PURE half: what a number looks like, and which series a
 * document belongs to. Actually handing out the next number requires a row
 * lock, so it lives in `packages/db/src/repositories/numbering.ts` — locking is
 * a database concern and core stays database-free.
 *
 * The rules that make a series legally usable:
 *   • a number is assigned ONLY on issue; drafts carry NULL
 *   • cancelled invoices KEEP their number — never reused, never deleted
 *   • the series must be gapless, because gaps in a GST series are a
 *     compliance problem
 *   • the financial year comes from the INVOICE DATE, never from "today"
 */

export type SeriesShape = {
  prefix: string;
  padding: number;
};

/** Identifies one gapless sequence: per business, per kind, per financial year. */
export type SeriesKey = {
  kind: InvoiceKind;
  fy: string;
};

export const MIN_INVOICE_NUMBER = 1;
export const MAX_PADDING = 10;

/**
 * Suggested prefixes when a business first issues a given document type.
 *
 * Estimates and delivery challans need visibly different numbers from tax
 * invoices: they are not accounting documents, and a challan that looks like an
 * invoice will eventually be handed to an auditor as one.
 */
export const DEFAULT_SERIES_PREFIX: Record<InvoiceKind, string> = {
  tax_invoice: '',
  bill_of_supply: 'BOS-',
  cash_memo: 'CM-',
  estimate: 'EST-',
  delivery_challan: 'DC-',
};

/**
 * Render a number in a series, e.g. `{ prefix: 'INV-', padding: 3 }` and 7
 * gives `INV-007`.
 *
 * Padding is a minimum, never a maximum: the 1000th invoice of a 3-padded
 * series prints as `1000`, not `000`. Truncating would create a duplicate.
 */
export function formatInvoiceNumber(shape: SeriesShape, n: number): string {
  if (!Number.isInteger(n) || n < MIN_INVOICE_NUMBER) {
    throw new RangeError(`Invoice number must be a positive integer, got: ${n}`);
  }
  const padding = Math.max(0, Math.min(shape.padding, MAX_PADDING));
  return `${shape.prefix}${String(n).padStart(padding, '0')}`;
}

/**
 * Which series a document belongs to.
 *
 * Derived from the INVOICE DATE. Backdating an invoice to 31 March must file it
 * under the previous year's series, and using the current date would silently
 * put it in the wrong one.
 */
export function seriesKeyFor(kind: InvoiceKind, invoiceDate: DateString): SeriesKey {
  return { kind, fy: financialYear(invoiceDate) };
}

/** Stable string key. Useful for maps and cache keys, never stored. */
export function seriesKeyString(businessId: string, key: SeriesKey): string {
  return `${businessId}:${key.kind}:${key.fy}`;
}

export type SeriesShapeValidation = { valid: true } | { valid: false; message: string };

/**
 * Validate a shape a user typed in settings.
 *
 * The prefix is deliberately restrictive: it ends up in a filename, a GSTR-1
 * export, and a URL. Slashes and spaces cause trouble in all three.
 */
export function validateSeriesShape(shape: SeriesShape): SeriesShapeValidation {
  if (shape.prefix.length > 16) {
    return { valid: false, message: 'Prefix cannot be longer than 16 characters' };
  }
  if (shape.prefix && !/^[A-Za-z0-9/\-_]+$/.test(shape.prefix)) {
    return {
      valid: false,
      message: 'Prefix can only contain letters, numbers, hyphens, slashes and underscores',
    };
  }
  if (!Number.isInteger(shape.padding) || shape.padding < 0 || shape.padding > MAX_PADDING) {
    return { valid: false, message: `Padding must be a whole number between 0 and ${MAX_PADDING}` };
  }
  return { valid: true };
}

/**
 * Every number a series has issued so far, in order.
 *
 * Used by the GSTR-1 "documents issued" report (Phase 2), which has to declare
 * the range a business used and how many were cancelled.
 */
export function seriesRange(shape: SeriesShape, from: number, to: number): string[] {
  if (to < from) return [];
  return Array.from({ length: to - from + 1 }, (_, i) => formatInvoiceNumber(shape, from + i));
}

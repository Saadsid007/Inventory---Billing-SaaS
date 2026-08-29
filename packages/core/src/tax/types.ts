import type { InvoiceKind, TaxMode } from '@billwise/shared';

/**
 * Tax engine contracts. Build spec §5.3.
 *
 * Every amount is a decimal string. Nothing here is a JavaScript number — see
 * money.ts for why. Field names deliberately mirror the `invoices` and
 * `invoice_lines` columns so a result can be written straight to the database
 * without a translation layer inventing its own rounding on the way.
 */

export type TaxLineInput = {
  /** numeric(12,3). Some businesses sell in kg or litres. */
  qty: string;
  /** numeric(12,2). Per-unit price. Tax-inclusive when taxMode is 'inclusive'. */
  rate: string;
  /**
   * Percentage discount. Ignored when `discountAmount` is given — an absolute
   * amount is what the shopkeeper actually negotiated, so it wins.
   */
  discountPct?: string | undefined;
  /** Absolute discount on the line. Takes precedence over `discountPct`. */
  discountAmount?: string | undefined;
  /** GST rate percentage, e.g. '18'. From the tax_rates table, never hardcoded. */
  taxRate: string;
  /** Compensation cess percentage. '0' for almost everything. */
  cessRate?: string | undefined;
};

export type TaxLineResult = {
  /** qty × rate, before any discount. Not stored; useful for showing the maths. */
  gross: string;
  discountAmount: string;
  taxableValue: string;
  taxRate: string;
  cessRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  lineTotal: string;
};

export type InvoiceTaxInput = {
  /** Only 'tax_invoice' carries GST. The rest total zero tax (spec §5.2). */
  kind: InvoiceKind;
  taxMode: TaxMode;
  /**
   * Decided by place-of-supply rules (spec §5.2), which live in core/gst.
   * Passed in rather than derived here so this engine stays a pure function of
   * its arguments and can be tested against both cases directly.
   */
  isInterstate: boolean;
  lines: readonly TaxLineInput[];
  /** Freight, packing, insurance. Added after tax, before rounding. */
  otherCharges?: string | undefined;
};

export type InvoiceTaxResult = {
  lines: TaxLineResult[];
  /** Sum of taxable values. */
  subtotal: string;
  discountTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  cessTotal: string;
  otherCharges: string;
  /** Total before rupee rounding. Not stored; kept so round_off is auditable. */
  preRound: string;
  /** grandTotal − preRound. Can be negative. */
  roundOff: string;
  grandTotal: string;
};

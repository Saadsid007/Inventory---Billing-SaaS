import { z } from 'zod';
import { INVOICE_KINDS, PAYMENT_METHODS, TAX_MODES } from '../constants/enums';
import { dateStringSchema, moneySchema, quantitySchema, stateCodeSchema } from './primitives';

/**
 * Invoice input. Build spec §4 and Phase 1d.
 *
 * Only what a user types is validated here. Every computed figure — taxable
 * value, tax split, totals — is produced by the tax engine in
 * `@bahikhata/core`, never accepted from the client. A browser that posts its
 * own `grandTotal` must not be able to decide what a customer owes.
 */

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const invoiceLineInputSchema = z.object({
  productId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  /** Snapshotted onto the line. Ad-hoc lines with no product are allowed. */
  name: z.string().trim().min(1, 'Enter an item name').max(120),
  hsnCode: optionalText(8),
  unit: optionalText(6),
  qty: quantitySchema,
  rate: moneySchema,
  discountPct: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? '0' : v)),
  discountAmount: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? '0' : v)),
  taxRate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? '0' : v)),
  cessRate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? '0' : v)),
});

export type InvoiceLineFormInput = z.input<typeof invoiceLineInputSchema>;

export const invoiceInputSchema = z.object({
  kind: z.enum(INVOICE_KINDS),
  invoiceDate: dateStringSchema,
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(dateStringSchema.optional()),

  partyId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  /** Snapshot: a walk-in customer has a name and nothing else. */
  partyName: z.string().trim().min(1, 'Enter a customer name').max(120),
  partyGstin: optionalText(15),
  partyPhone: optionalText(20),
  partyAddress: optionalText(300),

  /** Manual override. Blank means "work it out from the party" (spec §5.2). */
  placeOfSupply: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(stateCodeSchema.optional()),

  taxMode: z.enum(TAX_MODES),
  otherCharges: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? '0' : v))
    .pipe(moneySchema),

  notes: optionalText(1000),
  terms: optionalText(2000),

  lines: z.array(invoiceLineInputSchema).min(1, 'Add at least one item'),
});

export type InvoiceFormInput = z.infer<typeof invoiceInputSchema>;

export const paymentInputSchema = z.object({
  amount: moneySchema,
  method: z.enum(PAYMENT_METHODS),
  paidOn: dateStringSchema,
  reference: optionalText(80),
  note: optionalText(300),
});

export type PaymentFormInput = z.infer<typeof paymentInputSchema>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(3, 'Say why — this is permanent').max(300),
});

/**
 * Non-blocking checks run at issue time. Build spec §5.5.
 *
 * A tax invoice line without an HSN cannot be reconstructed later for GSTR-1,
 * so it is worth flagging — but never worth refusing to bill a customer who is
 * standing at the counter.
 */
export function invoiceWarnings(input: {
  kind: string;
  partyGstin?: string | undefined;
  isInterstate: boolean;
  lines: readonly { name: string; hsnCode?: string | undefined; taxRate?: string }[];
}): string[] {
  const warnings: string[] = [];

  if (input.kind === 'tax_invoice') {
    const missingHsn = input.lines.filter((l) => !l.hsnCode);
    if (missingHsn.length > 0) {
      warnings.push(
        `${missingHsn.length} item${missingHsn.length === 1 ? '' : 's'} ` +
          'without an HSN code. GSTR-1 needs it, and it cannot be filled in later.',
      );
    }
    const zeroRated = input.lines.filter((l) => !l.taxRate || Number(l.taxRate) === 0);
    if (zeroRated.length === input.lines.length && input.lines.length > 0) {
      warnings.push('Every item is at 0% GST. Should this be a Bill of Supply instead?');
    }
  }

  if (input.kind === 'tax_invoice' && input.isInterstate && !input.partyGstin) {
    warnings.push(
      'Interstate sale to an unregistered buyer. Check the place of supply is right — ' +
        'it decides IGST instead of CGST/SGST.',
    );
  }

  return warnings;
}

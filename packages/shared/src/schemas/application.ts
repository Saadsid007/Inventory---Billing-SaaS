import { z } from 'zod';
import { APPLICATION_STATUSES } from '../constants/business-types';
import { PAYMENT_METHODS } from '../constants/enums';
import { dateStringSchema } from './primitives';

/**
 * Work taken on at a Jan Seva Kendra.
 *
 * ## What this deliberately does not accept
 *
 * There is no field for an Aadhaar number and none for a document scan, and
 * that is a decision rather than an omission. Storing Aadhaar data pulls a
 * one-room shop inside the Aadhaar Act's storage rules, and a leak from a small
 * business's database is a far worse outcome than the convenience it buys.
 *
 * The government's own acknowledgement number is enough to track any
 * application and is not sensitive, so that is what `referenceNo` holds.
 * `documentsHeld` is a plain checklist of the paper in the drawer — "Aadhaar
 * copy, 2 photos" — which is the thing an owner actually needs to look up.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v));

export const applicationSchema = z.object({
  serviceName: z.string().trim().min(1, 'Which work is this?').max(120),
  serviceId: optionalText(64),
  partyId: optionalText(64),
  partyName: optionalText(80),
  partyPhone: optionalText(20),
  invoiceId: optionalText(64),
  /** Government acknowledgement / URN / enrolment number. Never an Aadhaar number. */
  referenceNo: optionalText(60),
  appliedOn: dateStringSchema,
  expectedOn: dateStringSchema.optional(),
  /** Checklist of physical paper being held. Never a number, never a scan. */
  documentsHeld: optionalText(200),
  note: optionalText(300),
});

export type ApplicationFormInput = z.infer<typeof applicationSchema>;

export const applicationPatchSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  referenceNo: optionalText(60),
  expectedOn: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
  documentsHeld: optionalText(200),
  note: optionalText(300),
});

export type ApplicationPatchInput = z.infer<typeof applicationPatchSchema>;

/**
 * A service on the Jan Seva rate list.
 *
 * `govtFee` is optional because most work has none — a photocopy, a form
 * filled in, a ticket booked. Where there is one it is the shop's cost, not
 * its earning, and the form says so in those words.
 */
export const sevaServiceSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name of the work').max(120),
  sku: optionalText(24),
  price: z
    .string()
    .trim()
    .min(1, 'Enter what the customer pays')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Must be an amount')
    .transform((v) => Number(v).toFixed(2)),
  govtFee: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? '0.00' : v))
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Must be an amount')
    .transform((v) => Number(v).toFixed(2)),
  /** Whether this work runs for days and belongs on the work register. */
  tracked: z.boolean(),
  days: z.coerce.number().int().min(0).max(180),
});

export type SevaServiceFormInput = z.infer<typeof sevaServiceSchema>;

/**
 * A receipt made at a Jan Seva counter.
 *
 * Deliberately tiny next to `invoiceInputSchema`. No tax mode, no place of
 * supply, no HSN, no per-line discount, no document kind: a CSC gives one
 * customer one receipt for one or two jobs at a listed rate, and every field
 * the form does not need is a field somebody has to skip past at a busy
 * counter.
 *
 * Prices are not trusted from here — the server reads them from the rate list.
 * They are accepted only for one-off work that is not on it.
 */
export const sevaReceiptLineSchema = z.object({
  serviceId: optionalText(64),
  name: z.string().trim().max(120).default(''),
  qty: z
    .string()
    .trim()
    .default('1')
    .refine((v) => /^\d+(\.\d{1,3})?$/.test(v) && Number(v) > 0, 'Quantity must be more than zero'),
  rate: z
    .string()
    .trim()
    .default('0')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Rate must be an amount'),
  /** Put this job on the work register. */
  tracked: z.boolean().default(false),
  expectedOn: optionalText(10),
  referenceNo: optionalText(60),
  documentsHeld: optionalText(200),
});

export const sevaReceiptSchema = z.object({
  receiptDate: dateStringSchema,
  partyId: optionalText(64),
  partyName: optionalText(80),
  partyPhone: optionalText(20),
  amountReceived: z
    .string()
    .trim()
    .default('0')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Amount must be a number'),
  method: z.enum(PAYMENT_METHODS).default('cash'),
  note: optionalText(300),
  lines: z.array(sevaReceiptLineSchema).min(1, 'Add at least one line'),
});

export type SevaReceiptInput = z.infer<typeof sevaReceiptSchema>;

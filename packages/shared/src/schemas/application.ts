import { z } from 'zod';
import { APPLICATION_STATUSES } from '../constants/business-types';
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

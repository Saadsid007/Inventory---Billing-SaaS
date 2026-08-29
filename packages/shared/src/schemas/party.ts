import { z } from 'zod';
import { PARTY_TYPES } from '../constants/enums';
import {
  gstinSchema,
  moneySchema,
  phoneSchema,
  pincodeSchema,
  stateCodeSchema,
} from './primitives';

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const partySchema = z
  .object({
    type: z.enum(PARTY_TYPES).default('customer'),
    name: z.string().trim().min(1, 'Enter a name').max(120),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(phoneSchema.optional()),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(z.email('Enter a valid email address').optional()),
    gstin: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(gstinSchema.optional()),
    /**
     * Optional in general, but required once a GSTIN is present — see the
     * refine below. Place of supply falls back to the GSTIN's first two digits
     * without it, which is usually right and occasionally very wrong.
     */
    stateCode: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(stateCodeSchema.optional()),
    addressLine1: optionalText(),
    city: optionalText(80),
    pincode: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(pincodeSchema.optional()),
    /**
     * What they already owed before this app existed. Positive means they owe
     * the business; negative means the business owes them (an advance).
     */
    openingBalance: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' || v === undefined ? '0' : v))
      .pipe(moneySchema),
    customFields: z.record(z.string(), z.unknown()).default({}),
  })
  .refine((v) => !v.gstin || Boolean(v.stateCode), {
    message: 'A state is required once you enter a GSTIN',
    path: ['stateCode'],
  });

export type PartyFormInput = z.infer<typeof partySchema>;

/**
 * Non-blocking advice for the party form.
 *
 * A GSTIN whose state prefix disagrees with the recorded state is legitimate —
 * a Delhi-registered buyer taking delivery in Haryana — but it is far more
 * often a typo, and it silently changes IGST vs CGST/SGST on every future
 * invoice. Worth surfacing, not worth blocking.
 */
export function partyWarnings(input: {
  gstin?: string | undefined;
  stateCode?: string | undefined;
}): string[] {
  const warnings: string[] = [];
  if (input.gstin && input.stateCode) {
    const fromGstin = input.gstin.slice(0, 2);
    if (fromGstin !== input.stateCode) {
      warnings.push(
        `This GSTIN starts with ${fromGstin} but the state says ${input.stateCode}. ` +
          'The state decides whether their bills get IGST or CGST plus SGST, so it is ' +
          'worth a second look.',
      );
    }
  }
  return warnings;
}

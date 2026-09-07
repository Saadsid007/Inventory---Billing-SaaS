import { z } from 'zod';

/**
 * A plan, as submitted from the admin panel.
 *
 * ## Why the bounds are so tight
 *
 * This form sets the amount every customer is charged. A typo here does not
 * produce a validation error somewhere downstream — it produces a UPI QR for
 * the wrong amount. So the price is capped at ₹99,999 and floored above zero:
 * a free plan is a business decision with consequences for access checks, not
 * something to arrive at by clearing a field.
 *
 * Two decimal places, matching numeric(12,2). Anything finer is silently
 * rounded by the database, and money that changes on the way into storage is
 * how a ledger stops reconciling.
 */
export const planSchema = z.object({
  label: z.string().trim().min(1, 'Give the plan a name.').max(60),
  tagline: z
    .string()
    .trim()
    .max(140)
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  monthlyPrice: z
    .string()
    .trim()
    .regex(/^\d{1,5}(\.\d{1,2})?$/, 'Price must be a number, up to two decimal places.')
    .refine((v) => Number(v) > 0, 'Price must be more than zero.')
    .transform((v) => Number(v).toFixed(2)),
  trialDays: z.coerce
    .number()
    .int('Trial length must be a whole number of days.')
    .min(0, 'Trial cannot be negative.')
    .max(365, 'A trial longer than a year is almost certainly a typo.'),
  /**
   * The bullets, as typed — one per line in the form, split before it gets
   * here. Plain strings only; see the schema file for why no markup.
   */
  features: z.array(z.string().trim().min(1).max(160)).max(20, 'Twenty bullets is plenty.'),
  isActive: z.boolean(),
});

export type PlanFormValues = z.infer<typeof planSchema>;

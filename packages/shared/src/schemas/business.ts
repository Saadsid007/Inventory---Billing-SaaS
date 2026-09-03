import { z } from 'zod';
import { TAX_MODES } from '../constants/enums';
import { isValidUqc } from '../constants/uqc';
import { gstinSchema, phoneSchema, pincodeSchema, stateCodeSchema } from './primitives';

/** Optional free text: '' becomes undefined so an untouched input never fails. */
const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your business name').max(80),
  legalName: optionalText(120),
  /**
   * Blank means unregistered — a perfectly normal state for a small shop, and
   * the reason the billing screen hides GST fields entirely rather than
   * showing empty ones.
   */
  gstin: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v))
    .pipe(gstinSchema.optional()),
  stateCode: stateCodeSchema,
  addressLine1: optionalText(),
  addressLine2: optionalText(),
  city: optionalText(80),
  pincode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(pincodeSchema.optional()),
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
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const businessSettingsSchema = z.object({
  defaultTaxMode: z.enum(TAX_MODES),
  invoiceTerms: optionalText(2000),
  invoiceFooter: optionalText(500),
  showCatalogPrices: z.boolean(),
  catalogEnabled: z.boolean(),
  catalogWhatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(phoneSchema.optional()),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

export const unitSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40),
  /**
   * Warns rather than blocks on a non-standard code. A shop may genuinely want
   * "TIN" on its own paperwork; the consequence is a GSTR-1 HSN summary the
   * portal rejects, which is a Phase 2 problem and theirs to weigh.
   */
  shortName: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Enter a short code')
    .max(6, 'At most 6 characters'),
});

export type UnitInput = z.infer<typeof unitSchema>;

export function isStandardUqc(shortName: string): boolean {
  return isValidUqc(shortName);
}

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(60),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  parentId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const customFieldSchema = z.object({
  entity: z.enum(['product', 'party']),
  label: z.string().trim().min(1, 'Enter a label').max(40),
  type: z.enum(['text', 'number', 'date', 'select', 'checkbox']),
  options: z.array(z.string().trim().min(1)).optional(),
  required: z.boolean().default(false),
  showInCatalog: z.boolean().default(false),
});

export type CustomFieldInput = z.infer<typeof customFieldSchema>;

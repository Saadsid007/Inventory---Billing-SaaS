import { z } from 'zod';
import { isCurrentStateCode } from '../constants/gst-states';
import { MONEY_SCALE, QUANTITY_SCALE } from '../types/money';

/**
 * Reusable Zod primitives, shared by client forms and server handlers so a
 * value can never pass validation in the browser and fail on the server.
 */

export const uuidSchema = z.uuid();

/**
 * Money as a string. Accepts what a user types (" 1,200.5 ") and normalises to
 * a fixed-scale decimal string the DB can store directly.
 */
export const moneySchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .transform((v) => v.replace(/,/g, ''))
  .refine((v) => /^-?\d+(\.\d+)?$/.test(v), 'Must be a number')
  .refine((v) => Math.abs(Number(v)) < 1e10, 'Value is too large')
  .transform((v) => Number(v).toFixed(MONEY_SCALE));

export const quantitySchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .transform((v) => v.replace(/,/g, ''))
  .refine((v) => /^-?\d+(\.\d+)?$/.test(v), 'Must be a number')
  .refine((v) => Math.abs(Number(v)) < 1e9, 'Value is too large')
  .transform((v) => Number(v).toFixed(QUANTITY_SCALE));

/** Percentage 0–100 with two decimals, e.g. tax rate or discount percent. */
export const percentSchema = z
  .string()
  .trim()
  .refine((v) => /^\d+(\.\d+)?$/.test(v), 'Must be a number')
  .refine((v) => Number(v) >= 0 && Number(v) <= 100, 'Must be between 0 and 100')
  .transform((v) => Number(v).toFixed(2));

export const stateCodeSchema = z
  .string()
  .trim()
  .length(2, 'State code must be 2 digits')
  .refine(isCurrentStateCode, 'Unknown GST state code');

/**
 * GSTIN: 2-digit state code, 10-char PAN, entity number, 'Z', checksum.
 * Structural check only — checksum validation lives in packages/core/src/gst.
 */
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(15, 'GSTIN must be 15 characters')
  .regex(GSTIN_PATTERN, 'Not a valid GSTIN format');

/** Indian mobile number, with or without +91. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit mobile number');

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

/** HSN/SAC: 4, 6 or 8 digits. */
export const hsnSchema = z
  .string()
  .trim()
  .regex(/^\d{4}(\d{2})?(\d{2})?$/, 'HSN must be 4, 6 or 8 digits');

/** URL-safe business slug for /store/[slug]. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'At least 3 characters')
  .max(48, 'At most 48 characters')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only');

/** ISO date string, `YYYY-MM-DD`. Postgres `date` columns take this directly. */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Not a valid date');

/** Treats "" as undefined, so an untouched optional input doesn't fail. */
export function optionalText<T extends z.ZodType<unknown, string>>(schema: T) {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v))
    .pipe(schema.optional());
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

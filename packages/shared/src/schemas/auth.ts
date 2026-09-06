import { z } from 'zod';
import { BUSINESS_TYPES } from '../constants/business-types';
import { phoneSchema, stateCodeSchema } from './primitives';

/**
 * Auth request shapes, shared by the client form and the server action, so a
 * value can never pass validation in the browser and fail on the server.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'));

/**
 * Length only, no character-class rules. Composition requirements push people
 * towards `Password1!` and away from length, which is what actually matters —
 * and the target user is a shopkeeper typing on a phone.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Password cannot be longer than 72 characters'); // bcrypt truncates past 72 bytes

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(phoneSchema.optional()),
    password: passwordSchema,
    confirmPassword: z.string(),
    businessName: z.string().trim().min(2, 'Enter your business name').max(80),
    /** Supplier state. Drives place-of-supply on every invoice (spec §5.2). */
    stateCode: stateCodeSchema,
    /**
     * Which trade this is. Decides the navigation, dashboard and wording — see
     * BUSINESS_PROFILES. Defaults to a shop so an older client that does not
     * send it still registers successfully.
     */
    businessType: z.enum(BUSINESS_TYPES).default('retail'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

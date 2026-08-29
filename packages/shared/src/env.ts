import { z } from 'zod';

/**
 * Environment validation. Build spec §2.5:
 *   "Validate them at startup with a Zod schema — fail loudly on boot,
 *    never at request time."
 *
 * `parseServerEnv` is a pure function so it can be unit-tested against
 * fixtures. `assertServerEnv()` is what apps call once, at boot
 * (apps/web/instrumentation.ts), to make a bad config a startup crash.
 */

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // --- Database ---
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a postgres:// or postgresql:// connection string',
    }),
  /** Direct (non-pooled) URL for drizzle-kit migrations. Falls back to DATABASE_URL. */
  DATABASE_URL_UNPOOLED: optionalString,

  // --- Auth ---
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.url('AUTH_URL must be an absolute URL'),

  // --- App ---
  NEXT_PUBLIC_APP_URL: z.url('NEXT_PUBLIC_APP_URL must be an absolute URL'),

  // --- Supabase Storage ---
  // Optional until Phase 1b (product image upload) turns storage on. Code that
  // touches storage must call `requireStorageEnv()` rather than reading these
  // directly, so a half-configured deploy fails with a useful message.
  SUPABASE_URL: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_PUBLIC_BUCKET: z.string().trim().min(1).default('public-assets'),
  SUPABASE_PRIVATE_BUCKET: z.string().trim().min(1).default('invoices'),
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,

  // --- Razorpay (subscription payments) ---
  // Optional: the app runs perfectly well without them, it just cannot take a
  // payment. The billing page says so plainly rather than showing a dead
  // button, and `requireRazorpayEnv()` is what fails when something tries.
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  /** Set this to the same secret configured on the Razorpay webhook. */
  RAZORPAY_WEBHOOK_SECRET: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      [
        'Invalid environment configuration:',
        ...issues.map((i) => `  • ${i}`),
        '',
        'Copy .env.example to .env at the repo root and fill in the values.',
      ].join('\n'),
    );
    this.name = 'EnvValidationError';
  }
}

/** Pure. Takes a raw env-like record, returns a validated env or throws. */
export function parseServerEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/**
 * Validate `process.env` once and cache it. Call from the app's boot hook so a
 * misconfiguration kills the process immediately instead of surfacing as a
 * 500 on some unlucky request three hours later.
 */
export function assertServerEnv(): ServerEnv {
  if (cached) return cached;
  if (process.env['SKIP_ENV_VALIDATION'] === 'true') {
    // Escape hatch for CI/Docker builds that compile without runtime secrets.
    cached = serverEnvSchema.parse({
      DATABASE_URL: 'postgresql://build:build@localhost:5432/build',
      AUTH_SECRET: 'x'.repeat(32),
      AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    return cached;
  }
  cached = parseServerEnv(process.env);
  return cached;
}

/** Accessor for validated env. Safe to call anywhere on the server. */
export function serverEnv(): ServerEnv {
  return assertServerEnv();
}

export type StorageEnv = {
  url: string;
  serviceRoleKey: string;
  publicBucket: string;
  privateBucket: string;
};

/**
 * Storage config, or a clear error. Used by anything that uploads to Supabase.
 * Keeps storage credentials optional for Phase 0–1a while still failing
 * usefully the moment someone tries to upload without them.
 */
export function requireStorageEnv(): StorageEnv {
  const env = serverEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new EnvValidationError([
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file storage',
    ]);
  }
  return {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    publicBucket: env.SUPABASE_PUBLIC_BUCKET,
    privateBucket: env.SUPABASE_PRIVATE_BUCKET,
  };
}

export type RazorpayEnv = {
  keyId: string;
  keySecret: string;
  webhookSecret: string | undefined;
};

/** True when payments can be taken at all. Read this before offering to. */
export function hasRazorpay(): boolean {
  const env = serverEnv();
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function requireRazorpayEnv(): RazorpayEnv {
  const env = serverEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new EnvValidationError([
      'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required to take payments',
    ]);
  }
  return {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  };
}

/** Reset the cache. Test-only. */
export function __resetEnvCacheForTests(): void {
  cached = undefined;
}

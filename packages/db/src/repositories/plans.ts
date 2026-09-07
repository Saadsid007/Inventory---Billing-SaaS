import {
  BUSINESS_TYPES,
  type BusinessType,
  PLAN_DEFAULTS,
  type PlanDefaults,
} from '@billwise/shared';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { plans } from '../schema/index';

/**
 * Plans and prices.
 *
 * ## Why these take no TenantCtx
 *
 * Every other repository here is scoped by business, because every other table
 * holds one shop's data. This one holds ours: what we charge, per vertical.
 * There is nothing to scope it by, and scoping it by the reader's business
 * would be wrong — a Jan Seva owner comparing plans should see the shop's price
 * too.
 *
 * Reads are open. Writes must be behind `requireSuperAdmin()`, and there is no
 * write here that takes a business id, so a tenant cannot alter their own
 * price even by guessing a URL.
 */

export type Plan = {
  businessType: BusinessType;
  label: string;
  tagline: string | null;
  /** A money string. Never parsed to a number on the way to a payment. */
  monthlyPrice: string;
  trialDays: number;
  features: string[];
  isActive: boolean;
  updatedAt: string | null;
};

/**
 * The code-level fallback, shaped like a row.
 *
 * Used when the `plans` table has no row for a type — a fresh database, or a
 * vertical added in code before anyone opened the admin panel. Billing must
 * never fail because a configuration row is missing; it falls back to a
 * documented default and carries on.
 */
function fallback(type: BusinessType): Plan {
  const d: PlanDefaults = PLAN_DEFAULTS[type];
  return {
    businessType: type,
    label: d.label,
    tagline: d.tagline,
    monthlyPrice: d.monthlyPrice,
    trialDays: d.trialDays,
    features: [...d.features],
    isActive: true,
    updatedAt: null,
  };
}

function toPlan(row: typeof plans.$inferSelect): Plan {
  return {
    businessType: row.businessType as BusinessType,
    label: row.label,
    tagline: row.tagline,
    monthlyPrice: row.monthlyPrice,
    trialDays: row.trialDays,
    features: Array.isArray(row.features) ? row.features : [],
    isActive: row.isActive,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

/**
 * Every plan, one per business type, in the order the types are declared.
 *
 * Types with no row yet appear as their fallback rather than being missing, so
 * the admin panel lists every vertical that exists in code — including one
 * added in a deploy five minutes ago that nobody has priced.
 */
export async function listPlans(): Promise<Plan[]> {
  const rows = await getDb().select().from(plans).orderBy(asc(plans.businessType));
  const byType = new Map(rows.map((r) => [r.businessType, toPlan(r)]));
  return BUSINESS_TYPES.map((type) => byType.get(type) ?? fallback(type));
}

/** One plan. Never returns undefined — see `fallback`. */
export async function getPlan(type: string | null | undefined): Promise<Plan> {
  const key = (BUSINESS_TYPES as readonly string[]).includes(type ?? '')
    ? (type as BusinessType)
    : 'retail';

  const [row] = await getDb().select().from(plans).where(eq(plans.businessType, key)).limit(1);
  return row ? toPlan(row) : fallback(key);
}

export type PlanInput = {
  label: string;
  tagline: string | null;
  monthlyPrice: string;
  trialDays: number;
  features: string[];
  isActive: boolean;
};

/**
 * Create or update one plan. Super admin only.
 *
 * An upsert rather than an update, because a type's first edit happens when it
 * still has no row — the admin panel is showing the fallback, and saving it is
 * how the row comes into existence.
 */
export async function upsertPlan(
  type: BusinessType,
  input: PlanInput,
  updatedBy: string,
): Promise<void> {
  const values = {
    businessType: type,
    label: input.label.trim(),
    tagline: input.tagline?.trim() || null,
    monthlyPrice: input.monthlyPrice,
    trialDays: input.trialDays,
    // Blank lines dropped here rather than in the form, so the same rule holds
    // whatever calls this.
    features: input.features.map((f) => f.trim()).filter(Boolean),
    isActive: input.isActive,
    updatedBy,
  };

  await getDb()
    .insert(plans)
    .values(values)
    .onConflictDoUpdate({ target: plans.businessType, set: { ...values, updatedBy } });
}

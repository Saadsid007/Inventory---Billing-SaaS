import {
  type CustomFieldEntity,
  SEED_UNITS,
  type TenantCtx,
} from '@bahikhata/shared';
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import type { Executor } from '../client';
import { getDb } from '../client';
import { categories, customFieldDefs, taxRates, units } from '../schema/index';

/**
 * Per-business master lists. Build spec §4 and Phase 1a.
 *
 * Every function takes `TenantCtx` first and scopes by `ctx.businessId` — the
 * reference shape is `businesses.ts`.
 */

// ---------------------------------------------------------------- units ----

export async function listUnits(ctx: TenantCtx) {
  return getDb()
    .select()
    .from(units)
    .where(eq(units.businessId, ctx.businessId))
    .orderBy(asc(units.name));
}

export async function createUnit(ctx: TenantCtx, input: { name: string; shortName: string }) {
  const [row] = await getDb()
    .insert(units)
    .values({
      businessId: ctx.businessId,
      name: input.name.trim(),
      shortName: input.shortName.trim().toUpperCase(),
    })
    .returning();
  return row;
}

export async function deleteUnit(ctx: TenantCtx, unitId: string) {
  // Scoped by business too, not just id — otherwise a guessed uuid from
  // another tenant would delete their data.
  await getDb()
    .delete(units)
    .where(and(eq(units.id, unitId), eq(units.businessId, ctx.businessId)));
}

// ----------------------------------------------------------- categories ----

export async function listCategories(ctx: TenantCtx) {
  return getDb()
    .select()
    .from(categories)
    .where(eq(categories.businessId, ctx.businessId))
    .orderBy(asc(categories.name));
}

export async function createCategory(ctx: TenantCtx, name: string) {
  const [row] = await getDb()
    .insert(categories)
    .values({ businessId: ctx.businessId, name: name.trim() })
    .returning();
  return row;
}

export async function renameCategory(ctx: TenantCtx, categoryId: string, name: string) {
  await getDb()
    .update(categories)
    .set({ name: name.trim() })
    .where(and(eq(categories.id, categoryId), eq(categories.businessId, ctx.businessId)));
}

export async function deleteCategory(ctx: TenantCtx, categoryId: string) {
  await getDb()
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.businessId, ctx.businessId)));
}

// ------------------------------------------------------------ tax rates ----

/**
 * Rates this business can pick from: the global GST slabs plus any it defined
 * itself.
 *
 * `asOf` filters by `effective_from`/`effective_to` so a rate that has been
 * retired — as 12% and 28% were on 22 Sep 2025 — stops being offered on new
 * invoices while old invoices keep printing what they were billed at.
 */
export async function listTaxRates(ctx: TenantCtx, asOf?: string) {
  const date = asOf ?? new Date().toISOString().slice(0, 10);
  return getDb()
    .select()
    .from(taxRates)
    .where(
      and(
        or(isNull(taxRates.businessId), eq(taxRates.businessId, ctx.businessId)),
        eq(taxRates.isActive, true),
        sql`${taxRates.effectiveFrom} <= ${date}`,
        sql`(${taxRates.effectiveTo} is null or ${taxRates.effectiveTo} >= ${date})`,
      ),
    )
    .orderBy(asc(taxRates.rate));
}

export async function createTaxRate(
  ctx: TenantCtx,
  input: { name: string; rate: string; cessRate?: string; effectiveFrom: string },
) {
  const [row] = await getDb()
    .insert(taxRates)
    .values({
      businessId: ctx.businessId,
      name: input.name.trim(),
      rate: input.rate,
      cessRate: input.cessRate ?? '0',
      effectiveFrom: input.effectiveFrom,
    })
    .returning();
  return row;
}

// --------------------------------------------------------- custom fields ----

export async function listCustomFieldDefs(ctx: TenantCtx, entity: CustomFieldEntity) {
  return getDb()
    .select()
    .from(customFieldDefs)
    .where(
      and(eq(customFieldDefs.businessId, ctx.businessId), eq(customFieldDefs.entity, entity)),
    )
    .orderBy(asc(customFieldDefs.sortOrder), asc(customFieldDefs.label));
}

export type CustomFieldInput = {
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options?: string[];
  required?: boolean;
  showInCatalog?: boolean;
  sortOrder?: number;
};

export async function createCustomFieldDef(ctx: TenantCtx, input: CustomFieldInput) {
  const [row] = await getDb()
    .insert(customFieldDefs)
    .values({
      businessId: ctx.businessId,
      entity: input.entity,
      key: input.key,
      label: input.label.trim(),
      type: input.type,
      options: input.options ?? null,
      required: input.required ?? false,
      showInCatalog: input.showInCatalog ?? false,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function deleteCustomFieldDef(ctx: TenantCtx, defId: string) {
  // The definition goes; the values already stored in products.custom_fields
  // stay. Stripping them from every row would destroy data the business
  // entered, and re-adding the field should bring it back.
  await getDb()
    .delete(customFieldDefs)
    .where(and(eq(customFieldDefs.id, defId), eq(customFieldDefs.businessId, ctx.businessId)));
}

// ----------------------------------------------------------- seeding ------

/**
 * Give a brand-new business a usable set of units.
 *
 * Runs inside the signup transaction, so a shopkeeper can add their first
 * product without visiting a settings page first. Categories are deliberately
 * NOT seeded — a kirana store's categories have nothing in common with a
 * hardware shop's, and a wrong default is worse than an empty list.
 *
 * Tax rates are global rows seeded once by `src/seed.ts`, not per business.
 */
export async function seedBusinessMasters(tx: Executor, businessId: string): Promise<void> {
  await tx.insert(units).values(
    SEED_UNITS.map((u) => ({
      businessId,
      name: u.name,
      shortName: u.shortName,
    })),
  );
}

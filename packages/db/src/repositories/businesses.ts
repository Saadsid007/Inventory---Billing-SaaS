import type { TenantCtx } from '@bahikhata/shared';
import { and, eq, gt, or, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { businessSettings, businesses } from '../schema/index';

/**
 * THE REFERENCE REPOSITORY. Build spec §2.5/§3.
 *
 * Copy this shape for products, parties, invoices and everything after.
 * Three things make it correct, and all three are load-bearing:
 *
 *   1. `ctx: TenantCtx` is the first parameter — on reads too, not just writes.
 *   2. Every `where` clause pins `business_id` to `ctx.businessId`.
 *   3. `businessId` is never accepted as a separate argument, so there is no
 *      way for a caller to pass one that came from a request.
 *
 * A single query in this codebase that forgets rule 2 shows one shop's
 * customers and prices to another shop. That is not a bug you get to fix
 * quietly afterwards.
 */

export type BusinessProfile = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  gstin: string | null;
  stateCode: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
};

export async function getBusiness(ctx: TenantCtx): Promise<BusinessProfile | undefined> {
  const [row] = await getDb()
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      legalName: businesses.legalName,
      gstin: businesses.gstin,
      stateCode: businesses.stateCode,
      addressLine1: businesses.addressLine1,
      addressLine2: businesses.addressLine2,
      city: businesses.city,
      pincode: businesses.pincode,
      phone: businesses.phone,
      email: businesses.email,
      logoUrl: businesses.logoUrl,
    })
    .from(businesses)
    .where(eq(businesses.id, ctx.businessId))
    //         ^ always from ctx, never from a parameter or request field
    .limit(1);
  return row;
}

/**
 * Status plus the handful of fields the app shell renders.
 *
 * Bundled into one row read because `requireBusiness()` runs on every single
 * authenticated request — splitting "am I allowed in" from "what is my shop
 * called" would double that cost for no benefit.
 */
export async function getBusinessStatus(ctx: TenantCtx) {
  const [row] = await getDb()
    .select({
      name: businesses.name,
      slug: businesses.slug,
      status: businesses.status,
      trialEndsAt: businesses.trialEndsAt,
      approvedAt: businesses.approvedAt,
      createdAt: businesses.createdAt,
    })
    .from(businesses)
    .where(eq(businesses.id, ctx.businessId))
    .limit(1);
  return row;
}

export type BusinessProfilePatch = Partial<Omit<BusinessProfile, 'id' | 'slug'>>;

export async function updateBusinessProfile(
  ctx: TenantCtx,
  patch: BusinessProfilePatch,
): Promise<void> {
  // Only an owner edits the business's own identity — a staff member changing
  // the GSTIN would silently change the tax treatment of every future invoice.
  if (ctx.role !== 'owner') {
    throw new Error('Only the owner can edit the business profile.');
  }
  await getDb().update(businesses).set(patch).where(eq(businesses.id, ctx.businessId));
}

export async function getSettings(ctx: TenantCtx) {
  const [row] = await getDb()
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.businessId, ctx.businessId))
    .limit(1);
  return row;
}

export type SettingsPatch = Partial<{
  defaultTaxMode: 'inclusive' | 'exclusive';
  invoiceTerms: string | null;
  invoiceFooter: string | null;
  showCatalogPrices: boolean;
  catalogEnabled: boolean;
  catalogWhatsapp: string | null;
  theme: string;
}>;

export async function updateSettings(ctx: TenantCtx, patch: SettingsPatch): Promise<void> {
  await getDb()
    .update(businessSettings)
    .set(patch)
    .where(eq(businessSettings.businessId, ctx.businessId));
}

/**
 * Public catalog lookup — the one intentionally unscoped read in this file.
 *
 * `/store/[slug]` is served to anonymous visitors, so there is no session and no
 * TenantCtx to scope by. It is safe only because of what it returns: a
 * business's own public identity, and nothing transactional. The access and
 * `catalog_enabled` checks are part of the query rather than the caller's job,
 * so a page cannot forget them and expose a suspended or opted-out shop.
 *
 * Trial businesses get a live catalog too — it is the feature most likely to
 * convince someone to pay, so hiding it until they do would be backwards. The
 * expiry test mirrors `evaluateAccess()` in @bahikhata/shared; the two must
 * stay in step.
 */
export async function findPublicCatalogBusiness(slug: string) {
  const [row] = await getDb()
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      city: businesses.city,
      addressLine1: businesses.addressLine1,
      phone: businesses.phone,
      logoUrl: businesses.logoUrl,
      showCatalogPrices: businessSettings.showCatalogPrices,
      catalogWhatsapp: businessSettings.catalogWhatsapp,
    })
    .from(businesses)
    .innerJoin(businessSettings, eq(businessSettings.businessId, businesses.id))
    .where(
      and(
        eq(businesses.slug, slug),
        eq(businessSettings.catalogEnabled, true),
        or(
          eq(businesses.status, 'active'),
          and(eq(businesses.status, 'trial'), gt(businesses.trialEndsAt, sql`now()`)),
        ),
      ),
    )
    .limit(1);
  return row;
}

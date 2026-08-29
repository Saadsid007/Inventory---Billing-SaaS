import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { businessSettings, businesses, catalogViews, categories, products } from '../schema/index';

/**
 * The public catalog. Build spec Phase 1f — the differentiator.
 *
 * Everything here is UNSCOPED by `TenantCtx`, and that is deliberate: these
 * pages are served to anonymous visitors who have no session. The safety comes
 * from what the queries return, not from who is asking:
 *
 *   • no cost price, no margins, no exact stock number
 *   • nothing transactional — no invoices, no parties, no ledger
 *   • the "is this catalog live?" test is baked into every query, so a page
 *     cannot forget it and expose a suspended or opted-out shop
 *
 * This file is the only place in the codebase allowed to read business data
 * without a tenant context. Nothing else belongs in it.
 */

/**
 * A catalog is live while the business is paid, or on an unexpired trial.
 *
 * Trial shops get a live catalog on purpose: it is the feature most likely to
 * convince someone to pay, so hiding it until they do would be backwards.
 *
 * This mirrors `evaluateAccess()` in @billwise/shared. **The two must stay in
 * step** — if one changes, so does the other.
 */
const catalogIsLive = () =>
  or(
    and(
      eq(businesses.status, 'active'),
      or(isNull(businesses.paidUntil), gt(businesses.paidUntil, sql`now()`)),
    ),
    and(eq(businesses.status, 'trial'), gt(businesses.trialEndsAt, sql`now()`)),
  );

export type CatalogBusiness = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  addressLine1: string | null;
  phone: string | null;
  logoUrl: string | null;
  showCatalogPrices: boolean;
  catalogWhatsapp: string | null;
};

export async function findCatalogBusiness(slug: string): Promise<CatalogBusiness | undefined> {
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
        catalogIsLive(),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Every live catalog, for the sitemap.
 *
 * Unscoped by tenant like the rest of this file, and deliberately thin: a slug
 * and a timestamp are all a sitemap needs, and a shop's product names have no
 * business being loaded to build one.
 */
export async function listLiveCatalogSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const rows = await getDb()
    .select({ slug: businesses.slug, updatedAt: businesses.createdAt })
    .from(businesses)
    .innerJoin(businessSettings, eq(businessSettings.businessId, businesses.id))
    .where(and(eq(businessSettings.catalogEnabled, true), catalogIsLive()))
    .limit(5000);
  return rows;
}

/**
 * Stock as a state, never a number.
 *
 * Competitors read catalogs. "3 left" tells them exactly how much you carry and
 * how fast you sell; "In stock" tells a customer what they need to know and
 * nothing more (spec Phase 1f).
 */
const stockStatus = sql<'in_stock' | 'low_stock' | 'out_of_stock'>`
  case
    when ${products.trackInventory} = false then 'in_stock'
    when ${products.currentStock} <= 0 then 'out_of_stock'
    when ${products.lowStockAlert} is not null
         and ${products.currentStock} <= ${products.lowStockAlert} then 'low_stock'
    else 'in_stock'
  end
`;

const catalogProductColumns = {
  id: products.id,
  name: products.name,
  description: products.description,
  salePrice: products.salePrice,
  imageUrls: products.imageUrls,
  categoryId: products.categoryId,
  categoryName: categories.name,
  hsnCode: products.hsnCode,
  customFields: products.customFields,
  stockStatus,
};

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  salePrice: string;
  imageUrls: string[];
  categoryId: string | null;
  categoryName: string | null;
  hsnCode: string | null;
  customFields: Record<string, unknown>;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
};

export async function listCatalogProducts(
  businessId: string,
  opts: { categoryId?: string; search?: string; limit?: number; offset?: number } = {},
): Promise<CatalogProduct[]> {
  const where = [
    eq(products.businessId, businessId),
    eq(products.isActive, true),
    eq(products.showInCatalog, true),
  ];
  if (opts.categoryId) where.push(eq(products.categoryId, opts.categoryId));
  if (opts.search) {
    const term = `%${opts.search.trim()}%`;
    where.push(
      sql`(${products.name} ilike ${term} or ${products.description} ilike ${term})`,
    );
  }

  const rows = await getDb()
    .select(catalogProductColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...where))
    .orderBy(products.name)
    .limit(opts.limit ?? 60)
    .offset(opts.offset ?? 0);

  return rows as CatalogProduct[];
}

/**
 * One product, found by the short id at the end of its URL slug.
 *
 * The URL is `/store/{shop}/{name-slug}-{first 8 chars of uuid}`, which keeps
 * the product name in the path for SEO without exposing a full uuid. Eight hex
 * characters is 4 billion values; within one shop's few thousand products a
 * collision is not a realistic concern, and even then both candidates are
 * public products of the same shop, so it is a cosmetic problem rather than a
 * disclosure one.
 */
export async function findCatalogProduct(
  businessId: string,
  shortId: string,
): Promise<CatalogProduct | undefined> {
  if (!/^[0-9a-f]{6,36}$/i.test(shortId)) return undefined;

  const [row] = await getDb()
    .select(catalogProductColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.businessId, businessId),
        eq(products.isActive, true),
        eq(products.showInCatalog, true),
        sql`${products.id}::text like ${shortId.toLowerCase() + '%'}`,
      ),
    )
    .limit(1);

  return row as CatalogProduct | undefined;
}

/** Categories that actually have something to show. An empty filter is noise. */
export async function listCatalogCategories(businessId: string) {
  return getDb()
    .selectDistinct({ id: categories.id, name: categories.name })
    .from(categories)
    .innerJoin(
      products,
      and(
        eq(products.categoryId, categories.id),
        eq(products.isActive, true),
        eq(products.showInCatalog, true),
      ),
    )
    .where(eq(categories.businessId, businessId))
    .orderBy(categories.name);
}

/**
 * Record a catalog view.
 *
 * Called from a route handler on the client rather than during render: the
 * catalog page is ISR-cached, so counting in the render would record one view
 * per revalidation instead of one per visitor.
 *
 * Never throws. A dropped analytics row is worth nothing; an exception on a
 * public page is worth a lot less than nothing.
 */
export async function recordCatalogView(input: {
  businessId: string;
  productId?: string | null;
  referrer?: string | null;
}): Promise<void> {
  try {
    await getDb()
      .insert(catalogViews)
      .values({
        businessId: input.businessId,
        productId: input.productId ?? null,
        referrer: input.referrer?.slice(0, 500) ?? null,
      });
  } catch (error) {
    console.warn('Could not record a catalog view.', error);
  }
}

import { findCatalogBusiness, findCatalogProduct, recordCatalogView } from '@billwise/db';
import { shortIdFromProductSlug } from '@billwise/shared';
import { NextResponse } from 'next/server';

/**
 * Catalog view counter. Build spec Phase 1f.
 *
 * A thin route handler (spec §2.5 hard rule 4): parse, call a repository,
 * respond. No business logic.
 *
 * This is an unauthenticated public endpoint, so it is written to be boring:
 *
 *   • the business is resolved from the SLUG, never from a posted id — a caller
 *     cannot attribute views to someone else's shop
 *   • the same live-catalog check as the page itself, so a switched-off shop
 *     cannot be polled
 *   • it always answers 204, success or not. Telling an anonymous caller which
 *     slugs exist is free reconnaissance, and there is nothing useful they
 *     could do with the answer anyway
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug?: unknown;
      productId?: unknown;
      referrer?: unknown;
    };

    const slug = typeof body.slug === 'string' ? body.slug.slice(0, 64) : '';
    if (!slug) return new NextResponse(null, { status: 204 });

    const business = await findCatalogBusiness(slug);
    if (!business) return new NextResponse(null, { status: 204 });

    // A posted product identifier is treated as a request, not a fact: it is
    // resolved against this business's own catalog before being stored, so it
    // cannot become a foreign key to someone else's product.
    let productId: string | null = null;
    if (typeof body.productId === 'string') {
      const shortId = shortIdFromProductSlug(body.productId) ?? body.productId;
      const product = await findCatalogProduct(business.id, shortId);
      productId = product?.id ?? null;
    }

    await recordCatalogView({
      businessId: business.id,
      productId,
      referrer: typeof body.referrer === 'string' ? body.referrer : null,
    });
  } catch {
    // Analytics must never surface an error on a shop's storefront.
  }

  return new NextResponse(null, { status: 204 });
}

import { findCatalogBusiness, listCatalogCategories, listCatalogProducts } from '@bahikhata/db';
import { enquiryMessage, productSlug, whatsappEnquiryUrl } from '@bahikhata/shared';
import { EmptyState, StockBadge } from '@bahikhata/ui';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogSearch } from './catalog-search';
import { CatalogViewTracker } from './view-tracker';

/**
 * The shop's catalog. Build spec Phase 1f.
 *
 * ISR at 60s: a catalog is read far more often than it changes, and a shop
 * adding a product does not need it live in the same second. Sixty seconds
 * keeps the page fast and cheap for the traffic a QR code actually produces.
 */
export const revalidate = 60;

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { slug } = await params;
  const { q, category } = await searchParams;

  const business = await findCatalogBusiness(slug);
  if (!business) notFound();

  const [products, categories] = await Promise.all([
    listCatalogProducts(business.id, { search: q, categoryId: category, limit: 60 }),
    listCatalogCategories(business.id),
  ]);

  const whatsapp = whatsappEnquiryUrl(
    business.catalogWhatsapp,
    enquiryMessage(business.name),
  );

  /**
   * schema.org markup so a Google result for "shop name product" can show the
   * shop, its address and its phone number rather than a bare blue link. This
   * is most of why the catalog is worth building at all.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: business.name,
    ...(business.logoUrl && { image: business.logoUrl }),
    ...(business.phone && { telephone: business.phone }),
    ...((business.addressLine1 || business.city) && {
      address: {
        '@type': 'PostalAddress',
        ...(business.addressLine1 && { streetAddress: business.addressLine1 }),
        ...(business.city && { addressLocality: business.city }),
        addressCountry: 'IN',
      },
    }),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${business.name} products`,
      itemListElement: products.slice(0, 30).map((p) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Product', name: p.name },
        ...(business.showCatalogPrices && {
          price: p.salePrice,
          priceCurrency: 'INR',
        }),
        availability:
          p.stockStatus === 'out_of_stock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Counted client-side: the page is ISR-cached, so counting during render
          would record one view per revalidation instead of one per visitor. */}
      <CatalogViewTracker slug={slug} />

      <div className="space-y-5">
        <CatalogSearch
          slug={slug}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initial={{ q: q ?? '', category: category ?? '' }}
        />

        {products.length === 0 ? (
          <EmptyState
            title={q || category ? 'Nothing matches that' : 'Nothing listed yet'}
            description={
              q || category
                ? 'Try a different search, or browse everything.'
                : 'This shop has not published any products yet. Check back soon.'
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const cover = p.imageUrls?.[0];
              return (
                <li key={p.id}>
                  <Link
                    href={`/store/${slug}/${productSlug(p.name, p.id)}`}
                    className="group block overflow-hidden rounded-lg border transition-colors hover:border-foreground/30"
                  >
                    <div className="relative aspect-square bg-muted">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform group-hover:scale-[1.02]"
                          unoptimized
                        />
                      ) : (
                        <div className="grid h-full place-items-center px-3 text-center text-xs text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 p-3">
                      <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                      {business.showCatalogPrices ? (
                        <p className="tabular text-sm font-semibold">₹{p.salePrice}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Ask for price</p>
                      )}
                      {/* A state, never a number — competitors read catalogs too. */}
                      <StockBadge status={p.stockStatus} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {products.length >= 60 && (
          <p className="text-center text-xs text-muted-foreground">
            Showing the first 60 products. Use search to find something specific.
          </p>
        )}

        {whatsapp && (
          <div className="flex justify-center pt-4">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-md bg-success px-5 text-sm font-medium text-success-foreground transition-opacity hover:opacity-90"
            >
              Enquire on WhatsApp
            </a>
          </div>
        )}
      </div>
    </>
  );
}

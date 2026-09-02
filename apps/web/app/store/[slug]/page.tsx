import { findCatalogBusiness, listCatalogCategories, listCatalogProducts } from '@billwise/db';
import {
  DEFAULT_STOREFRONT_CONFIG,
  enquiryMessage,
  storefrontDisplayText,
  whatsappEnquiryUrl,
} from '@billwise/shared';
import { EmptyState } from '@billwise/ui';
import { MessageCircle, PackageSearch } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogProductCard } from './catalog-product-card';
import { CatalogSearch } from './catalog-search';
import { CatalogViewTracker } from './view-tracker';

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

  const activeCategory = categories.find((c) => c.id === category);
  const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...(business.storefrontConfig || {}) };

  const heroHeadline = storefrontDisplayText(
    cfg.heroHeadline,
    `Welcome to ${business.name}`,
  );
  const heroDescription = storefrontDisplayText(
    cfg.heroDescription,
    'Browse products and order on WhatsApp for quick pickup or local delivery.',
  );

  const defaultWhatsapp = whatsappEnquiryUrl(
    business.catalogWhatsapp,
    enquiryMessage(business.name),
  );

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

  const showWelcome = !q && !category;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CatalogViewTracker slug={slug} />

      <div className="space-y-4 sm:space-y-6">
        {/* Compact welcome — only on main catalog view, no filters active */}
        {showWelcome && (
          <section
            aria-label="Store welcome"
            className="rounded-xl border bg-gradient-to-r from-primary/8 via-card to-emerald-500/8 px-3.5 py-3 sm:rounded-2xl sm:px-5 sm:py-4"
          >
            <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              {heroHeadline}
            </h2>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {heroDescription}
            </p>
          </section>
        )}

        {/* Search & categories — primary action area */}
        <div className="space-y-3">
          <CatalogSearch
            slug={slug}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            initial={{ q: q ?? '', category: category ?? '' }}
          />

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground sm:text-base">
              {activeCategory ? activeCategory.name : 'All Products'}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({products.length})
              </span>
            </h3>

            {(q || category) && (
              <Link
                href={`/store/${slug}`}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={q || category ? 'No matching products found' : 'Nothing listed yet'}
            description={
              q || category
                ? 'Try a different search keyword, or browse all categories.'
                : 'This shop has not published any products yet. Check back soon.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p) => (
              <CatalogProductCard
                key={p.id}
                slug={slug}
                businessName={business.name}
                catalogWhatsapp={business.catalogWhatsapp}
                showPrice={business.showCatalogPrices}
                showStockCount={cfg.showStockCount !== false}
                product={p}
              />
            ))}
          </div>
        )}

        {products.length >= 60 && (
          <p className="text-center text-xs text-muted-foreground">
            Showing first 60 products. Use search to find more.
          </p>
        )}

        {defaultWhatsapp && (
          <div className="rounded-xl border bg-card p-4 text-center sm:rounded-2xl sm:p-6">
            <h3 className="text-sm font-bold text-foreground sm:text-base">
              Need something not listed?
            </h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Send your shopping list on WhatsApp and we&apos;ll pack it for you.
            </p>
            <a
              href={defaultWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:text-sm"
            >
              <MessageCircle className="size-4" />
              Message on WhatsApp
            </a>
          </div>
        )}
      </div>

      {defaultWhatsapp && (
        <a
          href={defaultWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Order on WhatsApp"
          className="fixed bottom-4 right-4 z-50 grid size-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform hover:bg-emerald-700 active:scale-95 sm:bottom-6 sm:right-6 sm:inline-flex sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:px-5 sm:py-3 sm:text-sm sm:font-bold"
        >
          <MessageCircle className="size-6 sm:size-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
    </>
  );
}

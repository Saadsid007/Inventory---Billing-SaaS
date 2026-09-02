import { findCatalogBusiness, listCatalogCategories, listCatalogProducts } from '@billwise/db';
import { enquiryMessage, productSlug, whatsappEnquiryUrl } from '@billwise/shared';
import { EmptyState } from '@billwise/ui';
import {
  ArrowRight,
  CreditCard,
  ImageOff,
  MessageCircle,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CatalogViewTracker slug={slug} />

      <div className="space-y-8">
        {/* Store Hero Showcase Banner */}
        <section aria-label="Store highlights" className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 p-6 sm:p-8 shadow-xs">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-xs shadow-2xs">
              <Sparkles className="size-3.5" />
              <span>Direct Neighborhood Store Online</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome to {business.name}
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Browse daily groceries, authentic dairy, packaged staples, and household essentials.
              Tap <strong>Order on WhatsApp</strong> on any item to place your order with direct store confirmation.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 rounded-md bg-background/60 px-2.5 py-1 border shadow-2xs">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                100% Original Brands
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-background/60 px-2.5 py-1 border shadow-2xs">
                <Truck className="size-3.5 text-emerald-600" />
                Store Pickup & Local Delivery
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-background/60 px-2.5 py-1 border shadow-2xs">
                <CreditCard className="size-3.5 text-emerald-600" />
                Cash / UPI on Delivery
              </span>
            </div>
          </div>
        </section>

        {/* 4-Item Store Trust Feature Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs transition-transform hover:-translate-y-0.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <MessageCircle className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">WhatsApp Order</p>
              <p className="truncate text-[11px] text-muted-foreground">1-Tap order directly</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs transition-transform hover:-translate-y-0.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">100% Genuine</p>
              <p className="truncate text-[11px] text-muted-foreground">Company sealed packs</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs transition-transform hover:-translate-y-0.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <PackageCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Counter Pickup</p>
              <p className="truncate text-[11px] text-muted-foreground">Ready in 15 mins</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs transition-transform hover:-translate-y-0.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Cash & UPI</p>
              <p className="truncate text-[11px] text-muted-foreground">GPay, PhonePe & Cash</p>
            </div>
          </div>
        </div>

        {/* Category Navigation & Search */}
        <div className="space-y-3 pt-2">
          <CatalogSearch
            slug={slug}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            initial={{ q: q ?? '', category: category ?? '' }}
          />

          {/* Active Category Header Indicator */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{activeCategory ? activeCategory.name : 'All Products'}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({products.length} {products.length === 1 ? 'item' : 'items'})
              </span>
            </h3>

            {(q || category) && (
              <Link
                href={`/store/${slug}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all filters
              </Link>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const cover = p.imageUrls?.[0];
              const pWhatsapp = whatsappEnquiryUrl(
                business.catalogWhatsapp,
                `Hi ${business.name}, I would like to order "${p.name}" (₹${p.salePrice}) from your online catalog. Please confirm availability and pickup/delivery!`,
              );

              return (
                <div
                  key={p.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
                >
                  {/* Top: Image & Badges */}
                  <div>
                    <Link
                      href={`/store/${slug}/${productSlug(p.name, p.id)}`}
                      className="block relative aspect-square overflow-hidden bg-muted/30"
                    >
                      {cover ? (
                        <Image
                          src={cover}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="grid h-full place-items-center gap-1.5 px-3 text-center text-xs text-muted-foreground">
                          <ImageOff className="size-8 opacity-40" />
                          <span className="font-medium">No photo</span>
                        </div>
                      )}

                      {/* Stock Status Badge */}
                      <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
                        {p.stockStatus === 'in_stock' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs shadow-xs">
                            <span className="size-1.5 rounded-full bg-white animate-pulse" />
                            In Stock
                          </span>
                        )}
                        {p.stockStatus === 'out_of_stock' && (
                          <span className="inline-flex items-center rounded-full bg-rose-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                            Sold Out
                          </span>
                        )}
                      </div>

                      {p.categoryName && (
                        <span className="absolute right-2.5 top-2.5 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-xs border shadow-2xs">
                          {p.categoryName}
                        </span>
                      )}
                    </Link>

                    {/* Middle: Info */}
                    <div className="p-3.5 sm:p-4 space-y-2">
                      <h4 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        <Link href={`/store/${slug}/${productSlug(p.name, p.id)}`}>
                          {p.name}
                        </Link>
                      </h4>

                      {business.showCatalogPrices ? (
                        <div className="flex items-baseline gap-2">
                          <span className="tabular text-lg sm:text-xl font-bold text-foreground">
                            ₹{p.salePrice}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Best Retail Price
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground font-medium">
                          Price on WhatsApp
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="p-3.5 sm:p-4 pt-0 space-y-2">
                    {pWhatsapp ? (
                      <a
                        href={pWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-98"
                      >
                        <MessageCircle className="size-3.5" />
                        <span>Order on WhatsApp</span>
                      </a>
                    ) : (
                      <Link
                        href={`/store/${slug}/${productSlug(p.name, p.id)}`}
                        className="flex w-full items-center justify-center gap-1 rounded-xl border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {products.length >= 60 && (
          <p className="text-center text-xs text-muted-foreground pt-4">
            Showing first 60 products. Use the search bar to find more items in stock.
          </p>
        )}

        {/* Bottom Store Contact Banner */}
        {defaultWhatsapp && (
          <div className="rounded-3xl border bg-card p-6 sm:p-8 text-center space-y-3 shadow-xs">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Don't see what you're looking for?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We carry hundreds of daily grocery items in-store. Send us your shopping list on WhatsApp and we will pack it for you!
            </p>
            <div className="pt-2">
              <a
                href={defaultWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98"
              >
                <MessageCircle className="size-4" />
                <span>Send Grocery List on WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Floating WhatsApp Quick Button for Mobile/Desktop */}
      {defaultWhatsapp && (
        <a
          href={defaultWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Order on WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-emerald-700 active:scale-95 transition-all group"
        >
          <MessageCircle className="size-5" />
          <span className="hidden sm:inline">Quick WhatsApp Order</span>
        </a>
      )}
    </>
  );
}

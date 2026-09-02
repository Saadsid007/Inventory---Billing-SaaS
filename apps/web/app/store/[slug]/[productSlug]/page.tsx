import {
  findCatalogBusiness,
  findCatalogProduct,
  listCatalogProducts,
} from '@billwise/db';
import {
  productSlug,
  shortIdFromProductSlug,
} from '@billwise/shared';
import { Badge } from '@billwise/ui';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Flame,
  Info,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogViewTracker } from '../view-tracker';
import { ProductGallery } from './gallery';
import { InteractiveBuyBox } from './interactive-buy-box';

export const revalidate = 60;

async function load(slug: string, productSlugParam: string) {
  const business = await findCatalogBusiness(slug);
  if (!business) return null;
  const shortId = shortIdFromProductSlug(productSlugParam);
  if (!shortId) return null;
  const product = await findCatalogProduct(business.id, shortId);
  if (!product) return null;
  return { business, product };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const data = await load(slug, productSlug);
  if (!data) return { title: 'Product not found' };

  const { business, product } = data;
  const description =
    product.description?.slice(0, 160) ??
    `Buy ${product.name} from ${business.name}. Instant WhatsApp ordering and store pickup in ${business.city || 'Kanpur'}.`;
  const image = product.imageUrls?.[0];

  return {
    title: { absolute: `${product.name} | ${business.name}` },
    description,
    openGraph: {
      title: `${product.name} | ${business.name}`,
      description,
      type: 'website',
      ...(image && { images: [{ url: image }] }),
    },
    alternates: { canonical: `/store/${slug}/${productSlug}` },
  };
}

export default async function CatalogProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug: productSlugParam } = await params;
  const data = await load(slug, productSlugParam);
  if (!data) notFound();

  const { business, product } = data;

  // Load related products from the same category
  const relatedProducts = product.categoryId
    ? (await listCatalogProducts(business.id, { categoryId: product.categoryId, limit: 5 }))
        .filter((p) => p.id !== product.id)
        .slice(0, 4)
    : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.imageUrls?.length && { image: product.imageUrls }),
    ...(product.categoryName && { category: product.categoryName }),
    brand: { '@type': 'Brand', name: business.name },
    offers: {
      '@type': 'Offer',
      ...(business.showCatalogPrices && {
        price: product.salePrice,
        priceCurrency: 'INR',
      }),
      availability:
        product.stockStatus === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: business.name },
    },
  };

  const shownCustomFields = Object.entries(product.customFields ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );

  const address = [business.addressLine1, business.city].filter(Boolean).join(', ');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CatalogViewTracker slug={slug} productId={productSlugParam} />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumbs" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/store/${slug}`}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          <span>All Products</span>
        </Link>
        <ChevronRight className="size-3 opacity-40" />
        {product.categoryName && (
          <>
            <Link
              href={`/store/${slug}?category=${product.categoryId}`}
              className="hover:text-foreground transition-colors"
            >
              {product.categoryName}
            </Link>
            <ChevronRight className="size-3 opacity-40" />
          </>
        )}
        <span className="truncate max-w-[200px] text-foreground font-semibold">
          {product.name}
        </span>
      </nav>

      {/* Main E-Commerce Product Section */}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 pb-12">
        {/* Left Column: Product Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <ProductGallery images={product.imageUrls ?? []} name={product.name} />

          {/* Quick Features below gallery */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-card text-center gap-1 shadow-2xs">
              <ShieldCheck className="size-5 text-emerald-600" />
              <span className="text-[11px] font-bold text-foreground">100% Original</span>
              <span className="text-[10px] text-muted-foreground">Genuine Brand</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-card text-center gap-1 shadow-2xs">
              <Truck className="size-5 text-emerald-600" />
              <span className="text-[11px] font-bold text-foreground">Fast Delivery</span>
              <span className="text-[10px] text-muted-foreground">Kanpur Locals</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-card text-center gap-1 shadow-2xs">
              <Sparkles className="size-5 text-emerald-600" />
              <span className="text-[11px] font-bold text-foreground">Fresh Stock</span>
              <span className="text-[10px] text-muted-foreground">Recent Batch</span>
            </div>
          </div>
        </div>

        {/* Right Column: Buy Box & Product Info */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header Info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {product.categoryName && (
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                  {product.categoryName}
                </Badge>
              )}

              <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Star className="size-3 fill-amber-500 text-amber-500" />
                <span>4.9 Rating</span>
                <span className="opacity-40">•</span>
                <span className="font-normal text-[11px]">80+ monthly orders</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {product.name}
            </h1>

            {/* In-Stock Status Pill */}
            <div className="flex items-center gap-2 text-xs">
              {product.stockStatus === 'in_stock' && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  In Stock & Ready for Dispatch / Store Pickup
                </span>
              )}
              {product.stockStatus === 'low_stock' && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600">
                  <Flame className="size-3.5 text-amber-600" />
                  Fast Selling – Limited Stock Remaining
                </span>
              )}
              {product.stockStatus === 'out_of_stock' && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600">
                  Currently Out of Stock – Enquire for Next Restock
                </span>
              )}
            </div>
          </div>

          {/* Interactive Buy Box */}
          <InteractiveBuyBox
            businessName={business.name}
            businessPhone={business.phone}
            catalogWhatsapp={business.catalogWhatsapp}
            productName={product.name}
            salePrice={product.salePrice}
            showPrice={business.showCatalogPrices}
            stockStatus={product.stockStatus}
          />
        </div>
      </div>

      {/* Product Details & Specifications Tabs */}
      <div className="grid gap-8 lg:grid-cols-12 pt-6 border-t">
        {/* Description & Overview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border bg-card p-6 sm:p-7 space-y-4 shadow-xs">
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Info className="size-5 text-primary" />
              <span>Product Overview & Description</span>
            </h3>

            {product.description ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Authentic branded product packaged to seal freshness and quality.
                Directly distributed to {business.name} in Kanpur.
              </p>
            )}

            <div className="rounded-2xl bg-muted/40 p-4 border space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Why order this item from us?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Direct inventory from authorized brand supply channels</li>
                <li>Best local neighborhood price with zero platform delivery commissions</li>
                <li>Instant preparation: pick up in 15 minutes or get local doorstep delivery</li>
              </ul>
            </div>
          </div>

          {/* Specifications Table */}
          <div className="rounded-3xl border bg-card p-6 sm:p-7 space-y-4 shadow-xs">
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <span>Product Specifications</span>
            </h3>

            <dl className="divide-y text-xs sm:text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-muted-foreground font-medium">Product Name</dt>
                <dd className="font-semibold text-foreground text-right">{product.name}</dd>
              </div>
              {product.categoryName && (
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-muted-foreground font-medium">Category</dt>
                  <dd className="font-semibold text-foreground text-right">{product.categoryName}</dd>
                </div>
              )}
              {product.hsnCode && (
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-muted-foreground font-medium">HSN Code</dt>
                  <dd className="font-mono text-muted-foreground text-right">{product.hsnCode}</dd>
                </div>
              )}
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-muted-foreground font-medium">Food / Dietary Type</dt>
                <dd className="font-semibold text-emerald-600 dark:text-emerald-400 text-right flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>100% Vegetarian</span>
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-muted-foreground font-medium">Packaging Type</dt>
                <dd className="font-medium text-foreground text-right">Sealed Retail Container</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-muted-foreground font-medium">Origin</dt>
                <dd className="font-medium text-foreground text-right">India</dd>
              </div>

              {shownCustomFields.map(([key, value]) => (
                <div key={key} className="py-2.5 flex justify-between gap-4">
                  <dt className="text-muted-foreground font-medium capitalize">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="font-semibold text-foreground text-right">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Store Profile Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border bg-card p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Store className="size-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">{business.name}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Verified Neighborhood Store</span>
                </p>
              </div>
            </div>

            {address && (
              <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" /> Store Location:
                </p>
                <p className="pl-4 leading-relaxed">{address}</p>
              </div>
            )}

            <div className="border-t pt-3 space-y-2 text-xs">
              <p className="font-semibold text-foreground">Store Contacts & Hours:</p>
              <p className="text-muted-foreground">🕒 Mon - Sun: 8:00 AM – 10:00 PM</p>
              {business.phone && (
                <p className="text-muted-foreground">
                  📞 Phone: <a href={`tel:${business.phone}`} className="font-medium text-foreground hover:underline">{business.phone}</a>
                </p>
              )}
            </div>

            <div className="pt-2">
              <Link
                href={`/store/${slug}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border bg-muted/40 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <span>View Full Store Catalog</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section ("More from this Category") */}
      {relatedProducts.length > 0 && (
        <section aria-label="Related products" className="mt-16 pt-10 border-t space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                More in {product.categoryName || 'Our Catalog'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Popular items frequently ordered by neighborhood customers
              </p>
            </div>

            <Link
              href={`/store/${slug}?category=${product.categoryId}`}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>See all</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relatedProducts.map((rp) => {
              const cover = rp.imageUrls?.[0];
              return (
                <Link
                  key={rp.id}
                  href={`/store/${slug}/${productSlug(rp.name, rp.id)}`}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card shadow-2xs transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted/20">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={rp.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <p className="line-clamp-2 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {rp.name}
                    </p>
                    <p className="tabular text-sm font-bold text-foreground">
                      ₹{rp.salePrice}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

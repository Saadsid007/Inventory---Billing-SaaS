import { findCatalogBusiness, findCatalogProduct } from '@bahikhata/db';
import {
  enquiryMessage,
  shortIdFromProductSlug,
  whatsappEnquiryUrl,
} from '@bahikhata/shared';
import { StockBadge } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogViewTracker } from '../view-tracker';
import { ProductGallery } from './gallery';

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
    product.description?.slice(0, 160) ?? `${product.name} from ${business.name}.`;
  const image = product.imageUrls?.[0];

  return {
    // Absolute, not templated: the page belongs to the shop, not to Bahikhata.
    title: { absolute: `${product.name} — ${business.name}` },
    description,
    openGraph: {
      title: `${product.name} — ${business.name}`,
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
  const { slug, productSlug } = await params;
  const data = await load(slug, productSlug);
  if (!data) notFound();

  const { business, product } = data;

  const whatsapp = whatsappEnquiryUrl(
    business.catalogWhatsapp,
    enquiryMessage(business.name, product.name),
  );

  /**
   * Product markup. Price is only published when the shop has chosen to show
   * prices — a wholesaler who hides them on the page must not have them leak
   * out through structured data into a search result.
   */
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CatalogViewTracker slug={slug} productId={productSlug} />

      <nav className="mb-5 text-sm">
        <Link href={`/store/${slug}`} className="text-muted-foreground hover:text-foreground">
          ← All products
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.imageUrls ?? []} name={product.name} />

        <div className="space-y-4">
          <div className="space-y-2">
            {product.categoryName && (
              <p className="text-xs text-muted-foreground">{product.categoryName}</p>
            )}
            <h2 className="text-2xl font-semibold tracking-tight">{product.name}</h2>
            {business.showCatalogPrices ? (
              <p className="tabular text-2xl font-semibold">₹{product.salePrice}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contact the shop for pricing.
              </p>
            )}
            <StockBadge status={product.stockStatus} />
          </div>

          {product.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {product.description}
            </p>
          )}

          {shownCustomFields.length > 0 && (
            <dl className="space-y-1.5 rounded-lg border p-4 text-sm">
              {shownCustomFields.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-md bg-success px-5 text-sm font-medium text-success-foreground transition-opacity hover:opacity-90"
              >
                Enquire on WhatsApp
              </a>
            )}
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex h-10 items-center rounded-md border px-5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Call the shop
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

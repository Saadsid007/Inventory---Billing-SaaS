import { findCatalogBusiness } from '@bahikhata/db';
import { ThemeToggle } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Public catalog shell. Build spec Phase 1f.
 *
 * Deliberately outside the app shell: no sidebar, no session, no "Bahikhata"
 * branding above the fold. A customer scanning a QR code at a counter should
 * see the SHOP, not the software the shop happens to use.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await findCatalogBusiness(slug);
  if (!business) return { title: 'Catalog not found' };

  const where = [business.addressLine1, business.city].filter(Boolean).join(', ');
  const description = where
    ? `Browse products from ${business.name}, ${where}.`
    : `Browse products from ${business.name}.`;

  return {
    // Overrides the root layout's "%s · Bahikhata" template — this page belongs
    // to the shop, not to us.
    title: { absolute: `${business.name} — Product catalog` },
    description,
    openGraph: {
      title: `${business.name} — Product catalog`,
      description,
      type: 'website',
      ...(business.logoUrl && { images: [{ url: business.logoUrl }] }),
    },
    alternates: { canonical: `/store/${business.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function CatalogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await findCatalogBusiness(slug);
  // The query already requires catalog_enabled and a live business, so a
  // switched-off or expired shop 404s without the page having to remember.
  if (!business) notFound();

  const address = [business.addressLine1, business.city].filter(Boolean).join(', ');

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          {business.logoUrl && (
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border bg-card shadow-xs">
              <Image
                src={business.logoUrl}
                alt={business.name}
                fill
                sizes="56px"
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              <Link href={`/store/${business.slug}`}>{business.name}</Link>
            </h1>
            {address && <p className="truncate text-sm text-muted-foreground">{address}</p>}
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="tabular text-sm text-muted-foreground hover:text-foreground"
              >
                {business.phone}
              </a>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="mt-12 border-t bg-muted/30 py-8">
        <p className="text-center text-xs text-muted-foreground">
          {business.name} · Catalog powered by{' '}
          <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
            Bahikhata
          </Link>
        </p>
      </footer>
    </div>
  );
}

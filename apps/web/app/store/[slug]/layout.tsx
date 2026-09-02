import { findCatalogBusiness } from '@billwise/db';
import { enquiryMessage, whatsappEnquiryUrl } from '@billwise/shared';
import { Badge, ThemeToggle } from '@billwise/ui';
import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Public catalog shell. Build spec Phase 1f.
 *
 * Professional e-commerce storefront layout designed to showcase the shop,
 * build instant buyer trust, and drive high-converting WhatsApp orders.
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
    ? `Browse official products from ${business.name}, ${where}. Order directly on WhatsApp.`
    : `Browse official products from ${business.name}. Order directly on WhatsApp.`;

  return {
    title: { absolute: `${business.name} | Official Product Catalog & Online Store` },
    description,
    openGraph: {
      title: `${business.name} | Online Store`,
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
  if (!business) notFound();

  const address = [business.addressLine1, business.city].filter(Boolean).join(', ');
  const whatsapp = whatsappEnquiryUrl(
    business.catalogWhatsapp,
    enquiryMessage(business.name),
  );

  return (
    <div className="min-h-dvh flex flex-col bg-background selection:bg-primary/20">
      {/* Top Announcement Bar */}
      <aside aria-label="Store announcement" className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-700 dark:text-emerald-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 sm:px-4">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex size-2 relative">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>Live Catalog & Instant WhatsApp Orders</span>
            <span className="hidden opacity-50 sm:inline">•</span>
            <span className="hidden opacity-90 sm:inline">
              Counter Pickup & Local Delivery Available
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs opacity-90">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              <span>Open 8:00 AM – 10:00 PM</span>
            </span>
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="font-semibold underline-offset-4 hover:underline"
              >
                Call: {business.phone}
              </a>
            )}
          </div>
        </div>
      </aside>

      {/* Main Storefront Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md transition-shadow shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Brand & Store Identity */}
          <Link
            href={`/store/${business.slug}`}
            className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-95"
          >
            {business.logoUrl ? (
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border bg-card shadow-xs ring-1 ring-border sm:size-14">
                <Image
                  src={business.logoUrl}
                  alt={business.name}
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm sm:size-12">
                <Store className="size-5 sm:size-6" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-bold tracking-tight sm:text-xl text-foreground">
                  {business.name}
                </h1>
                <span title="Verified Local Merchant" className="shrink-0 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 fill-emerald-500/20" />
                </span>
              </div>

              {address && (
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground mt-0.5">
                  <MapPin className="size-3 shrink-0 opacity-70" />
                  <span className="truncate">{address}</span>
                </p>
              )}
            </div>
          </Link>

          {/* Actions & Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
                title="Call store directly"
              >
                <Phone className="size-3.5 text-muted-foreground" />
                <span>Call Store</span>
              </a>
            )}

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-98"
                title="Open WhatsApp chat with shopkeeper"
              >
                <MessageCircle className="size-4" />
                <span className="hidden xs:inline sm:inline">Chat on WhatsApp</span>
              </a>
            )}

            <div className="border-l pl-2 dark:border-border">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Modern E-Commerce Store Footer */}
      <footer className="mt-16 border-t bg-card/60 backdrop-blur-xs">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-8 border-b border-border/60">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <h2 className="text-sm font-bold tracking-tight">{business.name}</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your neighborhood store for fresh groceries, daily essentials, and trusted packaged brands.
              </p>
              {address && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>{address}</span>
                </p>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <h3 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                Why Buy From Us
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>100% Genuine Sealed Brands</span>
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="size-3.5 text-emerald-600" />
                  <span>Quick Pickup & Local Delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-3.5 text-emerald-600" />
                  <span>Instant WhatsApp Confirmation</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-xs">
              <h3 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                Payment & Delivery
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We accept <strong>Cash on Delivery/Pickup</strong> and all <strong>UPI Apps</strong> (Google Pay, PhonePe, Paytm).
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[10px]">UPI</Badge>
                <Badge variant="secondary" className="text-[10px]">GPay</Badge>
                <Badge variant="secondary" className="text-[10px]">PhonePe</Badge>
                <Badge variant="secondary" className="text-[10px]">Cash</Badge>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <h3 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                Direct Contact
              </h3>
              <p className="text-muted-foreground">
                Questions about bulk orders or item availability? Reach out directly:
              </p>
              {business.phone && (
                <p>
                  <a
                    href={`tel:${business.phone}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    📞 {business.phone}
                  </a>
                </p>
              )}
              {whatsapp && (
                <p>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>Send WhatsApp Message</span>
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {business.name}. All rights reserved.
            </p>
            <p className="flex items-center gap-1">
              <span>Online catalog powered by</span>
              <Link
                href="/"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Billwise SaaS
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

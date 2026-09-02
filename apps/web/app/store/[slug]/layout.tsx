import { findCatalogBusiness } from '@billwise/db';
import {
  DEFAULT_STOREFRONT_CONFIG,
  enquiryMessage,
  formatStoreAddress,
  resolveStoreWhatsapp,
  storefrontDisplayText,
  whatsappEnquiryUrl,
} from '@billwise/shared';
import { Badge } from '@billwise/ui';
import {
  Clock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogStoreHeader } from './store-header';

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
    title: { absolute: `${business.name} | Online Store` },
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

  const address = formatStoreAddress(business);
  const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...(business.storefrontConfig || {}) };
  const whatsappNumber = resolveStoreWhatsapp(business.phone, business.catalogWhatsapp);
  const whatsapp = whatsappEnquiryUrl(
    whatsappNumber,
    enquiryMessage(business.name),
  );

  return (
    <div className="min-h-dvh flex flex-col bg-background selection:bg-primary/20">
      {/* Announcement strip */}
      {cfg.showAnnouncement !== false && (
        <aside
          aria-label="Store announcement"
          className="border-b border-emerald-500/15 bg-emerald-500/8 px-3 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 sm:px-4 sm:py-2 sm:text-xs"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4">
            <p className="min-w-0 flex-1 truncate font-medium">
              {storefrontDisplayText(
                cfg.announcementText,
                'Live catalog · Order on WhatsApp',
              )}
            </p>
            <span className="hidden shrink-0 items-center gap-1 opacity-80 sm:inline-flex">
              <Clock className="size-3" />
              {cfg.storeTimings || '8 AM – 10 PM'}
            </span>
          </div>
        </aside>
      )}

      {/* Sticky header */}
      <CatalogStoreHeader
        slug={business.slug}
        businessName={business.name}
        logoUrl={business.logoUrl}
        address={address}
        phone={business.phone}
        whatsapp={whatsapp}
        badgeText={cfg.badgeText || 'Verified store'}
        storeTimings={cfg.storeTimings || '8 AM – 10 PM'}
        tagline={storefrontDisplayText(
          cfg.tagline,
          'Your neighborhood store for fresh groceries and daily essentials.',
        )}
        trustBadge1={cfg.trustBadge1Title || 'WhatsApp Orders'}
        trustBadge2={cfg.trustBadge2Title || '100% Genuine'}
        trustBadge3={cfg.trustBadge3Title || 'Pickup & Delivery'}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>

      <footer className="mt-8 border-t bg-card/50 sm:mt-12">
        <div className="mx-auto max-w-6xl px-3 py-8 sm:px-4 sm:py-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 pb-6 border-b border-border/60 sm:pb-8">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <h2 className="text-sm font-bold">{business.name}</h2>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {storefrontDisplayText(
                  cfg.tagline,
                  'Your neighborhood store for fresh groceries and daily essentials.',
                )}
              </p>
              {address && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                  {address}
                </p>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                Why buy from us
              </h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                  {cfg.trustBadge2Title || '100% Genuine'}
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="size-3.5 text-emerald-600 shrink-0" />
                  {cfg.trustBadge3Title || 'Pickup & Delivery'}
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-3.5 text-emerald-600 shrink-0" />
                  {cfg.trustBadge1Title || 'WhatsApp Orders'}
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                Payment
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {storefrontDisplayText(
                  cfg.deliveryNotice,
                  'Cash on pickup/delivery and all UPI apps accepted.',
                )}
              </p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                <Badge variant="secondary" className="text-[10px]">UPI</Badge>
                <Badge variant="secondary" className="text-[10px]">GPay</Badge>
                <Badge variant="secondary" className="text-[10px]">PhonePe</Badge>
                <Badge variant="secondary" className="text-[10px]">Cash</Badge>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                Contact
              </h3>
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="block font-semibold text-foreground hover:text-primary"
                >
                  📞 {business.phone}
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="block text-muted-foreground hover:text-primary truncate"
                  title="Send email"
                >
                  ✉️ {business.email}
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <MessageCircle className="size-3.5" />
                  Chat on WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 pt-5 text-[11px] text-muted-foreground sm:flex-row sm:pt-6">
            <p>© {new Date().getFullYear()} {business.name}</p>
            <p>
              Powered by{' '}
              <Link href="/" className="font-semibold text-primary hover:underline">
                Billwise
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

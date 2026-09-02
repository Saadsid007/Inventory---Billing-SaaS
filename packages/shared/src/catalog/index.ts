import { slugify } from '../schemas/primitives';

/**
 * Public catalog helpers. Build spec Phase 1f.
 *
 * Pure string work, shared by the server-rendered pages and the client
 * components, so a link built in one place cannot disagree with the parser in
 * the other.
 */

/** How many characters of the uuid go into a product URL. */
export const PRODUCT_SHORT_ID_LENGTH = 8;

/**
 * `/store/{shop}/{name-slug}-{shortid}`.
 *
 * The name is in the path for SEO; the short id makes it unambiguous without
 * putting a full uuid in front of a customer. Two products with the same name
 * still get different URLs.
 */
export function productSlug(name: string, productId: string): string {
  const short = productId.replace(/-/g, '').slice(0, PRODUCT_SHORT_ID_LENGTH);
  const base = slugify(name);
  return base ? `${base}-${short}` : short;
}

/** The short id back out of a product slug, or undefined if there isn't one. */
export function shortIdFromProductSlug(slug: string): string | undefined {
  const match = /([0-9a-f]{6,})$/i.exec(slug.trim());
  return match ? match[1]!.toLowerCase() : undefined;
}

export function catalogUrl(appUrl: string, shopSlug: string): string {
  return `${appUrl.replace(/\/$/, '')}/store/${shopSlug}`;
}

export function catalogProductUrl(
  appUrl: string,
  shopSlug: string,
  name: string,
  productId: string,
): string {
  return `${catalogUrl(appUrl, shopSlug)}/${productSlug(name, productId)}`;
}

/**
 * A wa.me deep link with the message already written.
 *
 * Deliberately NOT the WhatsApp Business API — that needs approval, a fee and a
 * template review. A deep link works from any phone today and costs nothing
 * (spec Phase 2 makes the same choice for invoice sharing).
 *
 * Returns undefined when the shop has not given a number, so callers render
 * nothing rather than a dead button.
 */
export function whatsappEnquiryUrl(
  phone: string | null | undefined,
  message: string,
): string | undefined {
  if (!phone) return undefined;
  // wa.me wants digits only, with a country code and no '+'.
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return undefined;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function enquiryMessage(shopName: string, productName?: string): string {
  return productName
    ? `Hi ${shopName}, I saw "${productName}" on your catalog. Is it available?`
    : `Hi ${shopName}, I saw your catalog. I would like to enquire about a product.`;
}

export const STOCK_STATUS_LABELS: Record<
  'in_stock' | 'low_stock' | 'out_of_stock',
  string
> = {
  in_stock: 'In stock',
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
};

/** Format a catalog stock quantity for display (drops trailing decimals when whole). */
export function formatCatalogStock(value: string | number): string {
  const raw = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(raw)) return '0';
  return raw % 1 === 0 ? raw.toFixed(0) : raw.toFixed(2);
}

export type CatalogStockDisplay = {
  formatted: string;
  unit: string;
  raw: number;
  isOut: boolean;
  isLow: boolean;
};

/** Normalise stock fields from a catalog product into display-ready values. */
export function catalogStockDisplay(
  currentStock: string,
  trackInventory: boolean,
  unitShortName: string | null,
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock',
): CatalogStockDisplay {
  const raw = Number.parseFloat(currentStock) || 0;
  const formatted = formatCatalogStock(raw);
  const unit = unitShortName ? ` ${unitShortName}` : '';
  const isOut = stockStatus === 'out_of_stock' || (trackInventory && raw <= 0);
  const isLow = !isOut && (stockStatus === 'low_stock' || (trackInventory && raw > 0 && raw <= 10));
  return { formatted, unit, raw, isOut, isLow };
}

/**
 * The app's own origin, without a trailing slash.
 *
 * `NEXT_PUBLIC_APP_URL` is typed by a human into a deployment dashboard, and
 * `https://example.com/` is just as natural to type as `https://example.com`.
 * Everything downstream concatenates a path onto it, so one stray slash turns
 * every sitemap entry, canonical link and catalog QR into a double-slashed URL.
 *
 * Normalising once here is cheaper than being careful at eight call sites.
 */
export function appOrigin(value: string | undefined): string {
  const raw = value?.trim() || 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/** Don't render raw URLs as customer-facing storefront copy. */
export function storefrontDisplayText(
  value: string | undefined | null,
  fallback: string,
): string {
  const text = value?.trim();
  if (!text) return fallback;
  if (/^https?:\/\//i.test(text) || text.includes('/store/')) return fallback;
  return text;
}

export type StorefrontTemplate = 'modern_kirana' | 'supermarket' | 'organic_fresh' | 'boutique';
export type StorefrontAccent = 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'violet';

export type StorefrontConfig = {
  template?: StorefrontTemplate;
  accentColor?: StorefrontAccent;
  tagline?: string;
  announcementText?: string;
  showAnnouncement?: boolean;
  storeTimings?: string;
  badgeText?: string;
  heroHeadline?: string;
  heroDescription?: string;
  heroBannerUrl?: string;
  showStockCount?: boolean;
  showLowStockUrgency?: boolean;
  orderButtonText?: string;
  trustBadge1Title?: string;
  trustBadge1Subtitle?: string;
  trustBadge2Title?: string;
  trustBadge2Subtitle?: string;
  trustBadge3Title?: string;
  trustBadge3Subtitle?: string;
  trustBadge4Title?: string;
  trustBadge4Subtitle?: string;
  customFooterText?: string;
  deliveryNotice?: string;
};

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  template: 'modern_kirana',
  accentColor: 'emerald',
  tagline: 'Your Trusted Neighborhood Store for Fresh Groceries & Daily Essentials',
  announcementText: '⚡ Live Catalog & Instant WhatsApp Orders • Counter Pickup & Local Delivery Available',
  showAnnouncement: true,
  storeTimings: 'Open 8:00 AM – 10:00 PM',
  badgeText: 'Verified Local Merchant',
  heroHeadline: 'Welcome to our official online store',
  heroDescription: 'Browse daily groceries, authentic dairy, packaged staples, and household essentials. Tap Order on WhatsApp on any item to place your order with direct store confirmation.',
  showStockCount: true,
  showLowStockUrgency: true,
  orderButtonText: 'Order on WhatsApp',
  trustBadge1Title: 'WhatsApp Order',
  trustBadge1Subtitle: '1-Tap order directly',
  trustBadge2Title: '100% Genuine',
  trustBadge2Subtitle: 'Company sealed packs',
  trustBadge3Title: 'Counter Pickup',
  trustBadge3Subtitle: 'Ready in 15 mins',
  trustBadge4Title: 'Cash & UPI',
  trustBadge4Subtitle: 'GPay, PhonePe & Cash',
  deliveryNotice: 'Local doorstep delivery & counter pickup available across city limits.',
};


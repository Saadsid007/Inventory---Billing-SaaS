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

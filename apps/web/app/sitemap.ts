import { listLiveCatalogSlugs } from '@billwise/db';
import type { MetadataRoute } from 'next';

const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';

/**
 * Sitemap.
 *
 * The marketing pages plus every shop whose catalog is switched on. A shop
 * being findable by name is the main reason the catalog exists, and a sitemap
 * is how a new shop gets crawled in days rather than weeks.
 *
 * Regenerated hourly rather than per request: catalogs do not appear often
 * enough to justify a database read on every crawler visit.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shops = await listLiveCatalogSlugs();

  return [
    { url: appUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${appUrl}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${appUrl}/register`, changeFrequency: 'monthly', priority: 0.5 },
    ...shops.map((shop) => ({
      url: `${appUrl}/store/${shop.slug}`,
      lastModified: shop.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}

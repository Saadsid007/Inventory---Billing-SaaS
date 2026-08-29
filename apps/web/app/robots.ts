import type { MetadataRoute } from 'next';

const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';

/**
 * Crawl rules.
 *
 * `/store/*` is deliberately open: a shop's catalog turning up in a search for
 * its own name is the whole point of that feature. Everything behind a login is
 * closed, and so are the API routes, which return JSON that would only ever
 * pollute an index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/store/'],
        disallow: ['/app/', '/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}

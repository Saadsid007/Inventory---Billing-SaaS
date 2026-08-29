'use client';

import * as React from 'react';

/**
 * Records a catalog view.
 *
 * Fires from the client, not during render, because the catalog page is
 * ISR-cached — counting server-side would record one view per revalidation
 * instead of one per visitor.
 *
 * Deliberately quiet: it never renders anything, never blocks paint, and
 * silently gives up on failure. Analytics must not be able to break a shop's
 * storefront.
 */
export function CatalogViewTracker({
  slug,
  productId,
}: {
  slug: string;
  productId?: string;
}) {
  React.useEffect(() => {
    // One view per page per browser session. Without this a customer flicking
    // between products and back inflates the count into meaninglessness.
    const key = `bk-view:${slug}:${productId ?? 'shop'}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private browsing can throw on sessionStorage. Counting twice is a far
      // smaller problem than not rendering.
    }

    const body = JSON.stringify({
      slug,
      ...(productId && { productId }),
      referrer: document.referrer || undefined,
    });

    // keepalive so the request survives the customer immediately tapping
    // through to a product.
    void fetch('/api/catalog/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [slug, productId]);

  return null;
}

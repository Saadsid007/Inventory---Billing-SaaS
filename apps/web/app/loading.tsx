import { LandingPageSkeleton } from '@billwise/ui';

/**
 * The landing page, and the last resort for anything without its own.
 *
 * Every other segment defines a fallback — both apps, the admin panel, the
 * store, the public receipt, the auth pages, `/pricing`. That is on purpose: a
 * root fallback is inherited by any descendant that lacks one, and this one is
 * shaped like `/`. In practice nothing else reaches it.
 *
 * It used to render the pricing page's outline, which is a centred heading and
 * plan cards. On `/` that drew a narrow stack of bars above a large blue slab
 * matching nothing on the real page, and the whole layout jumped when the page
 * arrived. Now it follows the landing page: hero, bill preview, feature grid.
 */
export default function Loading() {
  return <LandingPageSkeleton />;
}

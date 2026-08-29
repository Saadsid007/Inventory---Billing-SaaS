import { redirect } from 'next/navigation';

/**
 * Kept as a redirect, not deleted.
 *
 * `/app/subscribe` was the lock-out screen before billing had a page of its
 * own. Old links, old bookmarks and anything a shopkeeper was sent over
 * WhatsApp still point here, and a 404 on the page someone reaches when they
 * are trying to pay is the worst possible 404.
 */
export default function SubscribeRedirect() {
  redirect('/app/billing');
}

import { type NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/auth';

/**
 * Destroy a session that refers to something no longer in the database, and
 * send the person to the login screen.
 *
 * ## Why this route exists at all
 *
 * A JWT session lasts 30 days and carries a user id and a business id. If
 * either row disappears in the meantime — a user removed, a database restored
 * from an older backup, a test tenant deleted — the token stays cryptographically
 * valid while describing nothing.
 *
 * The app then had no way out of it:
 *
 *   proxy.ts    sees a valid session, so /register bounces to /app
 *   /app        cannot resolve the business, so it redirects to /register
 *   proxy.ts    bounces it back to /app …
 *
 * which is ERR_TOO_MANY_REDIRECTS, on every path, with no way to reach the
 * login page and no way to clear the cookie from the UI. Redirecting to
 * /login instead would not have helped: the proxy bounces a signed-in user
 * off that too. The only exit is to actually delete the session, and that
 * means writing a cookie.
 *
 * ## Why a route handler and not a redirect
 *
 * Server components cannot set cookies during render — Next.js forbids it, and
 * that is the whole reason `requireMembership` could only ever redirect. A
 * route handler can, so the guard sends people here and this clears the
 * session for real.
 *
 * GET rather than POST because it is reached by redirect, not by a form. That
 * is normally worth a second thought — a GET that changes state can be fired
 * by a prefetch or an image tag. Here the only thing it can do to a visitor is
 * log them out, which they can undo by logging back in, and it carries no
 * parameters an attacker could aim.
 */
export async function GET(request: NextRequest) {
  // `redirect: false` so signOut hands back a response instead of throwing the
  // framework redirect, letting us choose the destination and the message.
  await signOut({ redirect: false });

  const url = new URL('/login', request.nextUrl);
  url.searchParams.set('ended', '1');
  return NextResponse.redirect(url);
}

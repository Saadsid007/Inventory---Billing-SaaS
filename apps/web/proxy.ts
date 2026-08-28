import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig, isPublicPath } from './auth.config';

/**
 * Authentication gate only.
 *
 * Named `proxy.ts`: Next 16 deprecated the `middleware` file convention in
 * favour of `proxy`. Same semantics, same `config.matcher`.
 *
 * Runs on the edge runtime, so it deliberately imports `auth.config.ts` — the
 * half with no providers, no bcrypt and no database — rather than `auth.ts`.
 * The single question it answers is "is there a session?".
 *
 * Whether a business is *approved* is decided in `lib/auth/require-business.ts`
 * with a live read, so that a super admin's approval takes effect on the next
 * request instead of whenever the JWT happens to refresh.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user);

  if (!signedIn && !isPublicPath(pathname)) {
    const url = new URL('/login', req.nextUrl);
    // Preserve where they were headed so login can send them back.
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // A signed-in user has no business on the login or register screens.
  if (signedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/app', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /**
     * Everything except Next internals, the auth endpoints and static files.
     * `/store/*` is matched but treated as public, so a catalog visitor is
     * never redirected to a login screen.
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml)$).*)',
  ],
};

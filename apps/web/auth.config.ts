import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe half of the auth setup.
 *
 * `middleware.ts` runs on the edge runtime, which has no TCP sockets and so no
 * database. This file therefore contains no providers, no bcrypt and no
 * repository imports — only the routing rules that can be decided from a JWT.
 *
 * The full configuration, with the credentials provider, lives in ./auth.ts.
 */

/**
 * Routes reachable without a session. Everything else requires one.
 *
 * `/api/catalog` is here because the catalog's view counter is called by
 * anonymous visitors — without it the proxy 307s them to /login and the
 * counter silently records nothing. The handler does its own validation and
 * resolves the business from the slug, so being public costs nothing.
 */
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/store',
  '/pricing',
  '/api/catalog',
  // The admin entry point, and only that path — `/admin` itself stays behind
  // the session check and then behind requireSuperAdmin().
  '/admin/login',
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    // JWT rather than a database session: it keeps middleware free of database
    // access, which is what makes the edge runtime viable at all.
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Populated in ./auth.ts. Present here so the type is satisfied.
  providers: [],
} satisfies NextAuthConfig;

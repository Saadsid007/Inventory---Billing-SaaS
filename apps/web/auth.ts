import { findUserForLogin, resolveMembership } from '@billwise/db';
import { loginSchema } from '@billwise/shared';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { DUMMY_PASSWORD_HASH, verifyPassword } from './lib/auth/password';

/**
 * Full auth configuration — Node runtime only. Imports the database and bcrypt,
 * so it must never be pulled into middleware. See ./auth.config.ts.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await findUserForLogin(parsed.data.email);

        // Always run bcrypt, even for an unknown email. Returning early here
        // would make an unknown address answer in ~1ms and a known one in
        // ~250ms — a clean oracle for enumerating who has an account.
        const ok = await verifyPassword(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );

        if (!user || !ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Sign-in: stamp identity and resolve which business this session acts for.
      if (user?.id) {
        token.userId = user.id;
        token.isSuperAdmin = user.isSuperAdmin;
        const membership = await resolveMembership(user.id);
        token.businessId = membership?.businessId;
        token.role = membership?.role;
      }

      // Business switcher. The requested id is re-checked against membership
      // rows rather than trusted, so a crafted update() call cannot move a
      // session into someone else's business.
      if (trigger === 'update' && token.userId) {
        const requested = (session as { businessId?: unknown } | undefined)?.businessId;
        const membership = await resolveMembership(
          token.userId,
          typeof requested === 'string' ? requested : undefined,
        );
        token.businessId = membership?.businessId;
        token.role = membership?.role;
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.userId;
      session.user.isSuperAdmin = token.isSuperAdmin;
      session.businessId = token.businessId;
      session.role = token.role;
      return session;
    },
  },
});

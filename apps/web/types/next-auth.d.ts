import type { MemberRole } from '@bahikhata/shared';
import type { DefaultSession } from 'next-auth';

/**
 * What a Bahikhata session carries.
 *
 * Note what is deliberately ABSENT: the business's approval status. Status
 * changes — a super admin approving or suspending a business — must take effect
 * on the next request, not whenever a 30-day JWT happens to refresh. It is read
 * live in `requireBusiness()` instead. See lib/auth/require-business.ts.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isSuperAdmin: boolean;
    } & DefaultSession['user'];
    /** The business this session is currently acting for. Undefined only mid-signup. */
    businessId?: string;
    role?: MemberRole;
  }

  interface User {
    isSuperAdmin: boolean;
  }
}

/**
 * Augments `@auth/core/jwt`, not `next-auth/jwt`.
 *
 * `next-auth/jwt` is a bare `export * from "@auth/core/jwt"` — it declares no
 * `JWT` interface of its own, so augmenting it creates a second, unrelated
 * interface instead of merging into the one the callbacks actually use. That
 * silently leaves `token` typed as `unknown`. `@auth/core` is therefore a
 * direct devDependency purely so this augmentation has something to attach to.
 */
declare module '@auth/core/jwt' {
  interface JWT {
    userId: string;
    isSuperAdmin: boolean;
    businessId?: string;
    role?: MemberRole;
  }
}

export {};

import { type BusinessStatus, type TenantCtx, slugify, trialEndsAt } from '@billwise/shared';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { seedBusinessMasters } from './masters';
import { businessMembers, businessSettings, businesses, users } from '../schema/index';

/**
 * Pre-tenant repository.
 *
 * Spec §2.5 hard rule 3 says every repository function takes `TenantCtx` first.
 * These functions are the deliberate exception, and the exception is narrow:
 * they are the code that *establishes* a tenant context. A login cannot be
 * scoped by the business it is about to discover.
 *
 * Because of that, this file is the highest-risk surface in the codebase for a
 * tenancy leak. Nothing here may grow a "fetch this business's data" function —
 * once a context exists, callers move to a scoped repository. Everything below
 * either looks up a user by credentials, creates the very first business, or
 * resolves which business a session is allowed to act for.
 */

/** Postgres unique-violation. Used to turn races into retries, not 500s. */
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = error as { code?: string; constraint_name?: string } | null;
  if (e?.code !== UNIQUE_VIOLATION) return false;
  return constraint ? e.constraint_name === constraint : true;
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isSuperAdmin: boolean;
};

/**
 * Look up a user for credential verification.
 *
 * Returns the hash so the caller can compare it. The caller must never let this
 * value leave the server, and must run the bcrypt comparison even when this
 * returns undefined — otherwise response timing tells an attacker which email
 * addresses are registered.
 */
export async function findUserForLogin(email: string): Promise<AuthUser | undefined> {
  const [row] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return row;
}

export async function findUserById(userId: string) {
  const [row] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

export async function emailExists(email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return row !== undefined;
}

export type RegisterOwnerInput = {
  name: string;
  email: string;
  phone?: string | undefined;
  passwordHash: string;
  businessName: string;
  stateCode: string;
};

export type RegisterOwnerResult = {
  userId: string;
  businessId: string;
  slug: string;
  trialEndsAt: Date;
};

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('That email is already registered.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

/**
 * Signup. Creates the user, their business, the owner membership and default
 * settings — all in one transaction, because a user with no business would be
 * stranded on a screen with nothing to do and no way to retry.
 *
 * The business starts on a 10-day trial with immediate full access. There is
 * no approval step: someone who signs up at 9pm is billing customers at 9:01.
 */
export async function registerOwner(input: RegisterOwnerInput): Promise<RegisterOwnerResult> {
  const email = input.email.trim().toLowerCase();

  return getDb().transaction(async (tx) => {
    let userId: string;
    try {
      const [user] = await tx
        .insert(users)
        .values({
          email,
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          passwordHash: input.passwordHash,
        })
        .returning({ id: users.id });
      userId = user!.id;
    } catch (error) {
      if (isUniqueViolation(error, 'users_email_unique')) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }

    // The slug is public and permanent-ish (/store/[slug]), and two shops called
    // "Sharma Traders" is not a rare case. Retry with a numeric suffix rather
    // than pre-checking, so two concurrent signups cannot both see it as free.
    const base = slugify(input.businessName) || 'shop';
    let businessId: string | undefined;
    let slug = base;
    const trialEnd = trialEndsAt();

    for (let attempt = 0; attempt < 12; attempt++) {
      slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      try {
        const [business] = await tx
          .insert(businesses)
          .values({
            ownerUserId: userId,
            name: input.businessName.trim(),
            slug,
            stateCode: input.stateCode,
            status: 'trial',
            trialEndsAt: trialEnd,
          })
          .returning({ id: businesses.id });
        businessId = business!.id;
        break;
      } catch (error) {
        if (isUniqueViolation(error, 'businesses_slug_unique')) continue;
        throw error;
      }
    }

    if (!businessId) {
      // Twelve collisions on one name means something is wrong with slugify,
      // not with this shop's name. Fail loudly rather than looping forever.
      throw new Error(`Could not allocate a unique catalog slug for "${base}".`);
    }

    await tx.insert(businessMembers).values({ businessId, userId, role: 'owner' });
    await tx.insert(businessSettings).values({ businessId });

    // Give them a usable set of units immediately, so the first product can be
    // added without a detour through settings.
    await seedBusinessMasters(tx, businessId);

    return { userId, businessId, slug, trialEndsAt: trialEnd };
  });
}

export type Membership = {
  businessId: string;
  businessName: string;
  slug: string;
  status: BusinessStatus;
  role: TenantCtx['role'];
};

/** Every business this user may act for. Backs the business switcher. */
export async function listMemberships(userId: string): Promise<Membership[]> {
  return getDb()
    .select({
      businessId: businesses.id,
      businessName: businesses.name,
      slug: businesses.slug,
      status: businesses.status,
      role: businessMembers.role,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(eq(businessMembers.userId, userId))
    .orderBy(businesses.createdAt);
}

/**
 * Resolve which business a session acts for.
 *
 * `preferredBusinessId` may come from a cookie or a URL, so it is treated as a
 * *request*, not an instruction: it is only honoured if a membership row proves
 * this user belongs to it. That check is the reason `businessId` can be trusted
 * everywhere downstream.
 */
export async function resolveMembership(
  userId: string,
  preferredBusinessId?: string,
): Promise<Membership | undefined> {
  if (preferredBusinessId) {
    const [row] = await getDb()
      .select({
        businessId: businesses.id,
        businessName: businesses.name,
        slug: businesses.slug,
        status: businesses.status,
        role: businessMembers.role,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.businessId, preferredBusinessId),
        ),
      )
      .limit(1);
    if (row) return row;
    // Fall through: a stale or forged id resolves to the user's own default
    // rather than erroring, so a switched-away business can't lock them out.
  }

  const [first] = await listMemberships(userId);
  return first;
}

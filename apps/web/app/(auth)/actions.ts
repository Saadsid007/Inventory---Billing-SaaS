'use server';

import { EmailAlreadyRegisteredError, registerOwner } from '@billwise/db';
import { loginSchema, registerSchema } from '@billwise/shared';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { hashPassword } from '@/lib/auth/password';

/**
 * Auth server actions.
 *
 * Spec §2.5 hard rule 4 applies here as much as to route handlers: validate
 * with a schema from @billwise/shared, call into db/core, format a response.
 * No business rules are decided in this file.
 */

export type ActionState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    // First message per field only — a stack of three errors under one input is
    // noise, not help.
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Only relative, single-slash paths. Blocks `//evil.com` open redirects. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/app';
  return next;
}

export async function loginAction(
  raw: { email: string; password: string; next?: string },
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeNext(raw.next),
    });
  } catch (error) {
    // A successful signIn throws a redirect, which MUST propagate. Only real
    // auth failures are converted into a message.
    if (error instanceof AuthError) {
      return { formError: 'That email or password is not correct.' };
    }
    throw error;
  }

  return {};
}

export async function registerAction(raw: unknown): Promise<ActionState> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const input = parsed.data;

  try {
    await registerOwner({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      businessName: input.businessName,
      stateCode: input.stateCode,
      businessType: input.businessType,
    });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return { fieldErrors: { email: 'That email is already registered.' } };
    }
    console.error('registration failed', error);
    return { formError: 'Could not create your account. Please try again in a moment.' };
  }

  // Trial starts immediately, so drop them straight into the app. Making
  // someone read a confirmation screen before their first bill is friction for
  // no reason.
  try {
    await signIn('credentials', {
      email: input.email,
      password: input.password,
      redirectTo: '/app',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The account exists; only the auto-login failed. Do not report this as a
      // signup failure or they will try to register again and hit "email taken".
      return { formError: 'Your account was created. Please log in.' };
    }
    throw error;
  }

  return {};
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}

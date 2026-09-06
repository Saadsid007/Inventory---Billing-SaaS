/**
 * Bootstrap the first super-admin account.
 *
 * Run with:
 *   ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD='…' pnpm seed:admin
 *
 * ## Why this exists
 *
 * The admin panel can only *promote* an existing account, and it can only be
 * reached by someone who is already an admin. On a fresh database that is a
 * closed loop, so the very first admin has to be made from outside the app.
 *
 * ## Why it refuses to run without being told what to create
 *
 * This script previously hardcoded admin@gmail.com / admin@123 and created the
 * account with no guard at all. Because production and local development share
 * one database, running it locally put a super-admin with a four-character
 * password on the live site — where /admin/login is, correctly, public.
 *
 * So: credentials come from the environment, never from this file; the password
 * has to be a real one; and the whole thing refuses to run against production.
 * A bootstrap tool that can hand out live admin access by accident is worse
 * than having no bootstrap tool.
 */

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '../../.env', quiet: true });

import { ensureSuperAdmin } from '@billwise/db';
import { hash } from 'bcryptjs';

/** Obvious placeholders. Refused outright — these are the ones people try. */
const BANNED_PASSWORDS = new Set([
  'admin@123',
  'admin123',
  'password',
  'admin',
  '12345678',
  'changeme',
]);

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function main() {
  if (process.env['NODE_ENV'] === 'production') {
    fail(
      'Refusing to run with NODE_ENV=production.\n' +
        'Promote an existing account from /admin/admins instead.',
    );
  }

  const email = process.env['ADMIN_SEED_EMAIL']?.trim().toLowerCase();
  const password = process.env['ADMIN_SEED_PASSWORD'];
  const name = process.env['ADMIN_SEED_NAME']?.trim() || 'Super Admin';

  if (!email || !password) {
    fail(
      'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must both be set.\n\n' +
        "  ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD='…' pnpm seed:admin\n\n" +
        'Nothing is hardcoded here on purpose: this grants full admin access, and\n' +
        'this repo shares one database between local development and production.',
    );
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`Not a valid email: ${email}`);

  if (password.length < 12 || BANNED_PASSWORDS.has(password.toLowerCase())) {
    fail(
      'Pick a real password: at least 12 characters, and not one of the obvious ones.\n' +
        'This account can see and suspend every business on the system.',
    );
  }

  // A last look before writing, because the database this points at may well be
  // the live one — nothing in the connection string says which.
  const host = (process.env['DATABASE_URL'] ?? '').match(/@([^/:]+)/)?.[1] ?? 'unknown host';
  console.warn(`Granting super-admin to ${email} on ${host}`);

  const result = await ensureSuperAdmin({
    email,
    name,
    passwordHash: await hash(password, 12),
  });

  // Deliberately never echoes the password back. A credential printed to a
  // terminal ends up in scrollback, in a screenshot, and in a chat log.
  console.warn(
    result.created
      ? `Created super admin ${result.email}.`
      : `${result.email} already existed — password reset and admin flag kept on.`,
  );
  console.warn('Log in at /admin/login');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nAdmin seed failed:', error);
    process.exit(1);
  });

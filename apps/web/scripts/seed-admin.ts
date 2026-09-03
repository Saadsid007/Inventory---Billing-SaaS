/**
 * Bootstrap the first super-admin account.
 *
 * Run with:  pnpm --filter @billwise/web seed:admin
 *
 * Creates (or updates) admin@gmail.com with is_super_admin = true so /admin
 * is reachable before any shopkeeper has been promoted from the panel.
 */

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '../../.env', quiet: true });

import { ensureSuperAdmin } from '@billwise/db';
import { hash } from 'bcryptjs';

const EMAIL = 'admin@gmail.com';
const PASSWORD = 'admin@123';
const NAME = 'Super Admin';

async function main() {
  const passwordHash = await hash(PASSWORD, 12);
  const result = await ensureSuperAdmin({
    email: EMAIL,
    name: NAME,
    passwordHash,
  });

  console.warn(result.created ? `Created super admin ${result.email}` : `Updated super admin ${result.email}`);
  console.warn('\nLog in at:');
  console.warn('  http://localhost:3000/admin/login');
  console.warn('\nCredentials:');
  console.warn(`  ${EMAIL}`);
  console.warn(`  ${PASSWORD}`);
  console.warn('\nAfter login you land on /admin (business list). Admins list: /admin/admins');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nAdmin seed failed:', error);
    process.exit(1);
  });

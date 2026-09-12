import { config as loadEnv } from 'dotenv';

loadEnv({ path: '../../.env', quiet: true });

import { findUserForLogin, updateUserPassword } from '@billwise/db';
import { hash, compare } from 'bcryptjs';

const TARGET_EMAILS = [
  'rakesh@demo.billwise.in',
  'nitin@demo.billwise.in',
  'anjali@demo.billwise.in',
];
const NEW_PASSWORD = 'Billwise@2026';

async function main() {
  const newHash = await hash(NEW_PASSWORD, 12);

  for (const email of TARGET_EMAILS) {
    console.log(`Checking account: ${email}...`);
    const user = await findUserForLogin(email);

    if (!user) {
      console.log(`User ${email} NOT FOUND in database.`);
      continue;
    }

    console.log(`Found user:`, {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
    });

    const result = await updateUserPassword(email, newHash);
    console.log(`Password update result for ${email}:`, result);

    const updatedUser = await findUserForLogin(email);
    if (updatedUser) {
      const isMatch = await compare(NEW_PASSWORD, updatedUser.passwordHash);
      console.log(`Verification: password match with "${NEW_PASSWORD}":`, isMatch);
    }
  }
}


main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

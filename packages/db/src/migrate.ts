import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

loadEnv({ path: '../../.env', quiet: true });

/**
 * Applies pending migrations from ./drizzle.
 *
 * Uses a dedicated single connection over the DIRECT (non-pooled) URL: DDL
 * through PgBouncer's transaction pooling is unreliable.
 */
async function main() {
  const url = process.env['DATABASE_URL_UNPOOLED'] || process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env at the repo root and fill it in.',
    );
  }

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
    console.warn('Migrations applied.');
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

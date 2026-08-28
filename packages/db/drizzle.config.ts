import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Env lives in one file at the repo root (spec §2.5). drizzle-kit runs with
// this package as cwd, so point it two levels up.
loadEnv({ path: '../../.env', quiet: true });

const url = process.env['DATABASE_URL_UNPOOLED'] || process.env['DATABASE_URL'];

if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env at the repo root and fill it in.',
  );
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Migrations must run over a direct connection, not the PgBouncer pooler —
  // DDL and advisory locks behave badly through transaction pooling.
  dbCredentials: { url },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});

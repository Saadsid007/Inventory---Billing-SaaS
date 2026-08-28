import { SEED_TAX_RATES } from '@bahikhata/shared';
import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

loadEnv({ path: '../../.env', quiet: true });

/**
 * Global reference data. Idempotent — safe to run after every migration.
 *
 * GST slabs are seeded as GLOBAL rows (`business_id IS NULL`) rather than
 * copied into every tenant. When the government changes the slabs again — as
 * it did on 22 Sep 2025, removing 12% and 28% — the fix is one row per rate,
 * not one row per rate per business.
 *
 * Businesses that need something bespoke add their own rows with their
 * `business_id` set; `listTaxRates` returns both.
 */
async function main() {
  const url = process.env['DATABASE_URL_UNPOOLED'] || process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set.');

  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const db = drizzle(client);

  try {
    let inserted = 0;
    for (const rate of SEED_TAX_RATES) {
      const result = await db.execute(sql`
        insert into tax_rates (business_id, name, rate, cess_rate, effective_from, is_active)
        select null, ${rate.name}, ${rate.rate}::numeric, ${rate.cessRate}::numeric,
               ${rate.effectiveFrom}::date, true
        where not exists (
          select 1 from tax_rates
          where business_id is null
            and rate = ${rate.rate}::numeric
            and cess_rate = ${rate.cessRate}::numeric
            and effective_from = ${rate.effectiveFrom}::date
        )
      `);
      if (result.count > 0) inserted++;
    }
    console.warn(`Seed complete. ${inserted} new global tax rate(s), ${SEED_TAX_RATES.length} total defined.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

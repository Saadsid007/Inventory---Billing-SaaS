import { serverEnv } from '@bahikhata/shared/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

/**
 * The database connection.
 *
 * INTERNAL TO THIS PACKAGE. Deliberately absent from package.json "exports", so
 * nothing in apps/ can import it even by accident — build spec §3:
 *
 *   "No file outside packages/db/src/repositories/ imports the raw db client."
 *
 * Apps import repository functions, which take TenantCtx and scope every query
 * by business_id.
 */

let sql: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

function connect() {
  const env = serverEnv();

  return postgres(env.DATABASE_URL, {
    // Neon's pooled endpoint runs PgBouncer in transaction mode, which cannot
    // hold server-side prepared statements across a pooled connection.
    prepare: false,
    max: env.NODE_ENV === 'production' ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 15,
    // Do not add a numeric type parser here. postgres.js returns `numeric` as a
    // string by default, and it has to stay a string until it reaches Decimal
    // in packages/core. Parsing it to a float is how invoices go a paisa wrong.
  });
}

/**
 * Lazily-created singleton. Next.js dev reloads modules on every edit, so the
 * connection is stashed on globalThis to avoid exhausting Neon's connection
 * limit after twenty saves.
 */
const globalForDb = globalThis as unknown as {
  __bahikhataSql?: ReturnType<typeof postgres>;
};

export function getDb() {
  if (!database) {
    sql = globalForDb.__bahikhataSql ?? connect();
    if (process.env['NODE_ENV'] !== 'production') {
      globalForDb.__bahikhataSql = sql;
    }
    database = drizzle(sql, { schema, casing: 'snake_case' });
  }
  return database;
}

export type Database = ReturnType<typeof getDb>;

/** A transaction handle, as passed to `getDb().transaction(tx => ...)`. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Either the pool or an open transaction. Repository functions accept both. */
export type Executor = Database | Transaction;

/** Close the pool. For scripts and tests only — never call this from a request. */
export async function closeDb(): Promise<void> {
  await sql?.end({ timeout: 5 });
  sql = undefined;
  database = undefined;
  delete globalForDb.__bahikhataSql;
}

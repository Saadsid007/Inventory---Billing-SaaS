/**
 * Drizzle schema. Build spec §4.
 *
 * One file per domain — users.ts, businesses.ts, products.ts, invoices.ts …
 * Landed at build-order step 3, after Phase 0b establishes the tenancy tables.
 *
 * Non-negotiables when these files get written (spec §3):
 *   1. every business-owned table carries `business_id`, indexed
 *   2. money is numeric(12,2), quantity is numeric(12,3)
 *   3. invoice lines store snapshots, not just a product_id
 *   4. tax rates live in a table with effective_from — never hardcoded
 */

export {};

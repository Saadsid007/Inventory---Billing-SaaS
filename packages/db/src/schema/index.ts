/**
 * Drizzle schema. Build spec §4. One file per domain.
 *
 * Non-negotiables (spec §3), to check against on every new table:
 *   1. every business-owned table carries `business_id`, indexed
 *   2. money is numeric(12,2), quantity is numeric(12,3)
 *   3. invoice lines store snapshots, not just a product_id
 *   4. tax rates live in a table with effective_from — never hardcoded
 *
 * Column names are written camelCase and mapped to snake_case by Drizzle's
 * `casing: 'snake_case'` setting.
 */

export * from './users';
export * from './businesses';
export * from './masters';
export * from './products';
export * from './parties';
export * from './invoices';
export * from './billing';
export * from './returns';
export * from './applications';
export * from './plans';

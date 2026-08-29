import { timestamp } from 'drizzle-orm/pg-core';

/**
 * Helpers shared by every schema file.
 *
 * Column names are written in camelCase and mapped to snake_case by Drizzle's
 * `casing: 'snake_case'` setting (see client.ts and drizzle.config.ts), so the
 * TypeScript surface reads naturally while the database keeps SQL conventions.
 */

/**
 * pgEnum wants a mutable non-empty tuple, but the enum arrays in
 * @billwise/shared are `readonly` on purpose. This is the one place that
 * conversion happens, so the shared constants stay the single source of truth
 * for both the TypeScript union and the Postgres type.
 */
export function enumValues<T extends string>(values: readonly T[]): [T, ...T[]] {
  return values as unknown as [T, ...T[]];
}

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

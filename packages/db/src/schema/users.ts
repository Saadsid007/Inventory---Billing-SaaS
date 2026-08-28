import { relations } from 'drizzle-orm';
import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt } from './_shared';
import { businessMembers, businesses } from './businesses';

/**
 * A person. Build spec §4.
 *
 * Not business-scoped — a user exists before any business does, and later
 * phases let one user belong to several businesses via `business_members`.
 * That is exactly why `business_id` must come from the session's *active*
 * business rather than from the user record.
 */
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  phone: text(),
  name: text().notNull(),
  /** bcrypt. Never selected into anything that leaves the server. */
  passwordHash: text().notNull(),
  /**
   * Grants access to /admin. Super admins see business metadata and aggregate
   * counts only — never a tenant's transaction data (spec §6).
   */
  isSuperAdmin: boolean().notNull().default(false),
  createdAt: createdAt(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(businessMembers),
  ownedBusinesses: many(businesses),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

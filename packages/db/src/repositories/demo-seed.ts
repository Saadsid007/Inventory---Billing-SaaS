import type { TenantCtx } from '@billwise/shared';
import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  businessMembers,
  businessSettings,
  businesses,
  catalogViews,
  categories,
  customFieldDefs,
  invoiceAudit,
  invoiceLines,
  invoiceSeries,
  invoices,
  parties,
  payments,
  products,
  salesReturnLines,
  serviceApplications,
  salesReturns,
  stockMovements,
  subscriptionPayments,
  units,
  users,
} from '../schema/index';

/**
 * Demo data. Used only by `apps/web/scripts/seed-demo.ts`.
 *
 * ## Why this exists rather than the script calling the ordinary repositories
 *
 * The ordinary path — `createDraft` then `issueInvoice` — opens two
 * transactions and runs a dozen round trips per invoice. Against a Neon
 * database on the other side of the country that is most of a second each, and
 * a demo tenant with three months of trade is well over a thousand invoices.
 * The write path here takes the same rows and inserts them in chunks, so the
 * whole job is minutes rather than hours.
 *
 * What it does NOT do is invent its own arithmetic. Every rupee, every tax
 * split and every invoice number is computed by the same pure functions in
 * `@billwise/core` that the real application uses; this file only stores what
 * they produced. If the numbers here could drift from the ones a real invoice
 * gets, the demo would be worse than no demo.
 *
 * ## Why it lives here
 *
 * Spec §2.5: nothing outside `repositories/` may import the client. Bulk
 * seeding still needs a connection, so it is a repository — one that happens to
 * take rows already built instead of building them.
 */

/**
 * The one guard that makes `wipeDemoBusinesses` safe to run.
 *
 * Demo accounts must live on this domain, and nothing else can be deleted by
 * this file. A seed script that could take an argument and remove a real shop's
 * three months of billing is not a tool anybody should have lying in a repo.
 */
export const DEMO_EMAIL_DOMAIN = '@demo.billwise.in';

export function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(DEMO_EMAIL_DOMAIN);
}

/** Postgres caps a statement at 65535 bound parameters. Stay well under it. */
const CHUNK = 400;

async function insertChunked<T>(
  rows: readonly T[],
  write: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await write(rows.slice(i, i + CHUNK));
  }
}

// ------------------------------------------------------------ wiping ------

/**
 * Remove demo accounts and everything they own, so the seed can be re-run.
 *
 * Deletion is explicit and ordered rather than left to `on delete cascade`:
 * `sales_returns`, `subscription_payments` and `invoice_audit` do not cascade
 * (the first two on purpose — a payment record that vanishes with its business
 * is no use in a dispute — and the audit table has no foreign keys at all, by
 * design). Relying on cascade here would leave orphans behind on every run.
 */
export async function wipeDemoBusinesses(emails: readonly string[]): Promise<number> {
  const clean = emails.map((e) => e.trim().toLowerCase());
  const unsafe = clean.filter((e) => !isDemoEmail(e));
  if (unsafe.length > 0) {
    throw new Error(
      `Refusing to delete non-demo accounts: ${unsafe.join(', ')}. ` +
        `Only addresses ending in ${DEMO_EMAIL_DOMAIN} may be wiped.`,
    );
  }
  if (clean.length === 0) return 0;

  const db = getDb();

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, clean));
  if (userRows.length === 0) return 0;
  const userIds = userRows.map((u) => u.id);

  const bizRows = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(inArray(businesses.ownerUserId, userIds));
  const bizIds = bizRows.map((b) => b.id);

  await db.transaction(async (tx) => {
    if (bizIds.length > 0) {
      await tx.delete(serviceApplications).where(inArray(serviceApplications.businessId, bizIds));
      await tx.delete(salesReturnLines).where(inArray(salesReturnLines.businessId, bizIds));
      await tx.delete(salesReturns).where(inArray(salesReturns.businessId, bizIds));
      await tx.delete(invoiceAudit).where(inArray(invoiceAudit.businessId, bizIds));
      await tx.delete(subscriptionPayments).where(inArray(subscriptionPayments.businessId, bizIds));
      await tx.delete(payments).where(inArray(payments.businessId, bizIds));
      await tx.delete(catalogViews).where(inArray(catalogViews.businessId, bizIds));
      await tx.delete(invoiceLines).where(inArray(invoiceLines.businessId, bizIds));
      await tx.delete(invoices).where(inArray(invoices.businessId, bizIds));
      await tx.delete(invoiceSeries).where(inArray(invoiceSeries.businessId, bizIds));
      await tx.delete(stockMovements).where(inArray(stockMovements.businessId, bizIds));
      await tx.delete(products).where(inArray(products.businessId, bizIds));
      await tx.delete(parties).where(inArray(parties.businessId, bizIds));
      await tx.delete(customFieldDefs).where(inArray(customFieldDefs.businessId, bizIds));
      await tx.delete(categories).where(inArray(categories.businessId, bizIds));
      await tx.delete(units).where(inArray(units.businessId, bizIds));
      await tx.delete(businessSettings).where(inArray(businessSettings.businessId, bizIds));
      await tx.delete(businessMembers).where(inArray(businessMembers.businessId, bizIds));
      await tx.delete(businesses).where(inArray(businesses.id, bizIds));
    }
    // Any membership this user held in someone else's business would be a bug
    // in the seed, but clear it anyway so the user row can go.
    await tx.delete(businessMembers).where(inArray(businessMembers.userId, userIds));
    await tx.delete(users).where(inArray(users.id, userIds));
  });

  return bizIds.length;
}

// ----------------------------------------------------------- writing ------

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert'];

/**
 * A tenant's whole trading history, already computed.
 *
 * `businessId` is absent from every row on purpose: it is stamped on from
 * `ctx` below, so a caller cannot pass one that came from anywhere else.
 */
export type DemoLedger = {
  series: Omit<Insert<typeof invoiceSeries>, 'businessId'>[];
  invoices: Omit<Insert<typeof invoices>, 'businessId'>[];
  lines: Omit<Insert<typeof invoiceLines>, 'businessId'>[];
  payments: Omit<Insert<typeof payments>, 'businessId'>[];
  movements: Omit<Insert<typeof stockMovements>, 'businessId'>[];
  returns: Omit<Insert<typeof salesReturns>, 'businessId'>[];
  returnLines: Omit<Insert<typeof salesReturnLines>, 'businessId'>[];
  audit: Omit<Insert<typeof invoiceAudit>, 'businessId'>[];
  views: Omit<Insert<typeof catalogViews>, 'businessId'>[];
  subscriptions: Omit<Insert<typeof subscriptionPayments>, 'businessId'>[];
  /** Jan Seva work register. Empty for a shop. */
  applications: Omit<Insert<typeof serviceApplications>, 'businessId'>[];
  /** Final rollup per product id, summed from `movements` by the caller. */
  stock: { productId: string; currentStock: string }[];
};

/**
 * Write a whole demo tenant in one transaction.
 *
 * One transaction and not several because a half-seeded shop — invoices whose
 * stock never moved, or a stock rollup that does not match its own ledger — is
 * exactly the sort of thing somebody would then spend an afternoon debugging as
 * if it were a real bug.
 */
export async function writeDemoLedger(ctx: TenantCtx, ledger: DemoLedger): Promise<void> {
  const businessId = ctx.businessId;

  await getDb().transaction(async (tx) => {
    if (ledger.series.length > 0) {
      await tx.insert(invoiceSeries).values(ledger.series.map((r) => ({ ...r, businessId })));
    }

    await insertChunked(ledger.invoices, (batch) =>
      tx.insert(invoices).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.lines, (batch) =>
      tx.insert(invoiceLines).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.payments, (batch) =>
      tx.insert(payments).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.movements, (batch) =>
      tx.insert(stockMovements).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.returns, (batch) =>
      tx.insert(salesReturns).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.returnLines, (batch) =>
      tx.insert(salesReturnLines).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.audit, (batch) =>
      tx.insert(invoiceAudit).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.views, (batch) =>
      tx.insert(catalogViews).values(batch.map((r) => ({ ...r, businessId }))),
    );
    await insertChunked(ledger.applications, (batch) =>
      tx.insert(serviceApplications).values(batch.map((r) => ({ ...r, businessId }))),
    );

    if (ledger.subscriptions.length > 0) {
      await tx
        .insert(subscriptionPayments)
        .values(ledger.subscriptions.map((r) => ({ ...r, businessId })));
    }

    // The cached rollup, set from the movements written just above and in the
    // same transaction as them — the one invariant `stock.ts` exists to keep.
    for (const row of ledger.stock) {
      await tx
        .update(products)
        .set({ currentStock: row.currentStock })
        .where(sql`${products.id} = ${row.productId}::uuid and ${products.businessId} = ${businessId}::uuid`);
    }
  });
}

/**
 * Backdate a demo business and put it on a paid plan.
 *
 * `registerOwner` always creates a shop that started today on a trial, which is
 * correct for a real signup and wrong for a demo tenant that is supposed to
 * have been trading since June. Kept separate from the profile update so it is
 * obvious that this is the one thing the normal signup path cannot express.
 */
export async function activateDemoBusiness(
  ctx: TenantCtx,
  args: {
    createdAt: Date;
    trialEndsAt: Date;
    paidUntil: Date;
    approvedAt: Date;
  },
): Promise<void> {
  await getDb()
    .update(businesses)
    .set({
      status: 'active',
      createdAt: args.createdAt,
      trialEndsAt: args.trialEndsAt,
      paidUntil: args.paidUntil,
      approvedAt: args.approvedAt,
      approvedBy: ctx.userId,
    })
    .where(eq(businesses.id, ctx.businessId));
}

/**
 * Clear one business's transactional data, keeping the business itself.
 *
 * ## Why this exists alongside `wipeDemoBusinesses`
 *
 * That function refuses anything outside `@demo.billwise.in`, which is right:
 * it deletes user accounts, and a seed script that could remove a real shop is
 * not a tool worth having. But a real account being used to try the product
 * out still needs re-seeding, and the answer cannot be "make a new account
 * every time".
 *
 * So this is the narrower power: scoped to one `ctx.businessId`, it cannot
 * reach another tenant by construction. It leaves the business, its owner,
 * settings and units alone — only the trading data goes.
 *
 * It is still destructive, so the caller must ask for it explicitly. Nothing
 * calls it as part of a normal seed.
 */
export async function resetBusinessData(ctx: TenantCtx): Promise<void> {
  const id = ctx.businessId;

  await getDb().transaction(async (tx) => {
    await tx.delete(serviceApplications).where(eq(serviceApplications.businessId, id));
    await tx.delete(salesReturnLines).where(eq(salesReturnLines.businessId, id));
    await tx.delete(salesReturns).where(eq(salesReturns.businessId, id));
    await tx.delete(invoiceAudit).where(eq(invoiceAudit.businessId, id));
    await tx.delete(payments).where(eq(payments.businessId, id));
    await tx.delete(catalogViews).where(eq(catalogViews.businessId, id));
    await tx.delete(invoiceLines).where(eq(invoiceLines.businessId, id));
    await tx.delete(invoices).where(eq(invoices.businessId, id));
    await tx.delete(invoiceSeries).where(eq(invoiceSeries.businessId, id));
    await tx.delete(stockMovements).where(eq(stockMovements.businessId, id));
    await tx.delete(products).where(eq(products.businessId, id));
    await tx.delete(parties).where(eq(parties.businessId, id));
    // Subscription payments are money that changed hands with us. They survive
    // a data reset for the same reason they survive everything else.
  });
}

import { type TenantCtx, nextPeriodEnd } from '@billwise/shared';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { businesses, subscriptionPayments } from '../schema/index';

/**
 * Subscription billing. What the shopkeeper pays us.
 *
 * Deliberately separate from `payments`, which is what the shopkeeper's own
 * customers pay them. Mixing the two would put our revenue inside a tenant's
 * books, and the day someone exports their ledger they would find our
 * subscription charges in it.
 */

export type SubscriptionPaymentRow = {
  id: string;
  providerRef: string;
  paymentRef: string | null;
  amount: string;
  currency: string;
  status: string;
  method: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

/** Records an attempt. Written when a QR is generated, before any money moves. */
export async function createSubscriptionPayment(
  ctx: TenantCtx,
  input: { providerRef: string; amount: string; provider?: string },
): Promise<void> {
  await getDb()
    .insert(subscriptionPayments)
    .values({
      businessId: ctx.businessId,
      provider: input.provider ?? 'razorpay',
      providerRef: input.providerRef,
      amount: input.amount,
      status: 'created',
    });
}

export async function listSubscriptionPayments(
  ctx: TenantCtx,
  limit = 24,
): Promise<SubscriptionPaymentRow[]> {
  return getDb()
    .select({
      id: subscriptionPayments.id,
      providerRef: subscriptionPayments.providerRef,
      paymentRef: subscriptionPayments.paymentRef,
      amount: subscriptionPayments.amount,
      currency: subscriptionPayments.currency,
      status: subscriptionPayments.status,
      method: subscriptionPayments.method,
      paidAt: subscriptionPayments.paidAt,
      createdAt: subscriptionPayments.createdAt,
    })
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.businessId, ctx.businessId))
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(limit);
}

export type CreditResult =
  | { ok: true; alreadyCredited: boolean; paidUntil: Date }
  | { ok: false; reason: 'unknown_ref' };

/**
 * Credit a payment and extend the paid month.
 *
 * **Idempotent by design.** Razorpay may deliver the same webhook more than
 * once, and the browser polls the same QR in parallel; both paths call this.
 * The first one to arrive flips `status` to `paid` inside a transaction and
 * extends the month. Anything after that sees `status = 'paid'` and returns the
 * existing date without adding a second month to a single payment.
 *
 * Looked up by the provider's own reference rather than by tenant, because a
 * webhook arrives with no session attached. The reference is unique and comes
 * from the payment provider, so it cannot be guessed into crediting someone
 * else's business.
 */
export async function creditSubscriptionPayment(
  providerRef: string,
  input: { paymentRef?: string | undefined; method?: string | undefined; paidAt?: Date },
): Promise<CreditResult> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: subscriptionPayments.id,
        businessId: subscriptionPayments.businessId,
        status: subscriptionPayments.status,
      })
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.providerRef, providerRef))
      .for('update')
      .limit(1);

    if (!row) return { ok: false, reason: 'unknown_ref' };

    const [business] = await tx
      .select({ paidUntil: businesses.paidUntil })
      .from(businesses)
      .where(eq(businesses.id, row.businessId))
      .limit(1);

    if (row.status === 'paid') {
      return { ok: true, alreadyCredited: true, paidUntil: business?.paidUntil ?? new Date() };
    }

    const paidUntil = nextPeriodEnd(business?.paidUntil ?? null, input.paidAt ?? new Date());

    await tx
      .update(subscriptionPayments)
      .set({
        status: 'paid',
        paymentRef: input.paymentRef ?? null,
        method: input.method ?? null,
        paidAt: input.paidAt ?? new Date(),
      })
      .where(eq(subscriptionPayments.id, row.id));

    await tx
      .update(businesses)
      .set({ status: 'active', paidUntil, approvedAt: new Date() })
      .where(eq(businesses.id, row.businessId));

    return { ok: true, alreadyCredited: false, paidUntil };
  });
}

/** Marks an abandoned QR closed, so the billing history is not a wall of "created". */
export async function expireSubscriptionPayment(providerRef: string): Promise<void> {
  await getDb()
    .update(subscriptionPayments)
    .set({ status: 'expired' })
    .where(eq(subscriptionPayments.providerRef, providerRef));
}

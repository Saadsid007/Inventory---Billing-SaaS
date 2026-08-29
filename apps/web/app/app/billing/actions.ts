'use server';

import {
  createSubscriptionPayment,
  creditSubscriptionPayment,
  expireSubscriptionPayment,
} from '@billwise/db';
import { MONTHLY_PRICE_INR } from '@billwise/shared';
import { hasRazorpay } from '@billwise/shared/env';
import { revalidatePath } from 'next/cache';
import { requireMembership } from '@/lib/auth/require-business';
import { createUpiQr, listQrPayments } from '@/lib/payments/razorpay';

/**
 * Subscription payment actions.
 *
 * `requireMembership()` rather than `requireBusiness()`, deliberately: the
 * whole point of this screen is that it works for a business that has been
 * locked out. Gating payment on having access would mean nobody could ever pay
 * their way back in.
 *
 * Money is never taken from the client. The amount comes from a constant on
 * the server, so a tampered request cannot buy a month for ₹1.
 */

export type StartPaymentResult =
  | { ok: true; qrId: string; imageUrl: string; closeBy: number; amount: string }
  | { ok: false; error: string };

export async function startUpiPaymentAction(): Promise<StartPaymentResult> {
  const { ctx, businessName } = await requireMembership();

  if (!hasRazorpay()) {
    return {
      ok: false,
      error: 'Online payment is not switched on yet. Message us and we will send you a UPI link.',
    };
  }

  try {
    const qr = await createUpiQr({
      amountRupees: MONTHLY_PRICE_INR,
      businessId: ctx.businessId,
      businessName,
      description: `Billwise, 1 month (${businessName})`,
    });

    // Recorded before the money moves, so a payment can never arrive against a
    // reference we have no row for.
    await createSubscriptionPayment(ctx, { providerRef: qr.id, amount: MONTHLY_PRICE_INR });

    return {
      ok: true,
      qrId: qr.id,
      imageUrl: qr.imageUrl,
      closeBy: qr.closeBy,
      amount: MONTHLY_PRICE_INR,
    };
  } catch (error) {
    console.error('startUpiPayment failed', error);
    return { ok: false, error: 'Could not create the payment QR. Please try again in a moment.' };
  }
}

export type PaymentStatusResult =
  | { status: 'pending' }
  | { status: 'paid'; paidUntil: string }
  | { status: 'error'; error: string };

/**
 * Polled by the browser while the QR is on screen.
 *
 * The webhook is the authority on payment. This exists so the screen updates
 * while the shopkeeper is still looking at it instead of after a refresh, and
 * so a missed webhook is not the difference between paid and locked out.
 * Crediting is idempotent, so both paths racing is fine.
 */
export async function checkUpiPaymentAction(qrId: string): Promise<PaymentStatusResult> {
  await requireMembership();

  try {
    const payments = await listQrPayments(qrId);
    const captured = payments.find((p) => p.status === 'captured');
    if (!captured) return { status: 'pending' };

    const credited = await creditSubscriptionPayment(qrId, {
      paymentRef: captured.id,
      method: captured.method ?? 'upi',
      paidAt: new Date(captured.createdAt * 1000),
    });

    if (!credited.ok) return { status: 'error', error: 'That payment could not be matched.' };

    revalidatePath('/app/billing');
    revalidatePath('/app');
    return { status: 'paid', paidUntil: credited.paidUntil.toISOString() };
  } catch (error) {
    console.error('checkUpiPayment failed', error);
    return { status: 'error', error: 'Could not check the payment just now.' };
  }
}

/** Called when the shopkeeper closes the QR without paying. */
export async function cancelUpiPaymentAction(qrId: string): Promise<void> {
  await requireMembership();
  try {
    await expireSubscriptionPayment(qrId);
  } catch (error) {
    console.error('cancelUpiPayment failed', error);
  }
}

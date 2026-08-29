import { creditSubscriptionPayment } from '@billwise/db';
import { serverEnv } from '@billwise/shared/env';
import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';

/**
 * Razorpay webhook. The authority on whether a subscription was paid.
 *
 * A thin route handler (spec §2.5 hard rule 4): verify, call a repository,
 * respond. No business logic, and nothing that trusts the request body before
 * the signature has been checked.
 *
 * Three rules this endpoint lives by:
 *
 *  • **The raw body is verified, not the parsed one.** Parsing to JSON and
 *    re-serialising changes the bytes, and every signature would stop matching.
 *  • **A bad signature is a 401 and nothing else happens.** This URL is public;
 *    anyone can POST "I paid" to it.
 *  • **Crediting is idempotent.** Razorpay retries a webhook until it gets a
 *    2xx, and the billing screen polls the same payment in parallel. Whoever
 *    arrives first credits the month; everyone after sees it is already paid.
 *
 * It answers 200 to anything it has verified but cannot use. A 500 on an event
 * type we ignore would have Razorpay retrying it for hours.
 */
export async function POST(request: Request) {
  const secret = serverEnv().RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set');
    return new NextResponse(null, { status: 503 });
  }

  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) return new NextResponse(null, { status: 401 });

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return new NextResponse(null, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; method?: string; created_at?: number } };
      qr_code?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // `qr_code.credited` is the one that matters: money landed against a QR we
  // issued. `payment.captured` arrives too, but without the QR id it cannot be
  // matched to a business, so it is acknowledged and ignored.
  if (event.event !== 'qr_code.credited') {
    return NextResponse.json({ received: true });
  }

  const qrId = event.payload?.qr_code?.entity?.id;
  const payment = event.payload?.payment?.entity;
  if (!qrId) return NextResponse.json({ received: true });

  try {
    const result = await creditSubscriptionPayment(qrId, {
      paymentRef: payment?.id,
      method: payment?.method ?? 'upi',
      paidAt: payment?.created_at ? new Date(payment.created_at * 1000) : new Date(),
    });

    if (!result.ok) {
      // A QR we have no row for. Nothing to credit, and retrying will not help.
      console.error('razorpay webhook for unknown qr', qrId);
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, alreadyCredited: result.alreadyCredited });
  } catch (error) {
    // A real failure. Answer 500 so Razorpay retries: the alternative is a
    // shopkeeper who has paid and is still locked out.
    console.error('razorpay webhook failed', error);
    return new NextResponse(null, { status: 500 });
  }
}

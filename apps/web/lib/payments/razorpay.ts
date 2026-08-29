import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireRazorpayEnv } from '@billwise/shared/env';

/**
 * Razorpay, over plain REST.
 *
 * No SDK, for the same reason `lib/storage/supabase-storage.ts` has none: the
 * three calls this product makes are three `fetch`es, and a dependency that
 * wraps them brings its own release cycle, its own transitive packages and its
 * own opinions about retries.
 *
 * ## Why a QR code and not a checkout page
 *
 * The shopkeeper is already holding a phone with a UPI app on it. Sending them
 * to a hosted checkout to pick a method, then back again, is three screens to
 * do what scanning a square does in one. Razorpay's QR Codes API issues a
 * single-use UPI QR for an exact amount, which is exactly that.
 *
 * Money is handled in paise, as integers, all the way through. Rupees as a
 * float is how people end up charging ₹298.99999.
 */

const API = 'https://api.razorpay.com/v1';

function authHeader(): string {
  const { keyId, keySecret } = requireRazorpayEnv();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    // Payment state must never be served from a cache.
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: { description?: string; code?: string };
  };

  if (!response.ok) {
    const detail = body.error?.description ?? `HTTP ${response.status}`;
    throw new Error(`Razorpay ${path} failed: ${detail}`);
  }
  return body as T;
}

/** Rupee string to integer paise. '299.00' → 29900. */
export function toPaise(rupees: string): number {
  const [whole = '0', frac = ''] = rupees.split('.');
  const paise = `${frac}00`.slice(0, 2);
  return Number(whole) * 100 + Number(paise);
}

export type UpiQr = {
  id: string;
  imageUrl: string;
  /** Unix seconds. After this the QR stops accepting money. */
  closeBy: number;
};

type QrResponse = { id: string; image_url: string; close_by: number };

/**
 * A single-use UPI QR for an exact amount.
 *
 * `usage: 'single_use'` and `fixed_amount: true` together mean the QR dies
 * after one payment of exactly this amount. A reusable QR would happily take a
 * second month's money from someone who scanned an old screenshot.
 */
export async function createUpiQr(input: {
  amountRupees: string;
  businessId: string;
  businessName: string;
  description: string;
  /** How long the QR stays valid. Razorpay requires at least 15 minutes. */
  validForMinutes?: number;
}): Promise<UpiQr> {
  const minutes = Math.max(15, input.validForMinutes ?? 20);
  const closeBy = Math.floor(Date.now() / 1000) + minutes * 60;

  const qr = await call<QrResponse>('/payments/qr_codes', {
    method: 'POST',
    body: JSON.stringify({
      type: 'upi_qr',
      name: input.businessName.slice(0, 40),
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: toPaise(input.amountRupees),
      description: input.description,
      close_by: closeBy,
      // Echoed back on the webhook, so a credit can be traced without a lookup.
      notes: { businessId: input.businessId },
    }),
  });

  return { id: qr.id, imageUrl: qr.image_url, closeBy: qr.close_by ?? closeBy };
}

export type QrPayment = {
  id: string;
  status: string;
  method: string | null;
  createdAt: number;
};

/**
 * Payments received against a QR.
 *
 * The browser polls this while the QR is on screen. The webhook is the
 * authority — polling only exists so the screen updates while the shopkeeper is
 * still looking at it, rather than after a refresh.
 */
export async function listQrPayments(qrId: string): Promise<QrPayment[]> {
  const body = await call<{
    items?: { id: string; status: string; method?: string; created_at: number }[];
  }>(`/payments/qr_codes/${qrId}/payments?count=10`);

  return (body.items ?? []).map((item) => ({
    id: item.id,
    status: item.status,
    method: item.method ?? null,
    createdAt: item.created_at,
  }));
}

export async function closeUpiQr(qrId: string): Promise<void> {
  await call(`/payments/qr_codes/${qrId}/close`, { method: 'POST' });
}

/**
 * Webhook signature check.
 *
 * HMAC-SHA256 of the exact raw body with the webhook secret. Compared with
 * `timingSafeEqual` — a plain `===` on a signature leaks, one byte at a time,
 * how much of a guess was right.
 *
 * The body must be the raw text. Parsing it to JSON and re-serialising changes
 * the bytes and every signature stops matching.
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

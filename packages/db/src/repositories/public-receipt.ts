import type { TenantCtx } from '@billwise/shared';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { businesses, invoiceLines, invoices } from '../schema/index';

/**
 * The bill a customer can open from a WhatsApp link, without logging in.
 *
 * ## The one rule
 *
 * `findReceiptByToken` is the only function in this codebase that reads a
 * business's data without a `TenantCtx`, and it is allowed to because the token
 * IS the authorisation: it is random, it belongs to exactly one invoice, and
 * the query returns that invoice and nothing else. It must never grow a
 * "and also fetch their other bills" parameter. If that is ever needed, it
 * needs a different, scoped function.
 *
 * `auth.ts` is the only comparable exception, for the same shape of reason.
 */

/**
 * 22 characters from a 32-symbol alphabet — about 110 bits. Not guessable, and
 * short enough to sit in a WhatsApp message without wrapping.
 *
 * No look-alike characters: these links get read aloud and retyped at counters,
 * and `l` versus `1` in a support call is a wasted afternoon.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function newToken(): string {
  const bytes = new Uint8Array(22);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/**
 * Return this invoice's share token, creating one on first use.
 *
 * Lazy on purpose: a shop issues hundreds of bills and shares a handful, and a
 * token that was never handed out is one fewer thing that can leak.
 *
 * The update is conditional on the column still being null, so two taps on
 * "Send" cannot mint two tokens and leave the first link dead.
 */
export async function ensureReceiptToken(ctx: TenantCtx, invoiceId: string): Promise<string> {
  const [existing] = await getDb()
    .select({ token: invoices.publicToken, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, ctx.businessId)))
    .limit(1);

  if (!existing) throw new Error('That bill does not exist.');
  if (existing.token) return existing.token;

  // A draft has no number and no legal standing; sharing one would send the
  // customer a bill that can still change under them.
  if (existing.status === 'draft') {
    throw new Error('Issue the bill before sharing it.');
  }

  const token = newToken();
  const [updated] = await getDb()
    .update(invoices)
    .set({ publicToken: token })
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.businessId, ctx.businessId),
        sql`${invoices.publicToken} is null`,
      ),
    )
    .returning({ token: invoices.publicToken });

  if (updated?.token) return updated.token;

  // Lost the race. Whoever won wrote a token; read it back rather than
  // overwriting and breaking the link they just sent.
  const [now] = await getDb()
    .select({ token: invoices.publicToken })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  return now?.token ?? token;
}

export type PublicReceipt = {
  invoiceNo: string | null;
  invoiceDate: string;
  kind: string;
  status: string;
  partyName: string;
  grandTotal: string;
  amountPaid: string;
  balance: string;
  paymentStatus: string;
  notes: string | null;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  roundOff: string;
  otherCharges: string;
  subtotal: string;
  business: {
    name: string;
    phone: string | null;
    city: string | null;
    addressLine1: string | null;
    gstin: string | null;
    type: string;
  };
  lines: {
    name: string;
    qty: string;
    rate: string;
    lineTotal: string;
  }[];
};

/**
 * Look a receipt up by its share token.
 *
 * Returns only what is already printed on the paper the customer was handed.
 * No customer phone, no address, no other bills, no shop email — a link that
 * travels through WhatsApp gets forwarded, and everything here is visible to
 * whoever ends up holding it.
 */
export async function findReceiptByToken(token: string): Promise<PublicReceipt | undefined> {
  const clean = token.trim();
  if (!clean || clean.length > 64) return undefined;

  const [head] = await getDb()
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      invoiceDate: invoices.invoiceDate,
      kind: invoices.kind,
      status: invoices.status,
      partyName: invoices.partyName,
      subtotal: invoices.subtotal,
      cgstTotal: invoices.cgstTotal,
      sgstTotal: invoices.sgstTotal,
      igstTotal: invoices.igstTotal,
      otherCharges: invoices.otherCharges,
      roundOff: invoices.roundOff,
      grandTotal: invoices.grandTotal,
      amountPaid: invoices.amountPaid,
      paymentStatus: invoices.paymentStatus,
      notes: invoices.notes,
      businessName: businesses.name,
      businessPhone: businesses.phone,
      businessCity: businesses.city,
      businessAddress: businesses.addressLine1,
      businessGstin: businesses.gstin,
      businessType: businesses.type,
    })
    .from(invoices)
    .innerJoin(businesses, eq(businesses.id, invoices.businessId))
    .where(eq(invoices.publicToken, clean))
    .limit(1);

  if (!head) return undefined;

  const lines = await getDb()
    .select({
      name: invoiceLines.name,
      qty: invoiceLines.qty,
      rate: invoiceLines.rate,
      lineTotal: invoiceLines.lineTotal,
    })
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, head.id))
    .orderBy(invoiceLines.lineNo);

  const balance = (Number(head.grandTotal) - Number(head.amountPaid)).toFixed(2);

  return {
    invoiceNo: head.invoiceNo,
    invoiceDate: head.invoiceDate,
    kind: head.kind,
    status: head.status,
    partyName: head.partyName,
    subtotal: head.subtotal,
    cgstTotal: head.cgstTotal,
    sgstTotal: head.sgstTotal,
    igstTotal: head.igstTotal,
    otherCharges: head.otherCharges,
    roundOff: head.roundOff,
    grandTotal: head.grandTotal,
    amountPaid: head.amountPaid,
    balance,
    paymentStatus: head.paymentStatus,
    notes: head.notes,
    business: {
      name: head.businessName,
      phone: head.businessPhone,
      city: head.businessCity,
      addressLine1: head.businessAddress,
      gstin: head.businessGstin,
      type: head.businessType,
    },
    lines,
  };
}

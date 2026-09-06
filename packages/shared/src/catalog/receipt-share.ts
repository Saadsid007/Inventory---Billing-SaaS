/**
 * The WhatsApp message that carries a bill to the customer.
 *
 * ## Why wa.me and not the WhatsApp Business API
 *
 * The API needs a Meta business account, template approval and a per-message
 * fee. A `wa.me` link opens WhatsApp with the text already typed and the
 * shopkeeper taps send — no account, no approval, no cost, and it works from
 * the same phone they already use. The build spec calls for exactly this.
 *
 * The consequence is that sending is manual. That is a feature at a counter:
 * nothing goes out without the person who took the money seeing it first.
 *
 * ## Why the balance is its own line
 *
 * A CSC takes ₹100 against a ₹200 job every day. The number the customer needs
 * is not the total — it is what is still owed — so it gets a line of its own
 * with nothing else on it.
 */

export type ReceiptShareInput = {
  businessName: string;
  documentLabel: string;
  invoiceNo: string | null;
  /** Already formatted for a human: `30-08-2026`. */
  invoiceDate: string;
  items: readonly string[];
  grandTotal: string;
  amountPaid: string;
  balance: string;
  /** Absolute URL of the public receipt page. */
  link?: string | undefined;
  businessPhone?: string | null | undefined;
};

const rupees = (value: string) =>
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function receiptShareMessage(input: ReceiptShareInput): string {
  const lines: string[] = [`*${input.businessName}*`];

  lines.push(
    `${input.documentLabel}${input.invoiceNo ? ` ${input.invoiceNo}` : ''} · ${input.invoiceDate}`,
  );

  if (input.items.length > 0) {
    lines.push('');
    // Capped because a WhatsApp preview truncates, and a wall of text reads as
    // spam. The link has the full list.
    for (const item of input.items.slice(0, 6)) lines.push(`• ${item}`);
    if (input.items.length > 6) lines.push(`• …and ${input.items.length - 6} more`);
  }

  lines.push('');
  lines.push(`Total: ${rupees(input.grandTotal)}`);

  const paid = Number(input.amountPaid);
  const balance = Number(input.balance);

  if (paid > 0 && balance > 0) lines.push(`Jama: ${rupees(input.amountPaid)}`);

  if (balance > 0) {
    lines.push(`*Baaki: ${rupees(input.balance)}*`);
  } else {
    lines.push('*Paid — dhanyavaad!*');
  }

  if (input.link) {
    lines.push('');
    lines.push(`Bill dekhein: ${input.link}`);
  }

  if (input.businessPhone) {
    lines.push('');
    lines.push(`Koi sawaal ho to: ${input.businessPhone}`);
  }

  return lines.join('\n');
}

/**
 * Reduce an Indian mobile number to the digits WhatsApp expects.
 *
 * Shopkeepers store numbers every possible way — `+91 98765 43210`,
 * `098765-43210`, `9876543210`. A ten-digit number gets 91 in front; anything
 * that already carries a country code is left alone. Returns null when there is
 * nothing usable, so the caller can offer "copy the message" instead of
 * building a link that opens WhatsApp on a dead number.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** The full `wa.me` link, or null when the number is unusable. */
export function whatsappShareUrl(phone: string | null | undefined, message: string): string | null {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

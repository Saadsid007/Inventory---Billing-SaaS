import { describe, expect, it } from 'vitest';
import { receiptShareMessage, whatsappNumber, whatsappShareUrl } from './receipt-share';

const base = {
  businessName: 'Sharma Jan Seva Kendra',
  documentLabel: 'Receipt',
  invoiceNo: 'SJS-0042',
  invoiceDate: '30-08-2026',
  items: ['Aadhaar Update'],
  grandTotal: '200.00',
  amountPaid: '100.00',
  balance: '100.00',
};

describe('receiptShareMessage', () => {
  it('puts the balance on its own line, in bold', () => {
    // The whole reason this feature exists: the customer needs to see what is
    // still owed, not the total they already know.
    const msg = receiptShareMessage(base);
    expect(msg).toContain('Total: ₹200.00');
    expect(msg).toContain('Jama: ₹100.00');
    expect(msg).toContain('*Baaki: ₹100.00*');
  });

  it('says paid instead of showing a zero balance', () => {
    const msg = receiptShareMessage({ ...base, amountPaid: '200.00', balance: '0.00' });
    expect(msg).toContain('*Paid — dhanyavaad!*');
    expect(msg).not.toContain('Baaki');
    // "Jama: ₹200" beside "Total: ₹200" is noise when nothing is owed.
    expect(msg).not.toContain('Jama');
  });

  it('includes the link when there is one', () => {
    const msg = receiptShareMessage({ ...base, link: 'https://x.in/r/abc' });
    expect(msg).toContain('Bill dekhein: https://x.in/r/abc');
  });

  it('caps a long item list rather than sending a wall of text', () => {
    const items = Array.from({ length: 9 }, (_, i) => `Service ${i + 1}`);
    const msg = receiptShareMessage({ ...base, items });
    expect(msg).toContain('• Service 6');
    expect(msg).not.toContain('• Service 7');
    expect(msg).toContain('…and 3 more');
  });

  it('survives an unnumbered draft without printing "null"', () => {
    const msg = receiptShareMessage({ ...base, invoiceNo: null });
    expect(msg).not.toContain('null');
    expect(msg).toContain('Receipt · 30-08-2026');
  });
});

describe('whatsappNumber', () => {
  it('accepts the ways an Indian number actually gets typed', () => {
    expect(whatsappNumber('9876543210')).toBe('919876543210');
    expect(whatsappNumber('+91 98765 43210')).toBe('919876543210');
    expect(whatsappNumber('098765-43210')).toBe('919876543210');
    expect(whatsappNumber('91 98765 43210')).toBe('919876543210');
  });

  it('returns null for nothing usable', () => {
    for (const bad of [null, undefined, '', '12345', 'na']) {
      expect(whatsappNumber(bad)).toBeNull();
    }
  });

  it('gives no link when there is no number, so the UI can offer copy instead', () => {
    expect(whatsappShareUrl(null, 'hi')).toBeNull();
    expect(whatsappShareUrl('9876543210', 'hi & bye')).toBe(
      'https://wa.me/919876543210?text=hi%20%26%20bye',
    );
  });
});

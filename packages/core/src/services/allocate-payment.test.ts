import { describe, expect, it } from 'vitest';
import { allocatePayment, type OpenInvoice, type Tender } from './allocate-payment';

const bill = (id: string, date: string, due: string): OpenInvoice => ({
  id,
  invoiceNo: id.toUpperCase(),
  invoiceDate: date,
  due,
});

/** Shorthand for the common single-method case. */
const cash = (amount: string): Tender[] => [{ method: 'cash', amount }];

describe('allocatePayment', () => {
  it('settles the oldest bill first and part-pays the next', () => {
    // The case a shopkeeper actually asks about: two bills, ₹200 and ₹100,
    // customer hands over ₹210.
    const result = allocatePayment({
      tenders: cash('210.00'),
      invoices: [bill('a', '2026-06-01', '200.00'), bill('b', '2026-06-20', '100.00')],
    });

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0]).toMatchObject({ invoiceId: 'a', amount: '200.00', dueAfter: '0.00' });
    expect(result.allocations[1]).toMatchObject({ invoiceId: 'b', amount: '10.00', dueAfter: '90.00' });
    expect(result.allocated).toBe('210.00');
    expect(result.unallocated).toBe('0.00');
  });

  it('leaves later bills untouched when the money runs out', () => {
    const result = allocatePayment({
      tenders: cash('50.00'),
      invoices: [
        bill('a', '2026-06-01', '200.00'),
        bill('b', '2026-06-20', '100.00'),
        bill('c', '2026-07-02', '75.00'),
      ],
    });

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]).toMatchObject({ invoiceId: 'a', amount: '50.00', dueAfter: '150.00' });
  });

  it('keeps the remainder as unallocated credit when everything is settled', () => {
    const result = allocatePayment({
      tenders: cash('500.00'),
      invoices: [bill('a', '2026-06-01', '200.00'), bill('b', '2026-06-20', '100.00')],
    });

    expect(result.allocated).toBe('300.00');
    expect(result.unallocated).toBe('200.00');
    expect(result.allocations.every((a) => a.dueAfter === '0.00')).toBe(true);
  });

  it('treats a payment with no open bills as entirely on account', () => {
    const result = allocatePayment({ tenders: cash('1000.00'), invoices: [] });
    expect(result.allocations).toEqual([]);
    expect(result.unallocated).toBe('1000.00');
    expect(result.unallocatedParts).toEqual([
      { method: 'cash', amount: '1000.00', reference: null },
    ]);
  });

  it('ignores zero and negative tenders', () => {
    const result = allocatePayment({
      tenders: [
        { method: 'cash', amount: '0.00' },
        { method: 'upi', amount: '-50.00' },
      ],
      invoices: [bill('a', '2026-06-01', '200.00')],
    });
    expect(result.allocations).toEqual([]);
    expect(result.total).toBe('0.00');
  });

  it('skips bills that are already settled rather than overpaying them', () => {
    const result = allocatePayment({
      tenders: cash('100.00'),
      invoices: [bill('a', '2026-06-01', '0.00'), bill('b', '2026-06-20', '100.00')],
    });

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]).toMatchObject({ invoiceId: 'b', amount: '100.00' });
  });

  it('handles paise without floating-point drift', () => {
    const result = allocatePayment({
      tenders: cash('0.30'),
      invoices: [bill('a', '2026-06-01', '0.10'), bill('b', '2026-06-02', '0.20')],
    });

    expect(result.allocations.map((a) => a.amount)).toEqual(['0.10', '0.20']);
    expect(result.unallocated).toBe('0.00');
  });

  describe('paid several ways at once', () => {
    it('splits one bill across two methods when the first runs out', () => {
      // ₹500 cash + ₹1000 UPI against a single ₹1200 bill: the cash goes in
      // first, then ₹700 of the UPI. The rest of the UPI moves on.
      const result = allocatePayment({
        tenders: [
          { method: 'cash', amount: '500.00' },
          { method: 'upi', amount: '1000.00', reference: 'UPI 8891' },
        ],
        invoices: [bill('a', '2026-06-01', '1200.00'), bill('b', '2026-06-05', '400.00')],
      });

      expect(result.allocations[0]!.parts).toEqual([
        { method: 'cash', amount: '500.00', reference: null },
        { method: 'upi', amount: '700.00', reference: 'UPI 8891' },
      ]);
      expect(result.allocations[1]!.parts).toEqual([
        { method: 'upi', amount: '300.00', reference: 'UPI 8891' },
      ]);
      expect(result.allocations[1]).toMatchObject({ amount: '300.00', dueAfter: '100.00' });
    });

    it('carries the reference onto every row a tender funds', () => {
      const result = allocatePayment({
        tenders: [{ method: 'cheque', amount: '5000.00', reference: 'CHQ 114499' }],
        invoices: [bill('a', '2026-06-01', '2000.00'), bill('b', '2026-06-05', '2000.00')],
      });

      const references = result.allocations.flatMap((a) => a.parts.map((p) => p.reference));
      expect(references).toEqual(['CHQ 114499', 'CHQ 114499']);
    });

    it('keeps the leftover labelled with the method it arrived as', () => {
      const result = allocatePayment({
        tenders: [
          { method: 'cash', amount: '100.00' },
          { method: 'bank', amount: '900.00' },
        ],
        invoices: [bill('a', '2026-06-01', '300.00')],
      });

      expect(result.allocated).toBe('300.00');
      // The cash is fully spent; ₹700 of the bank transfer is left over, and it
      // must not be recorded as cash.
      expect(result.unallocatedParts).toEqual([
        { method: 'bank', amount: '700.00', reference: null },
      ]);
    });

    it('never creates or loses a paisa, however it is split', () => {
      // The invariant that matters. A rupee that vanishes here is a rupee
      // missing from a customer's khata.
      const result = allocatePayment({
        tenders: [
          { method: 'cash', amount: '333.33' },
          { method: 'upi', amount: '333.34' },
          { method: 'card', amount: '333.36' },
        ],
        invoices: [
          bill('a', '2026-06-01', '500.01'),
          bill('b', '2026-06-02', '250.00'),
          bill('c', '2026-06-03', '99.99'),
        ],
      });

      const fromParts = result.allocations
        .flatMap((a) => a.parts)
        .reduce((s, p) => s + Number(p.amount), 0);

      expect(fromParts.toFixed(2)).toBe(result.allocated);
      for (const allocation of result.allocations) {
        const partsSum = allocation.parts.reduce((s, p) => s + Number(p.amount), 0);
        expect(partsSum.toFixed(2)).toBe(allocation.amount);
      }
      expect((Number(result.allocated) + Number(result.unallocated)).toFixed(2)).toBe(
        result.total,
      );
      expect(result.total).toBe('1000.03');
    });
  });
});

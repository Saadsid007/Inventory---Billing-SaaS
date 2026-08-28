import { describe, expect, it } from 'vitest';
import { dec } from '../money';
import { computeInvoice, computeLine } from './engine';
import type { InvoiceTaxInput, TaxLineInput } from './types';

/**
 * Build spec §8.1 — non-negotiable before Phase 1 is called done:
 * intrastate vs interstate, inclusive vs exclusive, line discount,
 * invoice-level rounding, 0% rate, cess.
 */

const line = (over: Partial<TaxLineInput> = {}): TaxLineInput => ({
  qty: '1',
  rate: '1000',
  taxRate: '18',
  ...over,
});

const invoice = (over: Partial<InvoiceTaxInput> = {}): InvoiceTaxInput => ({
  kind: 'tax_invoice',
  taxMode: 'exclusive',
  isInterstate: false,
  lines: [line()],
  ...over,
});

describe('place of supply split', () => {
  it('splits into CGST and SGST within a state', () => {
    const r = computeLine(line(), { isInterstate: false, inclusive: false, applyTax: true });
    expect(r.cgstAmount).toBe('90.00');
    expect(r.sgstAmount).toBe('90.00');
    expect(r.igstAmount).toBe('0.00');
    expect(r.lineTotal).toBe('1180.00');
  });

  it('charges IGST across states', () => {
    const r = computeLine(line(), { isInterstate: true, inclusive: false, applyTax: true });
    expect(r.igstAmount).toBe('180.00');
    expect(r.cgstAmount).toBe('0.00');
    expect(r.sgstAmount).toBe('0.00');
    expect(r.lineTotal).toBe('1180.00');
  });

  it('charges the same total either way', () => {
    const intra = computeInvoice(invoice({ isInterstate: false }));
    const inter = computeInvoice(invoice({ isInterstate: true }));
    expect(intra.grandTotal).toBe(inter.grandTotal);
  });

  it('keeps CGST + SGST exactly equal to the total tax on odd paise', () => {
    // ₹0.55 at 18% is ₹0.099 -> ₹0.10 of tax. Rounding each half separately
    // would give 0.05 + 0.05 here, but on other values it gives 0.03 + 0.03
    // for a 0.05 tax and the invoice stops adding up.
    for (const rate of ['0.55', '1.39', '7.77', '2.51', '0.29']) {
      const r = computeLine(line({ rate, taxRate: '18' }), {
        isInterstate: false,
        inclusive: false,
        applyTax: true,
      });
      const halves = dec(r.cgstAmount).plus(dec(r.sgstAmount));
      const full = dec(r.taxableValue).times(18).dividedBy(100).toDecimalPlaces(2);
      expect(halves.toFixed(2)).toBe(full.toFixed(2));
    }
  });
});

describe('inclusive vs exclusive', () => {
  it('backs tax out of an inclusive price', () => {
    // ₹1180 inclusive of 18% is ₹1000 taxable.
    const r = computeLine(line({ rate: '1180' }), {
      isInterstate: false,
      inclusive: true,
      applyTax: true,
    });
    expect(r.taxableValue).toBe('1000.00');
    expect(r.cgstAmount).toBe('90.00');
    expect(r.sgstAmount).toBe('90.00');
    expect(r.lineTotal).toBe('1180.00');
  });

  it('lands on the round number the shopkeeper typed', () => {
    // The whole point of inclusive mode: type ₹100, customer pays ₹100.
    const r = computeInvoice(
      invoice({ taxMode: 'inclusive', lines: [line({ rate: '100', taxRate: '18' })] }),
    );
    expect(r.grandTotal).toBe('100.00');
  });

  it('accounts for cess in the inclusive divisor', () => {
    // ₹1000 taxable at 28% + 12% cess is ₹1400 inclusive. Dividing by
    // (100 + rate) alone — ignoring cess — would leave the total short.
    const r = computeInvoice(
      invoice({
        taxMode: 'inclusive',
        lines: [line({ rate: '1400', taxRate: '28', cessRate: '12' })],
      }),
    );
    expect(r.subtotal).toBe('1000.00');
    expect(r.cessTotal).toBe('120.00');
    expect(r.grandTotal).toBe('1400.00');
  });

  it('is identical to exclusive mode at a 0% rate', () => {
    const excl = computeInvoice(invoice({ lines: [line({ taxRate: '0' })] }));
    const incl = computeInvoice(
      invoice({ taxMode: 'inclusive', lines: [line({ taxRate: '0' })] }),
    );
    expect(incl.grandTotal).toBe(excl.grandTotal);
  });
});

describe('discounts', () => {
  it('applies a percentage discount before tax', () => {
    const r = computeLine(line({ discountPct: '10' }), {
      isInterstate: false,
      inclusive: false,
      applyTax: true,
    });
    expect(r.discountAmount).toBe('100.00');
    expect(r.taxableValue).toBe('900.00');
    expect(r.lineTotal).toBe('1062.00');
  });

  it('prefers an absolute discount over a percentage', () => {
    // What the shopkeeper actually negotiated wins.
    const r = computeLine(line({ discountPct: '50', discountAmount: '250' }), {
      isInterstate: false,
      inclusive: false,
      applyTax: true,
    });
    expect(r.discountAmount).toBe('250.00');
    expect(r.taxableValue).toBe('750.00');
  });

  it('clamps a discount larger than the line to zero rather than going negative', () => {
    // Negative GST on a sale is not a thing; that is what a credit note is for.
    const r = computeLine(line({ discountAmount: '5000' }), {
      isInterstate: false,
      inclusive: false,
      applyTax: true,
    });
    expect(r.discountAmount).toBe('1000.00');
    expect(r.taxableValue).toBe('0.00');
    expect(r.lineTotal).toBe('0.00');
  });

  it('ignores a negative discount', () => {
    const r = computeLine(line({ discountAmount: '-100' }), {
      isInterstate: false,
      inclusive: false,
      applyTax: true,
    });
    expect(r.discountAmount).toBe('0.00');
    expect(r.taxableValue).toBe('1000.00');
  });
});

describe('rates', () => {
  it('charges nothing at 0%', () => {
    const r = computeInvoice(invoice({ lines: [line({ taxRate: '0' })] }));
    expect(r.cgstTotal).toBe('0.00');
    expect(r.sgstTotal).toBe('0.00');
    expect(r.grandTotal).toBe('1000.00');
  });

  it('handles the 0.25% slab without losing paise', () => {
    const r = computeLine(line({ taxRate: '0.25' }), {
      isInterstate: true,
      inclusive: false,
      applyTax: true,
    });
    expect(r.igstAmount).toBe('2.50');
    expect(r.lineTotal).toBe('1002.50');
  });

  it('applies cess on top of GST, both on the taxable value', () => {
    const r = computeLine(line({ taxRate: '28', cessRate: '12' }), {
      isInterstate: true,
      inclusive: false,
      applyTax: true,
    });
    expect(r.igstAmount).toBe('280.00');
    expect(r.cessAmount).toBe('120.00');
    expect(r.lineTotal).toBe('1400.00');
  });

  it('supports every seeded GST 2.0 slab', () => {
    for (const taxRate of ['0', '0.25', '3', '5', '18', '40']) {
      const r = computeInvoice(invoice({ lines: [line({ taxRate })] }));
      const expected = dec('1000').times(dec(taxRate)).dividedBy(100).toFixed(2);
      expect(dec(r.cgstTotal).plus(dec(r.sgstTotal)).toFixed(2)).toBe(expected);
    }
  });
});

describe('document kinds', () => {
  it('charges no GST on a cash memo or bill of supply', () => {
    for (const kind of ['cash_memo', 'bill_of_supply', 'estimate', 'delivery_challan'] as const) {
      const r = computeInvoice(invoice({ kind }));
      expect(r.cgstTotal).toBe('0.00');
      expect(r.sgstTotal).toBe('0.00');
      expect(r.igstTotal).toBe('0.00');
      expect(r.cessTotal).toBe('0.00');
      expect(r.grandTotal).toBe('1000.00');
    }
  });

  it('zeroes the printed rate too, not just the amount', () => {
    // A cash memo showing "18%" against ₹0 of tax would look like a bug to a
    // customer and like evasion to an officer.
    const r = computeInvoice(invoice({ kind: 'cash_memo' }));
    expect(r.lines[0]!.taxRate).toBe('0.00');
  });
});

describe('invoice rounding', () => {
  it('rounds the grand total to the nearest rupee and records the difference', () => {
    const r = computeInvoice(invoice({ lines: [line({ rate: '999.99', taxRate: '18' })] }));
    expect(r.preRound).toBe('1179.99');
    expect(r.grandTotal).toBe('1180.00');
    expect(r.roundOff).toBe('0.01');
  });

  it('records a negative round-off when rounding down', () => {
    const r = computeInvoice(invoice({ lines: [line({ rate: '1000.20', taxRate: '18' })] }));
    expect(r.preRound).toBe('1180.24');
    expect(r.grandTotal).toBe('1180.00');
    expect(r.roundOff).toBe('-0.24');
  });

  it('always satisfies grandTotal = preRound + roundOff', () => {
    const rates = ['999.99', '1000.20', '7.77', '0.55', '123.456', '88.88'];
    for (const rate of rates) {
      const r = computeInvoice(invoice({ lines: [line({ rate })] }));
      expect(dec(r.preRound).plus(dec(r.roundOff)).toFixed(2)).toBe(r.grandTotal);
    }
  });

  it('adds other charges after tax but before rounding', () => {
    const r = computeInvoice(invoice({ otherCharges: '50.60' }));
    expect(r.preRound).toBe('1230.60');
    expect(r.grandTotal).toBe('1231.00');
    expect(r.roundOff).toBe('0.40');
  });
});

describe('totals reconcile with their own lines', () => {
  it('sums totals from rounded line values, so the printed column adds up', () => {
    const lines = Array.from({ length: 37 }, (_, i) => line({ rate: `${7.77 + i * 3.13}` }));
    const r = computeInvoice(invoice({ lines }));

    const sum = (pick: (l: (typeof r.lines)[number]) => string) =>
      r.lines.reduce((a, l) => a.plus(dec(pick(l))), dec('0')).toFixed(2);

    expect(sum((l) => l.taxableValue)).toBe(r.subtotal);
    expect(sum((l) => l.cgstAmount)).toBe(r.cgstTotal);
    expect(sum((l) => l.sgstAmount)).toBe(r.sgstTotal);
    expect(sum((l) => l.cessAmount)).toBe(r.cessTotal);
    expect(sum((l) => l.lineTotal)).toBe(r.preRound);
  });

  it('rounds tax per line, not on the subtotal', () => {
    // 200 lines of ₹0.99. Each line's 5% is ₹0.0495, which rounds UP to ₹0.05,
    // so the tax column totals ₹10.00 — not the ₹9.90 you would get by taking
    // 5% of the ₹198 subtotal.
    //
    // That ₹0.10 gap is correct and required: GST is charged per line, the
    // printed invoice shows per-line tax, and the total must be the sum of the
    // column a reader can add up themselves. Anyone "fixing" this later to
    // match tax-on-subtotal will break that reconciliation.
    const lines = Array.from({ length: 200 }, () =>
      line({ qty: '3', rate: '0.33', taxRate: '5' }),
    );
    const r = computeInvoice(invoice({ lines }));

    expect(r.subtotal).toBe('198.00');
    expect(dec(r.cgstTotal).plus(dec(r.sgstTotal)).toFixed(2)).toBe('10.00');

    // Tax on the subtotal would have been ₹9.90 — deliberately not what we do.
    expect(dec(r.subtotal).times(5).dividedBy(100).toFixed(2)).toBe('9.90');

    // The column still adds up exactly, which is the property that matters.
    const columnSum = r.lines.reduce(
      (a, l) => a.plus(dec(l.cgstAmount)).plus(dec(l.sgstAmount)),
      dec('0'),
    );
    expect(columnSum.toFixed(2)).toBe(dec(r.cgstTotal).plus(dec(r.sgstTotal)).toFixed(2));
  });

  it('stays exact over a long invoice where floats would drift', () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point. Accumulated 1000 times on a
    // wholesale invoice, that error becomes visible money.
    const lines = Array.from({ length: 1000 }, () =>
      line({ qty: '1', rate: '0.10', taxRate: '0' }),
    );
    const r = computeInvoice(invoice({ lines }));
    expect(r.subtotal).toBe('100.00');
    expect(r.grandTotal).toBe('100.00');
  });

  it('handles fractional quantities for kg and litre selling', () => {
    const r = computeLine(line({ qty: '2.750', rate: '84', taxRate: '5' }), {
      isInterstate: false,
      inclusive: false,
      applyTax: true,
    });
    expect(r.gross).toBe('231.00');
    expect(r.taxableValue).toBe('231.00');
    expect(r.cgstAmount).toBe('5.78');
    expect(r.sgstAmount).toBe('5.77');
  });
});

describe('degenerate inputs', () => {
  it('produces a zero invoice with no lines', () => {
    const r = computeInvoice(invoice({ lines: [] }));
    expect(r.subtotal).toBe('0.00');
    expect(r.grandTotal).toBe('0.00');
    expect(r.roundOff).toBe('0.00');
  });

  it('handles a zero quantity line', () => {
    const r = computeLine(line({ qty: '0' }), {
      isInterstate: false,
      inclusive: false,
      applyTax: true,
    });
    expect(r.taxableValue).toBe('0.00');
    expect(r.lineTotal).toBe('0.00');
  });

  it('rejects garbage rather than silently producing NaN', () => {
    expect(() =>
      computeLine(line({ rate: 'abc' }), {
        isInterstate: false,
        inclusive: false,
        applyTax: true,
      }),
    ).toThrow(TypeError);
  });
});

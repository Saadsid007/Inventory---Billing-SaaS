import { describe, expect, it } from 'vitest';
import { buildInvoice, type BuildInvoiceInput } from './build-invoice';

const base = (over: Partial<BuildInvoiceInput> = {}): BuildInvoiceInput => ({
  kind: 'tax_invoice',
  invoiceDate: '2026-06-15',
  taxMode: 'exclusive',
  supplierStateCode: '09',
  lines: [{ name: 'Widget', qty: '2', rate: '500', taxRate: '18' }],
  ...over,
});

describe('buildInvoice', () => {
  it('composes place of supply, financial year and tax into one storable shape', () => {
    const r = buildInvoice(base());
    expect(r.fy).toBe('2026-27');
    expect(r.placeOfSupply).toBe('09');
    expect(r.isInterstate).toBe(false);
    expect(r.subtotal).toBe('1000.00');
    expect(r.cgstTotal).toBe('90.00');
    expect(r.sgstTotal).toBe('90.00');
    expect(r.grandTotal).toBe('1180.00');
  });

  it('switches to IGST when the party is in another state', () => {
    const r = buildInvoice(base({ partyStateCode: '27' }));
    expect(r.isInterstate).toBe(true);
    expect(r.igstTotal).toBe('180.00');
    expect(r.cgstTotal).toBe('0.00');
    expect(r.placeOfSupplySource).toBe('party_state');
  });

  it('falls back to the GSTIN state when no state is recorded', () => {
    const r = buildInvoice(base({ partyGstin: '27AAPFU0939F1ZV' }));
    expect(r.placeOfSupply).toBe('27');
    expect(r.placeOfSupplySource).toBe('party_gstin');
  });

  it('honours a manual override above everything else', () => {
    const r = buildInvoice(
      base({ partyStateCode: '09', partyGstin: '09AAPFU0939F1ZV', placeOfSupplyOverride: '27' }),
    );
    expect(r.placeOfSupply).toBe('27');
    expect(r.isInterstate).toBe(true);
    expect(r.placeOfSupplySource).toBe('override');
  });

  it('takes the financial year from the invoice date, not today', () => {
    // Backdating to 31 March must file under the PREVIOUS year's series.
    expect(buildInvoice(base({ invoiceDate: '2026-03-31' })).fy).toBe('2025-26');
    expect(buildInvoice(base({ invoiceDate: '2026-04-01' })).fy).toBe('2026-27');
  });

  it('charges no tax on a cash memo but still records a place of supply', () => {
    const r = buildInvoice(base({ kind: 'cash_memo', partyStateCode: '27' }));
    expect(r.cgstTotal).toBe('0.00');
    expect(r.igstTotal).toBe('0.00');
    expect(r.grandTotal).toBe('1000.00');
    // Still recorded — spec §5.2 requires it even for non-taxable documents.
    expect(r.placeOfSupply).toBe('27');
    expect(r.isInterstate).toBe(true);
  });

  it('produces line output that maps straight onto invoice_lines columns', () => {
    const r = buildInvoice(
      base({
        lines: [
          {
            productId: 'p1',
            name: 'Salt 1kg',
            hsnCode: '25010020',
            unit: 'PCS',
            qty: '3',
            rate: '28',
            taxRate: '5',
          },
        ],
      }),
    );
    expect(r.lines[0]).toMatchObject({
      productId: 'p1',
      name: 'Salt 1kg',
      hsnCode: '25010020',
      unit: 'PCS',
      qty: '3',
      rate: '28',
      taxableValue: '84.00',
      taxRate: '5.00',
      cgstAmount: '2.10',
      sgstAmount: '2.10',
      lineTotal: '88.20',
    });
  });

  it('keeps totals equal to the sum of its own lines', () => {
    const r = buildInvoice(
      base({
        lines: Array.from({ length: 25 }, (_, i) => ({
          name: `Item ${i}`,
          qty: '1',
          rate: `${9.99 + i * 4.37}`,
          taxRate: '18',
        })),
        otherCharges: '75.50',
      }),
    );
    const sum = (pick: (l: (typeof r.lines)[number]) => string) =>
      r.lines.reduce((a, l) => a + Number(pick(l)), 0).toFixed(2);

    expect(sum((l) => l.taxableValue)).toBe(r.subtotal);
    expect(sum((l) => l.cgstAmount)).toBe(r.cgstTotal);
    expect(Number(r.grandTotal) % 1).toBe(0); // rounded to a whole rupee
  });
});

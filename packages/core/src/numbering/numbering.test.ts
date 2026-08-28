import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERIES_PREFIX,
  formatInvoiceNumber,
  seriesKeyFor,
  seriesKeyString,
  seriesRange,
  validateSeriesShape,
} from './index';

describe('formatInvoiceNumber', () => {
  it('pads to the configured width', () => {
    expect(formatInvoiceNumber({ prefix: 'INV-', padding: 3 }, 7)).toBe('INV-007');
    expect(formatInvoiceNumber({ prefix: '', padding: 4 }, 42)).toBe('0042');
  });

  it('treats padding as a minimum, never truncating', () => {
    // The 1000th invoice of a 3-padded series must not print as '000' —
    // that would duplicate an existing number.
    expect(formatInvoiceNumber({ prefix: 'INV-', padding: 3 }, 1000)).toBe('INV-1000');
    expect(formatInvoiceNumber({ prefix: '', padding: 1 }, 123456)).toBe('123456');
  });

  it('supports no padding and no prefix', () => {
    expect(formatInvoiceNumber({ prefix: '', padding: 0 }, 5)).toBe('5');
  });

  it('never produces the same string for two different numbers', () => {
    const shape = { prefix: 'A/', padding: 4 };
    const seen = new Set<string>();
    for (let n = 1; n <= 20000; n++) {
      const s = formatInvoiceNumber(shape, n);
      expect(seen.has(s)).toBe(false);
      seen.add(s);
    }
  });

  it('rejects zero, negatives and fractions', () => {
    const shape = { prefix: '', padding: 3 };
    expect(() => formatInvoiceNumber(shape, 0)).toThrow(RangeError);
    expect(() => formatInvoiceNumber(shape, -1)).toThrow(RangeError);
    expect(() => formatInvoiceNumber(shape, 1.5)).toThrow(RangeError);
  });
});

describe('series identity', () => {
  it('derives the financial year from the invoice date, not today', () => {
    // Backdating to 31 March must file under the PREVIOUS year's series.
    expect(seriesKeyFor('tax_invoice', '2026-03-31')).toEqual({
      kind: 'tax_invoice',
      fy: '2025-26',
    });
    expect(seriesKeyFor('tax_invoice', '2026-04-01')).toEqual({
      kind: 'tax_invoice',
      fy: '2026-27',
    });
  });

  it('separates each document kind into its own series', () => {
    const date = '2026-06-01';
    const keys = (['tax_invoice', 'estimate', 'delivery_challan'] as const).map((k) =>
      seriesKeyString('biz', seriesKeyFor(k, date)),
    );
    expect(new Set(keys).size).toBe(3);
  });

  it('separates each business', () => {
    const key = seriesKeyFor('tax_invoice', '2026-06-01');
    expect(seriesKeyString('a', key)).not.toBe(seriesKeyString('b', key));
  });

  it('gives non-accounting documents a visibly different prefix', () => {
    // A challan that looks like an invoice will eventually be handed to an
    // auditor as one.
    expect(DEFAULT_SERIES_PREFIX.estimate).not.toBe(DEFAULT_SERIES_PREFIX.tax_invoice);
    expect(DEFAULT_SERIES_PREFIX.delivery_challan).not.toBe(DEFAULT_SERIES_PREFIX.tax_invoice);
    expect(DEFAULT_SERIES_PREFIX.estimate).not.toBe(DEFAULT_SERIES_PREFIX.delivery_challan);
  });
});

describe('validateSeriesShape', () => {
  it('accepts the shapes shops actually use', () => {
    for (const prefix of ['', 'INV-', 'INV/2026/', 'A_', 'GST-INV-']) {
      expect(validateSeriesShape({ prefix, padding: 3 }).valid).toBe(true);
    }
  });

  it('rejects characters that break filenames, URLs and exports', () => {
    for (const prefix of ['IN V', 'INV#', 'INV\\', 'INV?', 'INV%']) {
      expect(validateSeriesShape({ prefix, padding: 3 }).valid).toBe(false);
    }
  });

  it('bounds the prefix length and the padding', () => {
    expect(validateSeriesShape({ prefix: 'X'.repeat(17), padding: 3 }).valid).toBe(false);
    expect(validateSeriesShape({ prefix: '', padding: -1 }).valid).toBe(false);
    expect(validateSeriesShape({ prefix: '', padding: 99 }).valid).toBe(false);
    expect(validateSeriesShape({ prefix: '', padding: 2.5 }).valid).toBe(false);
  });
});

describe('seriesRange', () => {
  it('lists every number issued, for the GSTR-1 documents-issued report', () => {
    expect(seriesRange({ prefix: 'INV-', padding: 3 }, 1, 4)).toEqual([
      'INV-001',
      'INV-002',
      'INV-003',
      'INV-004',
    ]);
  });

  it('is empty when the range is inverted', () => {
    expect(seriesRange({ prefix: '', padding: 3 }, 5, 4)).toEqual([]);
  });
});

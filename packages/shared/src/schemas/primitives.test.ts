import { describe, expect, it } from 'vitest';
import {
  gstinSchema,
  moneySchema,
  percentSchema,
  phoneSchema,
  quantitySchema,
  slugify,
  slugSchema,
  stateCodeSchema,
} from './primitives';

describe('moneySchema', () => {
  it('normalises to two decimal places', () => {
    expect(moneySchema.parse('1200')).toBe('1200.00');
    expect(moneySchema.parse('1200.5')).toBe('1200.50');
  });

  it('strips thousands separators a user typed', () => {
    expect(moneySchema.parse(' 1,20,000.50 ')).toBe('120000.50');
  });

  it('rejects non-numeric input', () => {
    expect(moneySchema.safeParse('abc').success).toBe(false);
  });
});

describe('quantitySchema', () => {
  it('keeps three decimals for kg/litre selling', () => {
    expect(quantitySchema.parse('2.5')).toBe('2.500');
  });
});

describe('percentSchema', () => {
  it('accepts the GST 2.0 slabs', () => {
    for (const rate of ['0', '0.25', '3', '5', '18', '40']) {
      expect(percentSchema.safeParse(rate).success).toBe(true);
    }
  });

  it('rejects above 100', () => {
    expect(percentSchema.safeParse('101').success).toBe(false);
  });
});

describe('gstinSchema', () => {
  it('accepts a well-formed GSTIN', () => {
    expect(gstinSchema.parse('27aaapa1234a1z5')).toBe('27AAAPA1234A1Z5');
  });

  it('rejects wrong length and wrong shape', () => {
    expect(gstinSchema.safeParse('27AAAPA1234A1Z').success).toBe(false);
    expect(gstinSchema.safeParse('27AAAPA1234A1X5').success).toBe(false);
  });
});

describe('stateCodeSchema', () => {
  it('accepts a live code', () => {
    expect(stateCodeSchema.parse('09')).toBe('09');
  });

  it('rejects a retired code', () => {
    expect(stateCodeSchema.safeParse('25').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts formatted Indian mobiles', () => {
    expect(phoneSchema.parse('+91 98765-43210')).toBe('+919876543210');
  });

  it('rejects a number starting below 6', () => {
    expect(phoneSchema.safeParse('1234567890').success).toBe(false);
  });
});

describe('slug', () => {
  it('slugifies a shop name', () => {
    expect(slugify('Sharma Ji ki Dukaan!')).toBe('sharma-ji-ki-dukaan');
  });

  it('validates the slugified result', () => {
    expect(slugSchema.safeParse(slugify('Gupta & Sons Hardware')).success).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  currentFinancialYear,
  financialYear,
  financialYearEnd,
  financialYearStart,
  gstinCheckDigit,
  isValidGstin,
  normaliseGstin,
  panFromGstin,
  parseFinancialYear,
  placeOfSupplyWarning,
  resolvePlaceOfSupply,
  stateCodeFromGstin,
  todayInIndia,
  validateGstin,
} from './index';

/** Real, checksum-valid GSTINs. */
const VALID = ['27AAPFU0939F1ZV', '36AAACH7409R1Z2', '24AAACC1206D1ZM'] as const;

describe('GSTIN checksum', () => {
  it('reproduces the check digit of known-good GSTINs', () => {
    for (const gstin of VALID) {
      expect(gstinCheckDigit(gstin.slice(0, 14))).toBe(gstin[14]);
    }
  });

  it('rejects a GSTIN whose last character was altered', () => {
    // The single most common data-entry error, and the one a shape-only regex
    // would happily wave through.
    for (const gstin of VALID) {
      const wrongChar = gstin[14] === 'A' ? 'B' : 'A';
      const tampered = gstin.slice(0, 14) + wrongChar;
      expect(validateGstin(tampered)).toEqual({ valid: false, reason: 'bad_checksum' });
    }
  });

  it('catches a transposition inside the PAN', () => {
    // 'AAPFU' -> 'AAPUF'. Shape still valid, checksum is not.
    expect(validateGstin('27AAPUF0939F1ZV').valid).toBe(false);
  });

  it('refuses to compute over the wrong length', () => {
    expect(() => gstinCheckDigit('27AAPFU0939F1')).toThrow(RangeError);
  });
});

describe('validateGstin', () => {
  it('accepts and decomposes a valid GSTIN', () => {
    const result = validateGstin('27AAPFU0939F1ZV');
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.parts).toMatchObject({
      stateCode: '27',
      stateName: 'Maharashtra',
      pan: 'AAPFU0939F',
      entityNumber: '1',
      checkDigit: 'V',
    });
  });

  it('normalises lowercase and pasted spaces', () => {
    expect(normaliseGstin(' 27 aapfu0939f1zv ')).toBe('27AAPFU0939F1ZV');
    expect(isValidGstin('27 aapfu 0939f 1zv')).toBe(true);
  });

  it('names the specific problem so the form can be helpful', () => {
    expect(validateGstin('')).toEqual({ valid: false, reason: 'empty' });
    expect(validateGstin('27AAPFU0939F1Z')).toEqual({ valid: false, reason: 'wrong_length' });
    expect(validateGstin('27AAPFU0939F1XV')).toEqual({ valid: false, reason: 'bad_format' });
    expect(validateGstin('99AAPFU0939F1ZV')).toEqual({ valid: false, reason: 'unknown_state' });
  });

  it('accepts a retired state code on an old record', () => {
    // 25 merged into 26 in 2020. Refusing it would block billing a real
    // customer over an administrative reshuffle they had no part in.
    const legacy = '25AAPFU0939F1Z' + gstinCheckDigit('25AAPFU0939F1Z');
    const result = validateGstin(legacy);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.parts.stateCode).toBe('25');
  });

  it('extracts the PAN, so one owner with many GSTINs is recognisable', () => {
    expect(panFromGstin('27AAPFU0939F1ZV')).toBe('AAPFU0939F');
    expect(panFromGstin('not-a-gstin')).toBeUndefined();
  });
});

describe('stateCodeFromGstin', () => {
  it('reads the state without validating the whole thing', () => {
    // Historical invoices must keep resolving even if their GSTIN would fail
    // today's checks.
    expect(stateCodeFromGstin('27AAPFU0939F1ZV')).toBe('27');
    expect(stateCodeFromGstin('09ZZZZZ9999Z9ZZ')).toBe('09');
  });

  it('returns undefined for absent or non-numeric prefixes', () => {
    expect(stateCodeFromGstin(null)).toBeUndefined();
    expect(stateCodeFromGstin('')).toBeUndefined();
    expect(stateCodeFromGstin('AB12345678')).toBeUndefined();
  });
});

describe('place of supply', () => {
  it('uses the party state when recorded', () => {
    expect(resolvePlaceOfSupply({ supplierStateCode: '09', partyStateCode: '27' })).toEqual({
      placeOfSupply: '27',
      isInterstate: true,
      source: 'party_state',
    });
  });

  it('falls back to the GSTIN when no state is recorded', () => {
    expect(
      resolvePlaceOfSupply({ supplierStateCode: '09', partyGstin: '27AAPFU0939F1ZV' }),
    ).toEqual({ placeOfSupply: '27', isInterstate: true, source: 'party_gstin' });
  });

  it('treats an anonymous walk-in as a local sale', () => {
    expect(resolvePlaceOfSupply({ supplierStateCode: '09' })).toEqual({
      placeOfSupply: '09',
      isInterstate: false,
      source: 'supplier_default',
    });
  });

  it('is intrastate when the party is in the same state', () => {
    const r = resolvePlaceOfSupply({ supplierStateCode: '09', partyStateCode: '09' });
    expect(r.isInterstate).toBe(false);
  });

  it('lets an explicit override beat everything', () => {
    // Goods delivered to a site in another state: the destination decides.
    expect(
      resolvePlaceOfSupply({
        supplierStateCode: '09',
        partyStateCode: '09',
        partyGstin: '09AAPFU0939F1ZV',
        override: '27',
      }),
    ).toEqual({ placeOfSupply: '27', isInterstate: true, source: 'override' });
  });

  it('prefers the recorded state over the GSTIN when they disagree', () => {
    const r = resolvePlaceOfSupply({
      supplierStateCode: '09',
      partyStateCode: '06',
      partyGstin: '07AAPFU0939F1ZV',
    });
    expect(r.placeOfSupply).toBe('06');
    expect(r.source).toBe('party_state');
  });

  it('warns about that disagreement without blocking', () => {
    const warning = placeOfSupplyWarning({
      supplierStateCode: '09',
      partyStateCode: '06',
      partyGstin: '07AAPFU0939F1ZV',
    });
    expect(warning).toContain('06');
    expect(warning).toContain('07');
  });

  it('stays quiet when they agree or there is nothing to compare', () => {
    expect(
      placeOfSupplyWarning({
        supplierStateCode: '09',
        partyStateCode: '27',
        partyGstin: '27AAPFU0939F1ZV',
      }),
    ).toBeUndefined();
    expect(
      placeOfSupplyWarning({ supplierStateCode: '09', partyStateCode: '27' }),
    ).toBeUndefined();
  });
});

describe('financial year', () => {
  it('starts on 1 April', () => {
    expect(financialYear('2026-04-01')).toBe('2026-27');
    expect(financialYear('2026-03-31')).toBe('2025-26');
  });

  it('handles the boundary in both directions', () => {
    expect(financialYear('2026-03-31')).toBe('2025-26');
    expect(financialYear('2026-04-01')).toBe('2026-27');
    expect(financialYear('2027-03-31')).toBe('2026-27');
    expect(financialYear('2027-04-01')).toBe('2027-28');
  });

  it('covers every month of a year correctly', () => {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      expect(financialYear(`2026-${mm}-15`)).toBe(m >= 4 ? '2026-27' : '2025-26');
    }
  });

  it('pads the century rollover', () => {
    expect(financialYear('2099-05-01')).toBe('2099-00');
    expect(financialYear('2100-05-01')).toBe('2100-01');
  });

  it('takes a string, not a Date, so timezones cannot shift the year', () => {
    // 2026-04-01 00:30 IST is 2026-03-31 19:00 UTC. A Date would file the
    // year's first invoice under the previous year's series.
    expect(financialYear('2026-04-01')).toBe('2026-27');
    expect(() => financialYear('01/04/2026')).toThrow(TypeError);
    expect(() => financialYear('2026-13-01')).toThrow(RangeError);
  });

  it('round-trips to start and end dates', () => {
    expect(financialYearStart('2026-27')).toBe('2026-04-01');
    expect(financialYearEnd('2026-27')).toBe('2027-03-31');
    expect(financialYear(financialYearStart('2026-27'))).toBe('2026-27');
    expect(financialYear(financialYearEnd('2026-27'))).toBe('2026-27');
  });

  it('rejects a malformed or non-consecutive financial year', () => {
    expect(() => parseFinancialYear('2026')).toThrow(TypeError);
    expect(() => parseFinancialYear('2026-2027')).toThrow(TypeError);
    expect(() => parseFinancialYear('2026-29')).toThrow(RangeError);
  });
});

describe('IST clock helpers', () => {
  it('reports the Indian date, not the UTC one, just after midnight IST', () => {
    // 2026-04-01 00:30 IST === 2026-03-31 19:00 UTC.
    const justAfterMidnightIst = new Date('2026-03-31T19:00:00Z');
    expect(todayInIndia(justAfterMidnightIst)).toBe('2026-04-01');
    expect(currentFinancialYear(justAfterMidnightIst)).toBe('2026-27');
  });

  it('still reports the previous day just before midnight IST', () => {
    const justBefore = new Date('2026-03-31T18:00:00Z'); // 23:30 IST on 31 Mar
    expect(todayInIndia(justBefore)).toBe('2026-03-31');
    expect(currentFinancialYear(justBefore)).toBe('2025-26');
  });
});

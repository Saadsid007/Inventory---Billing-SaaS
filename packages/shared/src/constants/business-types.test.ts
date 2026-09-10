import { describe, expect, it } from 'vitest';
import {
  BUSINESS_PROFILES,
  BUSINESS_TYPES,
  type BusinessType,
  businessProfile,
  isBusinessType,
} from './business-types';
import { PLAN_DEFAULTS } from './subscription';

/**
 * Adding a kind of business is meant to be one entry in a constant.
 *
 * These tests are what makes that true. Every one of them is a thing that was
 * easy to forget when `medical` was added as the third type: a profile with no
 * plan means the pricing page shows a card with no price, a profile whose
 * `home` points nowhere means a new signup lands on a redirect loop, and a
 * type missing from `BUSINESS_TYPES` never reaches the signup picker at all.
 */
describe('business types', () => {
  it('gives every type a profile and a plan', () => {
    for (const type of BUSINESS_TYPES) {
      expect(BUSINESS_PROFILES[type], `${type} has no profile`).toBeDefined();
      expect(PLAN_DEFAULTS[type], `${type} has no plan default`).toBeDefined();
      expect(Number(PLAN_DEFAULTS[type].monthlyPrice)).toBeGreaterThan(0);
      expect(PLAN_DEFAULTS[type].features.length).toBeGreaterThan(0);
    }
  });

  it('sends every type somewhere that exists', () => {
    // Only two homes are built. A third value here means somebody added a
    // profile pointing at routes nobody has written yet.
    const homes = new Set(BUSINESS_TYPES.map((t) => BUSINESS_PROFILES[t].home));
    expect([...homes].sort()).toEqual(['/app', '/app/seva']);
  });

  it('puts a medical store on the shop screens, with its own words', () => {
    const medical = businessProfile('medical');
    // It shares the shop's routes deliberately — it holds stock and bills with
    // GST like any other shop. What differs is the vocabulary.
    expect(medical.home).toBe('/app');
    expect(medical.features.inventory).toBe(true);
    expect(medical.features.gstFields).toBe(true);
    expect(medical.terms.itemPlural).toBe('Medicines');
    expect(medical.terms.itemPlural).not.toBe(BUSINESS_PROFILES.retail.terms.itemPlural);
  });

  it('falls back to a shop rather than to nothing', () => {
    // Every business that existed before this column did was a shop, and an
    // unknown value must never mean "no screens".
    expect(businessProfile(null).home).toBe('/app');
    expect(businessProfile(undefined).home).toBe('/app');
    expect(businessProfile('something-else').home).toBe('/app');
  });

  it('recognises exactly the types it ships', () => {
    for (const type of BUSINESS_TYPES) expect(isBusinessType(type)).toBe(true);
    for (const bad of ['', 'RETAIL', 'salon', 'medical_store']) {
      expect(isBusinessType(bad as BusinessType)).toBe(false);
    }
  });
});

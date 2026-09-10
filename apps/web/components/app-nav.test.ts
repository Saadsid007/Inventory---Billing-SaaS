import { describe, expect, it } from 'vitest';
import { navFor } from './app-nav';

const labels = (type: string) => navFor(type).map((i) => i.label);
const hrefs = (type: string) => navFor(type).map((i) => i.href);

/**
 * The sidebar is the first thing that tells somebody whether this software was
 * built for them, and it is also the easiest thing to get wrong when a business
 * type is added — `navFor` is a single conditional, and a new type falling into
 * the wrong branch shows a Jan Seva Kendra a stock screen or a chemist a work
 * register.
 */
describe('navFor', () => {
  it('gives a medical store the shop screens with a chemist’s words', () => {
    // Same routes as retail — a medical store holds stock and bills with GST,
    // so duplicating those screens to change a noun would be the wrong trade.
    expect(hrefs('medical')).toEqual(hrefs('retail'));
    expect(labels('medical')).toContain('Medicines');
    expect(labels('medical')).not.toContain('Products');
    expect(labels('retail')).toContain('Products');
  });

  it('keeps a Jan Seva Kendra inside its own section', () => {
    // The bug this guards: pointing "Receipts" at the shop's invoice list made
    // the sidebar swap mid-session, with Stock and Categories appearing from
    // nowhere. Everything except the shared billing screen stays under /seva.
    for (const href of hrefs('jan_seva')) {
      expect(href === '/app/billing' || href.startsWith('/app/seva')).toBe(true);
    }
    expect(labels('jan_seva')).not.toContain('Products');
    expect(labels('jan_seva')).not.toContain('Stock in / out');
  });

  it('falls back to the shop for an unknown or missing type', () => {
    // A null in this column must never mean "no navigation".
    expect(hrefs(undefined as unknown as string)).toEqual(hrefs('retail'));
    expect(hrefs('salon')).toEqual(hrefs('retail'));
  });

  it('never repeats an href, which would light up two entries at once', () => {
    for (const type of ['retail', 'jan_seva', 'medical']) {
      const list = hrefs(type);
      expect(new Set(list).size, `${type} has a duplicate href`).toBe(list.length);
    }
  });
});

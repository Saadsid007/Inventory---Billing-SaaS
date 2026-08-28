/**
 * Defaults seeded when a business is created (build spec Phase 1a).
 * These are starting points, not fixed lists — a business edits its own
 * `units`, `categories` and `tax_rates` rows freely after signup.
 */

export type SeedUnit = { name: string; shortName: string };

/**
 * Note on PKT: the spec asks for it, but "PKT" is not an official GST UQC —
 * the portal's equivalent is PAC (Packs). Kept as spec'd because it's the word
 * shopkeepers actually use; swap `shortName` to 'PAC' if GSTR-1 HSN summary
 * rejects it during Phase 2.
 */
export const SEED_UNITS: readonly SeedUnit[] = [
  { name: 'Piece', shortName: 'PCS' },
  { name: 'Kilogram', shortName: 'KGS' },
  { name: 'Gram', shortName: 'GMS' },
  { name: 'Litre', shortName: 'LTR' },
  { name: 'Metre', shortName: 'MTR' },
  { name: 'Box', shortName: 'BOX' },
  { name: 'Packet', shortName: 'PKT' },
  { name: 'Dozen', shortName: 'DOZ' },
] as const;

export type SeedTaxRate = {
  name: string;
  /** Percentage, as a decimal string. Never a JS number. */
  rate: string;
  cessRate: string;
  effectiveFrom: string;
};

/**
 * GST 2.0 slabs, effective 22 Sep 2025 (12% and 28% were removed).
 * Seeded as global rows (`tax_rates.business_id IS NULL`).
 * Never hardcode these anywhere else — spec §3.4.
 */
export const GST_EFFECTIVE_FROM = '2025-09-22';

export const SEED_TAX_RATES: readonly SeedTaxRate[] = [
  { name: 'GST 0%', rate: '0.00', cessRate: '0.00', effectiveFrom: GST_EFFECTIVE_FROM },
  { name: 'GST 0.25%', rate: '0.25', cessRate: '0.00', effectiveFrom: GST_EFFECTIVE_FROM },
  { name: 'GST 3%', rate: '3.00', cessRate: '0.00', effectiveFrom: GST_EFFECTIVE_FROM },
  { name: 'GST 5%', rate: '5.00', cessRate: '0.00', effectiveFrom: GST_EFFECTIVE_FROM },
  { name: 'GST 18%', rate: '18.00', cessRate: '0.00', effectiveFrom: GST_EFFECTIVE_FROM },
  { name: 'GST 40%', rate: '40.00', cessRate: '0.00', effectiveFrom: GST_EFFECTIVE_FROM },
] as const;

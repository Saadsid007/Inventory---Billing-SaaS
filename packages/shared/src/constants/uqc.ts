/**
 * GST Unit Quantity Codes. The `short_name` column on `units` must be one of
 * these for a GSTR-1 HSN summary to be accepted by the GST portal.
 */

export type Uqc = { code: string; label: string };

export const UQC_LIST: readonly Uqc[] = [
  { code: 'BAG', label: 'Bags' },
  { code: 'BAL', label: 'Bale' },
  { code: 'BDL', label: 'Bundles' },
  { code: 'BKL', label: 'Buckles' },
  { code: 'BOU', label: 'Billion of units' },
  { code: 'BOX', label: 'Box' },
  { code: 'BTL', label: 'Bottles' },
  { code: 'BUN', label: 'Bunches' },
  { code: 'CAN', label: 'Cans' },
  { code: 'CBM', label: 'Cubic metres' },
  { code: 'CCM', label: 'Cubic centimetres' },
  { code: 'CMS', label: 'Centimetres' },
  { code: 'CTN', label: 'Cartons' },
  { code: 'DOZ', label: 'Dozens' },
  { code: 'DRM', label: 'Drums' },
  { code: 'GGK', label: 'Great gross' },
  { code: 'GMS', label: 'Grammes' },
  { code: 'GRS', label: 'Gross' },
  { code: 'GYD', label: 'Gross yards' },
  { code: 'KGS', label: 'Kilograms' },
  { code: 'KLR', label: 'Kilolitre' },
  { code: 'KME', label: 'Kilometre' },
  { code: 'LTR', label: 'Litres' },
  { code: 'MLT', label: 'Millilitre' },
  { code: 'MTR', label: 'Metres' },
  { code: 'MTS', label: 'Metric ton' },
  { code: 'NOS', label: 'Numbers' },
  { code: 'PAC', label: 'Packs' },
  { code: 'PCS', label: 'Pieces' },
  { code: 'PRS', label: 'Pairs' },
  { code: 'QTL', label: 'Quintal' },
  { code: 'ROL', label: 'Rolls' },
  { code: 'SET', label: 'Sets' },
  { code: 'SQF', label: 'Square feet' },
  { code: 'SQM', label: 'Square metres' },
  { code: 'SQY', label: 'Square yards' },
  { code: 'TBS', label: 'Tablets' },
  { code: 'TGM', label: 'Ten gross' },
  { code: 'THD', label: 'Thousands' },
  { code: 'TON', label: 'Tonnes' },
  { code: 'TUB', label: 'Tubes' },
  { code: 'UGS', label: 'US gallons' },
  { code: 'UNT', label: 'Units' },
  { code: 'YDS', label: 'Yards' },
  { code: 'OTH', label: 'Others' },
] as const;

const UQC_CODES = new Set(UQC_LIST.map((u) => u.code));

export function isValidUqc(code: string): boolean {
  return UQC_CODES.has(code.toUpperCase());
}

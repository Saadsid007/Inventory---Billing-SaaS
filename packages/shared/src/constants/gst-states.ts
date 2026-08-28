/**
 * GST state codes — the first two digits of a GSTIN, and the value stored in
 * `businesses.state_code`, `parties.state_code` and `invoices.place_of_supply`.
 *
 * Codes 25 (Daman & Diu) and 28 (undivided Andhra Pradesh) are historical and
 * deliberately absent: 25 merged into 26 on 26 Jan 2020, and 28 was replaced by
 * 37 after the 2014 bifurcation. Old invoices may still carry them, so
 * `isKnownStateCode` accepts them for reads while pickers only offer the
 * current list.
 */

export type GstState = {
  code: string;
  name: string;
  /** Union territories charge UTGST rather than SGST. Same rate, different head. */
  isUnionTerritory: boolean;
};

export const GST_STATES: readonly GstState[] = [
  { code: '01', name: 'Jammu and Kashmir', isUnionTerritory: true },
  { code: '02', name: 'Himachal Pradesh', isUnionTerritory: false },
  { code: '03', name: 'Punjab', isUnionTerritory: false },
  { code: '04', name: 'Chandigarh', isUnionTerritory: true },
  { code: '05', name: 'Uttarakhand', isUnionTerritory: false },
  { code: '06', name: 'Haryana', isUnionTerritory: false },
  { code: '07', name: 'Delhi', isUnionTerritory: true },
  { code: '08', name: 'Rajasthan', isUnionTerritory: false },
  { code: '09', name: 'Uttar Pradesh', isUnionTerritory: false },
  { code: '10', name: 'Bihar', isUnionTerritory: false },
  { code: '11', name: 'Sikkim', isUnionTerritory: false },
  { code: '12', name: 'Arunachal Pradesh', isUnionTerritory: false },
  { code: '13', name: 'Nagaland', isUnionTerritory: false },
  { code: '14', name: 'Manipur', isUnionTerritory: false },
  { code: '15', name: 'Mizoram', isUnionTerritory: false },
  { code: '16', name: 'Tripura', isUnionTerritory: false },
  { code: '17', name: 'Meghalaya', isUnionTerritory: false },
  { code: '18', name: 'Assam', isUnionTerritory: false },
  { code: '19', name: 'West Bengal', isUnionTerritory: false },
  { code: '20', name: 'Jharkhand', isUnionTerritory: false },
  { code: '21', name: 'Odisha', isUnionTerritory: false },
  { code: '22', name: 'Chhattisgarh', isUnionTerritory: false },
  { code: '23', name: 'Madhya Pradesh', isUnionTerritory: false },
  { code: '24', name: 'Gujarat', isUnionTerritory: false },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', isUnionTerritory: true },
  { code: '27', name: 'Maharashtra', isUnionTerritory: false },
  { code: '29', name: 'Karnataka', isUnionTerritory: false },
  { code: '30', name: 'Goa', isUnionTerritory: false },
  { code: '31', name: 'Lakshadweep', isUnionTerritory: true },
  { code: '32', name: 'Kerala', isUnionTerritory: false },
  { code: '33', name: 'Tamil Nadu', isUnionTerritory: false },
  { code: '34', name: 'Puducherry', isUnionTerritory: true },
  { code: '35', name: 'Andaman and Nicobar Islands', isUnionTerritory: true },
  { code: '36', name: 'Telangana', isUnionTerritory: false },
  { code: '37', name: 'Andhra Pradesh', isUnionTerritory: false },
  { code: '38', name: 'Ladakh', isUnionTerritory: true },
  { code: '97', name: 'Other Territory', isUnionTerritory: true },
] as const;

/** Retired codes, accepted on read so historical invoices still resolve. */
export const LEGACY_GST_STATE_CODES: Record<string, string> = {
  '25': 'Daman and Diu (merged into 26)',
  '28': 'Andhra Pradesh (pre-bifurcation, now 37)',
};

const STATE_BY_CODE = new Map(GST_STATES.map((s) => [s.code, s]));

export function getGstState(code: string): GstState | undefined {
  return STATE_BY_CODE.get(code);
}

export function getGstStateName(code: string): string | undefined {
  return STATE_BY_CODE.get(code)?.name ?? LEGACY_GST_STATE_CODES[code];
}

/** True for currently-issuable codes only. Use for form validation. */
export function isCurrentStateCode(code: string): boolean {
  return STATE_BY_CODE.has(code);
}

/** True for current or retired codes. Use when reading stored data. */
export function isKnownStateCode(code: string): boolean {
  return STATE_BY_CODE.has(code) || code in LEGACY_GST_STATE_CODES;
}

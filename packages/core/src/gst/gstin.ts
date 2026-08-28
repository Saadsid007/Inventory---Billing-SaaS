import { GST_STATES, LEGACY_GST_STATE_CODES } from '@bahikhata/shared';

/**
 * GSTIN parsing and validation.
 *
 * A GSTIN is 15 characters:
 *
 *   27 AAPFU0939F 1 Z V
 *   ── ────────── ─ ─ ─
 *   │      │      │ │ └─ checksum
 *   │      │      │ └─── always 'Z' (reserved)
 *   │      │      └───── entity number for this PAN in this state (1-9, A-Z)
 *   │      └──────────── the holder's PAN
 *   └─────────────────── state code
 *
 * Getting this wrong matters twice over: the state code decides CGST/SGST vs
 * IGST on every invoice, and a malformed buyer GSTIN makes a GSTR-1 filing
 * bounce months later, long after the invoice was printed and handed over.
 */

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const GSTIN_LENGTH = 15;

/** Structure only. The checksum is verified separately. */
const GSTIN_SHAPE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * The 15th character, computed from the first 14.
 *
 * Weighted mod-36: each character's value is multiplied by an alternating
 * factor of 1 and 2, and BOTH the quotient and remainder of that product
 * divided by 36 are added to the running sum.
 */
export function gstinCheckDigit(first14: string): string {
  if (first14.length !== 14) {
    throw new RangeError('GSTIN check digit needs exactly 14 characters');
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARSET.indexOf(first14[i]!);
    if (value < 0) {
      throw new RangeError(`Invalid GSTIN character at position ${i + 1}: ${first14[i]}`);
    }
    const product = value * ((i % 2) + 1);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36]!;
}

export type GstinParts = {
  gstin: string;
  stateCode: string;
  stateName: string | undefined;
  pan: string;
  /** Nth registration for this PAN in this state. */
  entityNumber: string;
  checkDigit: string;
};

export type GstinValidation =
  | { valid: true; parts: GstinParts }
  | { valid: false; reason: GstinError };

export type GstinError =
  | 'empty'
  | 'wrong_length'
  | 'bad_format'
  | 'unknown_state'
  | 'bad_checksum';

export const GSTIN_ERROR_MESSAGES: Record<GstinError, string> = {
  empty: 'Enter a GSTIN',
  wrong_length: 'A GSTIN is exactly 15 characters',
  bad_format: 'That does not look like a GSTIN',
  unknown_state: 'The first two digits are not a valid state code',
  bad_checksum: 'That GSTIN failed its checksum — please re-check it',
};

/** Uppercase and strip spaces. People paste GSTINs with spaces constantly. */
export function normaliseGstin(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Full validation: shape, state code, and checksum.
 *
 * Legacy state codes (25, 28) are accepted so an old buyer record entered
 * before the 2020 merger still validates — refusing it would block billing a
 * real customer over an administrative reshuffle they had no part in.
 */
export function validateGstin(input: string): GstinValidation {
  const gstin = normaliseGstin(input ?? '');

  if (!gstin) return { valid: false, reason: 'empty' };
  if (gstin.length !== GSTIN_LENGTH) return { valid: false, reason: 'wrong_length' };
  if (!GSTIN_SHAPE.test(gstin)) return { valid: false, reason: 'bad_format' };

  const stateCode = gstin.slice(0, 2);
  const known =
    GST_STATES.some((s) => s.code === stateCode) || stateCode in LEGACY_GST_STATE_CODES;
  if (!known) return { valid: false, reason: 'unknown_state' };

  if (gstinCheckDigit(gstin.slice(0, 14)) !== gstin[14]) {
    return { valid: false, reason: 'bad_checksum' };
  }

  return {
    valid: true,
    parts: {
      gstin,
      stateCode,
      stateName:
        GST_STATES.find((s) => s.code === stateCode)?.name ?? LEGACY_GST_STATE_CODES[stateCode],
      pan: gstin.slice(2, 12),
      entityNumber: gstin[12]!,
      checkDigit: gstin[14]!,
    },
  };
}

export function isValidGstin(input: string): boolean {
  return validateGstin(input).valid;
}

/**
 * State code from a GSTIN, without full validation.
 *
 * Used when reading data that is already stored: a historical invoice must keep
 * resolving its place of supply even if the GSTIN on it would fail today's
 * checks.
 */
export function stateCodeFromGstin(gstin: string | null | undefined): string | undefined {
  if (!gstin) return undefined;
  const code = normaliseGstin(gstin).slice(0, 2);
  return /^\d{2}$/.test(code) ? code : undefined;
}

/** The PAN embedded in a GSTIN. Handy for spotting one business with many GSTINs. */
export function panFromGstin(gstin: string | null | undefined): string | undefined {
  const result = validateGstin(gstin ?? '');
  return result.valid ? result.parts.pan : undefined;
}

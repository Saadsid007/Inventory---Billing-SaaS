import { stateCodeFromGstin } from './gstin';

/**
 * Place of supply. Build spec §5.2.
 *
 * This one boolean decides whether an invoice carries IGST or CGST+SGST. Get it
 * wrong and the tax is paid to the wrong government — which is not something a
 * later edit fixes quietly, because the invoice has already been handed to a
 * customer who claimed input credit against it.
 */

export type PlaceOfSupplyInput = {
  /** The business's own state code. Snapshotted onto the invoice. */
  supplierStateCode: string;
  /** The party's state, where recorded. The most reliable signal. */
  partyStateCode?: string | null | undefined;
  /** The party's GSTIN. Its first two digits are the fallback. */
  partyGstin?: string | null | undefined;
  /**
   * Explicit override. A shopkeeper billing a Delhi customer for goods
   * delivered to a Mumbai site must be able to say so — the destination decides
   * place of supply, not the buyer's registered address.
   */
  override?: string | null | undefined;
};

export type PlaceOfSupply = {
  placeOfSupply: string;
  isInterstate: boolean;
  /** Where the answer came from. Surfaced in the UI so the user can correct it. */
  source: 'override' | 'party_state' | 'party_gstin' | 'supplier_default';
};

/**
 * Resolve the place of supply, in priority order:
 *
 *   1. an explicit override
 *   2. the party's recorded state
 *   3. the state embedded in the party's GSTIN
 *   4. the supplier's own state
 *
 * Step 4 is the unregistered walk-in case: someone buying over the counter with
 * no GSTIN and no address on file is, by default, a local sale.
 */
export function resolvePlaceOfSupply(input: PlaceOfSupplyInput): PlaceOfSupply {
  const supplier = input.supplierStateCode;

  const resolved: { code: string; source: PlaceOfSupply['source'] } = input.override
    ? { code: input.override, source: 'override' }
    : input.partyStateCode
      ? { code: input.partyStateCode, source: 'party_state' }
      : (() => {
          const fromGstin = stateCodeFromGstin(input.partyGstin);
          return fromGstin
            ? ({ code: fromGstin, source: 'party_gstin' } as const)
            : ({ code: supplier, source: 'supplier_default' } as const);
        })();

  return {
    placeOfSupply: resolved.code,
    isInterstate: resolved.code !== supplier,
    source: resolved.source,
  };
}

/**
 * A party's state and their GSTIN disagreeing is worth showing the user.
 *
 * Usually it means someone mistyped, but it is legitimately possible — a buyer
 * registered in Delhi taking delivery in Haryana. Never block on it; the
 * recorded state wins and the user gets told why.
 */
export function placeOfSupplyWarning(input: PlaceOfSupplyInput): string | undefined {
  const fromGstin = stateCodeFromGstin(input.partyGstin);
  if (!fromGstin || !input.partyStateCode) return undefined;
  if (fromGstin === input.partyStateCode) return undefined;
  return `The party's state (${input.partyStateCode}) does not match their GSTIN (${fromGstin}). Using ${input.partyStateCode}.`;
}

import type { InvoiceKind, TaxMode } from '@billwise/shared';
import { financialYear } from '../gst/financial-year';
import { resolvePlaceOfSupply } from '../gst/place-of-supply';
import { computeInvoice } from '../tax/engine';
import type { TaxLineInput } from '../tax/types';

/**
 * Turn what a user typed into a complete, storable invoice. Build spec §5.2,
 * §5.3 and §5.1.
 *
 * Still a pure function — no database, no clock. It is the single place that
 * knows how the three engines fit together, which means a route handler never
 * has to, and the whole composition is testable without any infrastructure.
 *
 * The output field names match the `invoices` and `invoice_lines` columns, so
 * a repository can write it straight through without re-deriving anything.
 */

export type BuildInvoiceInput = {
  kind: InvoiceKind;
  invoiceDate: string;
  taxMode: TaxMode;

  /** The business's own state. Snapshotted onto the invoice. */
  supplierStateCode: string;
  partyStateCode?: string | null | undefined;
  partyGstin?: string | null | undefined;
  /** User override of place of supply. Wins over everything. */
  placeOfSupplyOverride?: string | null | undefined;

  otherCharges?: string | undefined;

  lines: readonly {
    productId?: string | null | undefined;
    name: string;
    hsnCode?: string | null | undefined;
    unit?: string | null | undefined;
    qty: string;
    rate: string;
    discountPct?: string | undefined;
    discountAmount?: string | undefined;
    taxRate: string;
    cessRate?: string | undefined;
  }[];
};

export type BuiltInvoice = {
  fy: string;
  placeOfSupply: string;
  isInterstate: boolean;
  placeOfSupplySource: 'override' | 'party_state' | 'party_gstin' | 'supplier_default';

  subtotal: string;
  discountTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  cessTotal: string;
  otherCharges: string;
  roundOff: string;
  grandTotal: string;

  lines: {
    productId: string | null;
    name: string;
    hsnCode: string | null;
    unit: string | null;
    qty: string;
    rate: string;
    discountPct: string;
    discountAmount: string;
    taxableValue: string;
    taxRate: string;
    cessRate: string;
    cgstAmount: string;
    sgstAmount: string;
    igstAmount: string;
    cessAmount: string;
    lineTotal: string;
  }[];
};

export function buildInvoice(input: BuildInvoiceInput): BuiltInvoice {
  // 1. Where is this supplied? Decides IGST vs CGST/SGST for everything below.
  const pos = resolvePlaceOfSupply({
    supplierStateCode: input.supplierStateCode,
    partyStateCode: input.partyStateCode,
    partyGstin: input.partyGstin,
    override: input.placeOfSupplyOverride,
  });

  // 2. The financial year comes from the INVOICE DATE, never from today —
  //    backdating to 31 March must file under the previous year's series.
  const fy = financialYear(input.invoiceDate);

  // 3. Tax.
  const taxLines: TaxLineInput[] = input.lines.map((l) => ({
    qty: l.qty,
    rate: l.rate,
    discountPct: l.discountPct,
    discountAmount: l.discountAmount,
    taxRate: l.taxRate,
    cessRate: l.cessRate,
  }));

  const totals = computeInvoice({
    kind: input.kind,
    taxMode: input.taxMode,
    isInterstate: pos.isInterstate,
    lines: taxLines,
    otherCharges: input.otherCharges,
  });

  return {
    fy,
    placeOfSupply: pos.placeOfSupply,
    isInterstate: pos.isInterstate,
    placeOfSupplySource: pos.source,

    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    cgstTotal: totals.cgstTotal,
    sgstTotal: totals.sgstTotal,
    igstTotal: totals.igstTotal,
    cessTotal: totals.cessTotal,
    otherCharges: totals.otherCharges,
    roundOff: totals.roundOff,
    grandTotal: totals.grandTotal,

    lines: input.lines.map((l, i) => {
      const computed = totals.lines[i]!;
      return {
        productId: l.productId ?? null,
        name: l.name,
        hsnCode: l.hsnCode ?? null,
        unit: l.unit ?? null,
        qty: l.qty,
        rate: l.rate,
        discountPct: l.discountPct ?? '0',
        discountAmount: computed.discountAmount,
        taxableValue: computed.taxableValue,
        taxRate: computed.taxRate,
        cessRate: computed.cessRate,
        cgstAmount: computed.cgstAmount,
        sgstAmount: computed.sgstAmount,
        igstAmount: computed.igstAmount,
        cessAmount: computed.cessAmount,
        lineTotal: computed.lineTotal,
      };
    }),
  };
}

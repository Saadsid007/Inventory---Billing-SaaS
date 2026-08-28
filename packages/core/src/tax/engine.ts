import { TAXABLE_INVOICE_KINDS } from '@bahikhata/shared';
import { D, MONEY_DP, ZERO_MONEY, dec, money, roundToRupee } from '../money';
import type { InvoiceTaxInput, InvoiceTaxResult, TaxLineInput, TaxLineResult } from './types';

/**
 * The tax engine. Build spec §5.3.
 *
 * A pure function: plain data in, plain data out, no database, no clock, no
 * config. That is what lets it be tested exhaustively in milliseconds — and it
 * has to be, because if this is wrong then every invoice ever issued is wrong
 * and nobody finds out until a CA calls.
 *
 * Rounding is half-up at every step, matching how Indian invoices are printed.
 */

/** Rate at which a line carries no tax. */
const ZERO_RATE = '0';

function resolveDiscount(gross: ReturnType<typeof dec>, line: TaxLineInput) {
  // An absolute amount beats a percentage: it is the number the shopkeeper
  // actually agreed with the customer.
  if (line.discountAmount !== undefined && line.discountAmount !== '') {
    return dec(line.discountAmount);
  }
  if (line.discountPct !== undefined && line.discountPct !== '') {
    return gross.times(dec(line.discountPct)).dividedBy(100);
  }
  return new D(0);
}

/**
 * One invoice line.
 *
 * `applyTax` is false for cash memos and bills of supply — those record a place
 * of supply but charge no GST (spec §5.2).
 */
export function computeLine(
  line: TaxLineInput,
  opts: { isInterstate: boolean; inclusive: boolean; applyTax: boolean },
): TaxLineResult {
  const taxRate = opts.applyTax ? dec(line.taxRate) : dec(ZERO_RATE);
  const cessRate = opts.applyTax ? dec(line.cessRate ?? ZERO_RATE) : dec(ZERO_RATE);

  const grossRaw = dec(line.qty).times(dec(line.rate));

  let discount = resolveDiscount(grossRaw, line);

  // A discount larger than the line itself is a data-entry error. Clamping is
  // the conservative reading: a negative taxable value would produce negative
  // GST on a sale, which is not a thing — that is what a credit note is for
  // (Phase 2). The line simply goes to zero.
  if (discount.greaterThan(grossRaw)) {
    discount = grossRaw;
  }
  if (discount.isNegative()) {
    discount = new D(0);
  }

  const netRaw = grossRaw.minus(discount);

  /**
   * Inclusive mode: the entered rate already contains tax and cess, so strip
   * them back out.
   *
   *   P = T + T·r/100 + T·c/100  ⇒  T = P · 100 / (100 + r + c)
   *
   * NOTE: the spec's formula is `P · 100 / (100 + r)`, omitting cess. That is
   * correct only when cess is zero — which is almost always, so the two agree
   * in practice. With a cess it would leave the grand total short of the price
   * the shopkeeper typed, defeating the entire point of inclusive mode. The
   * divisor here generalises the spec's version rather than contradicting it.
   */
  const taxableValue = opts.inclusive
    ? netRaw
        .times(100)
        .dividedBy(dec(100).plus(taxRate).plus(cessRate))
        .toDecimalPlaces(MONEY_DP)
    : netRaw.toDecimalPlaces(MONEY_DP);

  const tax = taxableValue.times(taxRate).dividedBy(100).toDecimalPlaces(MONEY_DP);
  const cess = taxableValue.times(cessRate).dividedBy(100).toDecimalPlaces(MONEY_DP);

  let cgst = new D(0);
  let sgst = new D(0);
  let igst = new D(0);

  if (opts.isInterstate) {
    igst = tax;
  } else {
    // Halve the ALREADY-ROUNDED total and give the remainder to SGST, rather
    // than rounding each half independently. On an odd number of paise —
    // ₹0.05 of tax, say — two independent roundings would give 0.03 + 0.03 and
    // the invoice would not add up. This way cgst + sgst === tax, exactly.
    cgst = tax.dividedBy(2).toDecimalPlaces(MONEY_DP);
    sgst = tax.minus(cgst);
  }

  const lineTotal = taxableValue.plus(tax).plus(cess);

  return {
    gross: money(grossRaw),
    discountAmount: money(discount),
    taxableValue: money(taxableValue),
    taxRate: taxRate.toFixed(2),
    cessRate: cessRate.toFixed(2),
    cgstAmount: money(cgst),
    sgstAmount: money(sgst),
    igstAmount: money(igst),
    cessAmount: money(cess),
    lineTotal: money(lineTotal),
  };
}

/**
 * A whole invoice.
 *
 * Totals are summed from the ALREADY-ROUNDED line values, not recomputed from
 * the raw inputs. The printed invoice shows the line figures, so the totals
 * must be the sum of exactly those — a total that disagrees with its own column
 * by a paisa is the kind of thing customers notice and accountants reject.
 */
export function computeInvoice(input: InvoiceTaxInput): InvoiceTaxResult {
  const applyTax = TAXABLE_INVOICE_KINDS.includes(input.kind);
  const inclusive = input.taxMode === 'inclusive';

  const lines = input.lines.map((line) =>
    computeLine(line, { isInterstate: input.isInterstate, inclusive, applyTax }),
  );

  const sum = (pick: (l: TaxLineResult) => string) =>
    lines.reduce((acc, l) => acc.plus(dec(pick(l))), new D(0));

  const subtotal = sum((l) => l.taxableValue);
  const discountTotal = sum((l) => l.discountAmount);
  const cgstTotal = sum((l) => l.cgstAmount);
  const sgstTotal = sum((l) => l.sgstAmount);
  const igstTotal = sum((l) => l.igstAmount);
  const cessTotal = sum((l) => l.cessAmount);
  const otherCharges = dec(input.otherCharges ?? ZERO_MONEY);

  const preRound = subtotal
    .plus(cgstTotal)
    .plus(sgstTotal)
    .plus(igstTotal)
    .plus(cessTotal)
    .plus(otherCharges);

  const grandTotal = dec(roundToRupee(preRound));
  const roundOff = grandTotal.minus(preRound);

  return {
    lines,
    subtotal: money(subtotal),
    discountTotal: money(discountTotal),
    cgstTotal: money(cgstTotal),
    sgstTotal: money(sgstTotal),
    igstTotal: money(igstTotal),
    cessTotal: money(cessTotal),
    otherCharges: money(otherCharges),
    preRound: money(preRound),
    roundOff: money(roundOff),
    grandTotal: money(grandTotal),
  };
}

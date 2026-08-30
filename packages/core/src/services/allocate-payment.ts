import type { PaymentMethod } from '@billwise/shared';
import { dec, money } from '../money';

/**
 * Spreading one payment across several open bills, and across the ways it was
 * actually handed over. Oldest bill first.
 *
 * ## The problem this solves
 *
 * A credit customer does not pay bill by bill. They come in on Friday, settle
 * ₹50,000 against nine open bills, and hand it over as ₹20,000 cash, a ₹25,000
 * cheque and the rest on UPI. Recording that as nine separate payments, each
 * split three ways, is both tedious and the sort of arithmetic people get wrong
 * at a busy counter.
 *
 * So there are two dimensions here, and they are genuinely independent:
 *
 *   - **tenders** — how the money arrived (cash, UPI, cheque, …)
 *   - **allocations** — which bill each rupee paid off
 *
 * Every stored payment row needs both: the invoice, so the bill can be marked
 * paid, and the method, so the day's cash-versus-bank reconciliation works. A
 * payment recorded as "₹50,000, method: cash" when ₹25,000 of it was a cheque
 * makes the cash drawer wrong every single time.
 *
 * ## Why oldest first
 *
 * This is what shops already do, and what the law assumes when nobody says
 * otherwise: money pays down the oldest debt. It also keeps ageing honest —
 * under any other order a customer who pays regularly could still show bills
 * sitting open for months.
 *
 * Order is decided by the CALLER, not here. This function trusts the arrays it
 * is given, so the same code can serve "oldest first" today and a hand-picked
 * order later without the rule being buried in a loop.
 *
 * ## Why it is a pure function
 *
 * The split has to be shown on screen before it is saved — nobody should be
 * asked to approve an allocation they cannot see. That means the same
 * arithmetic runs in the browser for the preview and on the server for the
 * write, and the only way those can be guaranteed to agree is if they are
 * literally the same function.
 */

export type OpenInvoice = {
  id: string;
  invoiceNo: string | null;
  invoiceDate: string;
  /** Still owed on this bill: grand total minus what has already been paid. */
  due: string;
};

/** One way the money came in. A payment can have several. */
export type Tender = {
  method: PaymentMethod;
  amount: string;
  /** Cheque number, UPI reference. Carried onto every row this tender funds. */
  reference?: string | null;
};

/** A slice of one tender, applied to one bill. Becomes one `payments` row. */
export type AllocationPart = {
  method: PaymentMethod;
  amount: string;
  reference: string | null;
};

export type Allocation = {
  invoiceId: string;
  invoiceNo: string | null;
  invoiceDate: string;
  /** Total going to this bill, across every method. */
  amount: string;
  /** What was owed before this payment. */
  dueBefore: string;
  /** What is still owed after it. Zero means the bill is now settled. */
  dueAfter: string;
  /** Which tender(s) this came out of. Sums to `amount`. */
  parts: AllocationPart[];
};

export type PaymentAllocation = {
  allocations: Allocation[];
  /**
   * Money left over once every open bill is settled, still split by method.
   *
   * Not an error: customers pay advances, and round up to the nearest note far
   * more often than they pay to the paisa. It is recorded against the party
   * with no invoice, so it sits as credit and comes off their next bill.
   */
  unallocatedParts: AllocationPart[];
  unallocated: string;
  /** Total actually put against bills. */
  allocated: string;
  /** Everything handed over. `allocated + unallocated`. */
  total: string;
};

/**
 * Split the tenders across the invoices, in the order both are given.
 *
 * Each bill takes the smaller of what it is owed and what is left, drawing from
 * the tenders in turn — so a bill can be paid partly in cash and partly by
 * cheque, and a cheque can spill over onto the next bill. That is exactly what
 * happens in practice, and pretending otherwise is what forces a shopkeeper to
 * fudge the method.
 */
export function allocatePayment(input: {
  tenders: readonly Tender[];
  invoices: readonly OpenInvoice[];
}): PaymentAllocation {
  // A working copy: each tender with however much of it is still unspent.
  const queue = input.tenders
    .map((t) => ({
      method: t.method,
      reference: t.reference ?? null,
      left: dec(t.amount),
    }))
    .filter((t) => t.left.greaterThan(0));

  const total = queue.reduce((sum, t) => sum.plus(t.left), dec(0));

  const allocations: Allocation[] = [];
  let cursor = 0;

  for (const invoice of input.invoices) {
    if (cursor >= queue.length) break;

    const due = dec(invoice.due);
    // A bill with nothing owing should not have been passed in, but taking
    // money against it would silently overpay it rather than moving on.
    if (due.lessThanOrEqualTo(0)) continue;

    let need = due;
    const parts: AllocationPart[] = [];

    while (need.greaterThan(0) && cursor < queue.length) {
      const tender = queue[cursor]!;
      const take = tender.left.lessThanOrEqualTo(need) ? tender.left : need;

      if (take.greaterThan(0)) {
        parts.push({
          method: tender.method,
          amount: money(take),
          reference: tender.reference,
        });
        tender.left = tender.left.minus(take);
        need = need.minus(take);
      }

      if (tender.left.lessThanOrEqualTo(0)) cursor += 1;
    }

    if (parts.length === 0) continue;

    const applied = parts.reduce((sum, p) => sum.plus(dec(p.amount)), dec(0));
    allocations.push({
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      amount: money(applied),
      dueBefore: money(due),
      dueAfter: money(due.minus(applied)),
      parts,
    });
  }

  // Whatever the bills did not absorb, still labelled with how it arrived.
  const unallocatedParts: AllocationPart[] = queue
    .slice(cursor)
    .filter((t) => t.left.greaterThan(0))
    .map((t) => ({ method: t.method, amount: money(t.left), reference: t.reference }));

  const allocated = allocations.reduce((sum, a) => sum.plus(dec(a.amount)), dec(0));
  const unallocated = unallocatedParts.reduce((sum, p) => sum.plus(dec(p.amount)), dec(0));

  return {
    allocations,
    unallocatedParts,
    unallocated: money(unallocated),
    allocated: money(allocated),
    total: money(total),
  };
}

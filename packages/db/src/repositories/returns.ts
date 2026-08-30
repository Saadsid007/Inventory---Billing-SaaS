import type { TenantCtx } from '@billwise/shared';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { salesReturnLines, salesReturns } from '../schema/index';
import { recordMovement } from './stock';

/**
 * Sales returns. Build spec §5.4 in spirit: stock only ever moves through the
 * ledger, never by writing `current_stock` directly.
 *
 * A return is a document of its own rather than an edit of the bill. The
 * original invoice was printed and handed over; quietly changing its quantities
 * afterwards would leave the paper and the database disagreeing, with no record
 * that anything came back.
 */

export type ReturnLineInput = {
  productId: string | null;
  invoiceLineId: string | null;
  name: string;
  qty: string;
  rate: string;
  amount: string;
  hsnCode: string | null;
  taxRate: string;
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  /** False for damaged goods, which come off the bill but never back on a shelf. */
  restock: boolean;
};

export type RecordReturnInput = {
  invoiceId: string | null;
  partyId: string | null;
  returnDate: string;
  reason?: string | undefined;
  note?: string | undefined;
  lines: readonly ReturnLineInput[];
};

/**
 * One transaction: the return, its lines, and the stock going back.
 *
 * All or nothing, deliberately. A half-written return that put stock back
 * without crediting the customer, or credited them without the stock, is worse
 * than a failed save the shopkeeper can retry.
 */
export async function recordSalesReturn(
  ctx: TenantCtx,
  input: RecordReturnInput,
): Promise<{ returnId: string; total: string }> {
  const total = input.lines
    .reduce((sum, line) => sum + Number(line.amount), 0)
    .toFixed(2);

  return getDb().transaction(async (tx) => {
    const [head] = await tx
      .insert(salesReturns)
      .values({
        businessId: ctx.businessId,
        invoiceId: input.invoiceId,
        partyId: input.partyId,
        returnDate: input.returnDate,
        totalAmount: total,
        reason: input.reason ?? null,
        note: input.note ?? null,
        createdBy: ctx.userId,
      })
      .returning({ id: salesReturns.id });

    if (!head) throw new Error('Could not create the return.');

    for (const line of input.lines) {
      await tx.insert(salesReturnLines).values({
        returnId: head.id,
        businessId: ctx.businessId,
        productId: line.productId,
        invoiceLineId: line.invoiceLineId,
        name: line.name,
        qty: line.qty,
        rate: line.rate,
        amount: line.amount,
        hsnCode: line.hsnCode,
        taxRate: line.taxRate,
        taxableValue: line.taxableValue,
        cgstAmount: line.cgstAmount,
        sgstAmount: line.sgstAmount,
        igstAmount: line.igstAmount,
        cessAmount: line.cessAmount,
        restock: line.restock ? 'yes' : 'no',
      });

      // Positive: goods coming back in. `recordMovement` skips products with
      // tracking off, so a service line simply records no movement.
      if (line.restock && line.productId) {
        await recordMovement(ctx, tx, {
          productId: line.productId,
          qtyChange: line.qty,
          reason: 'sale_return',
          refType: 'sales_return',
          refId: head.id,
          note: input.reason ?? null,
        });
      }
    }

    return { returnId: head.id, total };
  });
}

export type SalesReturnRow = {
  id: string;
  returnDate: string;
  totalAmount: string;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  lines: {
    id: string;
    invoiceLineId: string | null;
    name: string;
    qty: string;
    rate: string;
    amount: string;
    restock: string;
  }[];
};

/** Everything returned against one invoice, so the bill can show it. */
export async function listReturnsForInvoice(
  ctx: TenantCtx,
  invoiceId: string,
): Promise<SalesReturnRow[]> {
  const heads = await getDb()
    .select({
      id: salesReturns.id,
      returnDate: salesReturns.returnDate,
      totalAmount: salesReturns.totalAmount,
      reason: salesReturns.reason,
      note: salesReturns.note,
      createdAt: salesReturns.createdAt,
    })
    .from(salesReturns)
    .where(
      and(eq(salesReturns.businessId, ctx.businessId), eq(salesReturns.invoiceId, invoiceId)),
    )
    .orderBy(desc(salesReturns.createdAt));

  if (heads.length === 0) return [];

  const lines = await getDb()
    .select({
      id: salesReturnLines.id,
      returnId: salesReturnLines.returnId,
      invoiceLineId: salesReturnLines.invoiceLineId,
      name: salesReturnLines.name,
      qty: salesReturnLines.qty,
      rate: salesReturnLines.rate,
      amount: salesReturnLines.amount,
      restock: salesReturnLines.restock,
    })
    .from(salesReturnLines)
    .where(eq(salesReturnLines.businessId, ctx.businessId));

  return heads.map((head) => ({
    ...head,
    lines: lines.filter((l) => l.returnId === head.id).map(({ returnId: _, ...rest }) => rest),
  }));
}

export type ReturnListRow = {
  id: string;
  returnDate: string;
  totalAmount: string;
  reason: string | null;
  partyName: string | null;
  invoiceNo: string | null;
  itemCount: number;
  qtyTotal: string;
};

/** The returns register: every return, newest first. */
export async function listSalesReturns(ctx: TenantCtx, limit = 200) {
  const { sql } = await import('drizzle-orm');
  const rows = await getDb().execute<ReturnListRow>(sql`
    select r.id::text as "id",
           r.return_date as "returnDate",
           r.total_amount::text as "totalAmount",
           r.reason,
           p.name as "partyName",
           i.invoice_no as "invoiceNo",
           (select count(*) from sales_return_lines l where l.return_id = r.id)::int
             as "itemCount",
           coalesce((select sum(l.qty) from sales_return_lines l where l.return_id = r.id), 0)
             ::numeric(12,3)::text as "qtyTotal"
    from sales_returns r
    left join parties p on p.id = r.party_id
    left join invoices i on i.id = r.invoice_id
    where r.business_id = ${ctx.businessId}::uuid
    order by r.return_date desc, r.created_at desc
    limit ${limit}
  `);
  return [...rows];
}

export type ReturnsSummaryRow = {
  date: string;
  returnCount: number;
  taxableValue: string;
  taxTotal: string;
  grandTotal: string;
};

/**
 * Returns per day, for the reports page.
 *
 * Mirrors `getSalesSummary` column for column on purpose: the two are read
 * side by side, and net sales is one minus the other.
 */
export async function getReturnsSummary(
  ctx: TenantCtx,
  range: { from: string; to: string },
): Promise<ReturnsSummaryRow[]> {
  const { sql } = await import('drizzle-orm');
  const rows = await getDb().execute<ReturnsSummaryRow>(sql`
    select r.return_date as "date",
           count(distinct r.id)::int as "returnCount",
           coalesce(sum(l.taxable_value), 0)::numeric(12,2)::text as "taxableValue",
           coalesce(sum(l.cgst_amount + l.sgst_amount + l.igst_amount + l.cess_amount), 0)
             ::numeric(12,2)::text as "taxTotal",
           -- Line amounts, not r.total_amount: the join to lines would
           -- multiply the head total by the number of lines on it.
           coalesce(sum(l.amount), 0)::numeric(12,2)::text as "grandTotal"
    from sales_returns r
    left join sales_return_lines l on l.return_id = r.id
    where r.business_id = ${ctx.businessId}::uuid
      and r.return_date between ${range.from} and ${range.to}
    group by r.return_date
    order by r.return_date
  `);
  return [...rows];
}

export type ReturnExportRow = {
  returnDate: string;
  invoiceNo: string | null;
  invoiceDate: string | null;
  partyName: string | null;
  partyPhone: string | null;
  partyGstin: string | null;
  partyAddress: string | null;
  placeOfSupply: string | null;
  isInterstate: boolean | null;
  itemName: string;
  hsnCode: string | null;
  qty: string;
  rate: string;
  taxRate: string;
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  amount: string;
  restock: string;
  reason: string | null;
};

/**
 * One row per returned item, for the accountant.
 *
 * Line level, with HSN, rate and the tax split, because that is the grain at
 * which net taxable sales is worked out. A summary total is not something a CA
 * can reconcile against GSTR-1.
 */
export async function listReturnLinesForExport(
  ctx: TenantCtx,
  range?: { from: string; to: string },
): Promise<ReturnExportRow[]> {
  const { sql } = await import('drizzle-orm');
  const rows = await getDb().execute<ReturnExportRow>(sql`
    select r.return_date as "returnDate",
           i.invoice_no as "invoiceNo",
           i.invoice_date::text as "invoiceDate",
           coalesce(p.name, i.party_name) as "partyName",
           coalesce(i.party_phone, p.phone) as "partyPhone",
           i.party_gstin as "partyGstin",
           coalesce(i.party_address, p.city) as "partyAddress",
           -- A return can exist without a bill, in which case there is no
           -- snapshot to read and the party's own state is the best answer.
           coalesce(i.place_of_supply, p.state_code) as "placeOfSupply",
           i.is_interstate as "isInterstate",
           l.name as "itemName",
           l.hsn_code as "hsnCode",
           l.qty::text as "qty",
           l.rate::text as "rate",
           l.tax_rate::text as "taxRate",
           l.taxable_value::text as "taxableValue",
           l.cgst_amount::text as "cgstAmount",
           l.sgst_amount::text as "sgstAmount",
           l.igst_amount::text as "igstAmount",
           l.cess_amount::text as "cessAmount",
           l.amount::text as "amount",
           l.restock,
           r.reason
    from sales_return_lines l
    join sales_returns r on r.id = l.return_id
    left join invoices i on i.id = r.invoice_id
    left join parties p on p.id = r.party_id
    where r.business_id = ${ctx.businessId}::uuid
      ${range ? sql`and r.return_date between ${range.from} and ${range.to}` : sql``}
    order by r.return_date desc, r.created_at desc
    limit 5000
  `);
  return [...rows];
}

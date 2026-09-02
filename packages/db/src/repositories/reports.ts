import type { TenantCtx } from '@billwise/shared';
import { sql } from 'drizzle-orm';
import { getDb, type Executor } from '../client';

/**
 * Dashboard figures and reports. Build spec Phase 1g.
 *
 * Every sum runs in Postgres `numeric` and comes back as a string. Adding up a
 * month of invoices in JavaScript floats is exactly how a "total sales" figure
 * ends up a rupee off the sum of its own rows — which is the one number a
 * shopkeeper will check by hand.
 *
 * Cancelled invoices are excluded everywhere, and so are estimates and delivery
 * challans: a quotation is not a sale.
 */

/** Only these count as revenue. Drafts have not happened; the rest are not sales. */
const SALES_FILTER = sql`
  status = 'issued' and kind not in ('estimate', 'delivery_challan')
`;

export type DashboardStats = {
  salesToday: string;
  salesThisMonth: string;
  invoicesToday: number;
  invoicesThisMonth: number;
  totalOutstanding: string;
  lowStockCount: number;
  productCount: number;
  partyCount: number;
};

/**
 * The five numbers on the dashboard, in one round trip.
 *
 * Dates are compared in IST, not UTC. A shop billing at 11pm would otherwise
 * see those sales land on "tomorrow", which looks like the app losing money.
 */
export async function getDashboardStats(
  ctx: TenantCtx,
  tx: Executor = getDb(),
): Promise<DashboardStats> {
  const [row] = await tx.execute<{
    sales_today: string;
    sales_month: string;
    invoices_today: number;
    invoices_month: number;
    outstanding: string;
    low_stock: number;
    products: number;
    parties: number;
  }>(sql`
    with ist as (
      select (now() at time zone 'Asia/Kolkata')::date as today
    ),
    sales as (
      select
        coalesce(sum(grand_total) filter (
          where invoice_date = (select today from ist)), 0)::numeric(12,2) as sales_today,
        coalesce(sum(grand_total) filter (
          where invoice_date >= date_trunc('month', (select today from ist))
            and invoice_date <= (select today from ist)), 0)::numeric(12,2) as sales_month,
        count(*) filter (where invoice_date = (select today from ist))::int as invoices_today,
        count(*) filter (
          where invoice_date >= date_trunc('month', (select today from ist))
            and invoice_date <= (select today from ist))::int as invoices_month
      from invoices
      where business_id = ${ctx.businessId}::uuid and ${SALES_FILTER}
    ),
    -- Must stay the same arithmetic as listPartyBalances() in parties.ts.
    -- Two places computing "who owes us" from different formulas is worse than
    -- either being wrong on its own: the dashboard and the khata disagree, and
    -- a shopkeeper has no way to tell which one to believe.
    owed as (
      select coalesce(sum(
        p.opening_balance
        + coalesce((select sum(i.grand_total) from invoices i
                    where i.party_id = p.id and ${SALES_FILTER}), 0)
        - coalesce((select sum(case when pay.direction = 'in' then pay.amount else -pay.amount end)
                    from payments pay where pay.party_id = p.id), 0)
        -- Returned goods reduce what a customer owes exactly like a payment
        -- does, without any money having moved. Leaving them out overstates
        -- the figure by the whole value of every return ever recorded.
        - coalesce((select sum(sr.total_amount) from sales_returns sr
                    where sr.party_id = p.id), 0)
      ), 0)::numeric(12,2) as outstanding
      from parties p
      where p.business_id = ${ctx.businessId}::uuid and p.is_active = true
    ),
    stock as (
      select
        count(*) filter (
          where low_stock_alert is not null
            and track_inventory = true
            and current_stock <= low_stock_alert)::int as low_stock,
        count(*)::int as products
      from products
      where business_id = ${ctx.businessId}::uuid and is_active = true
    ),
    people as (
      select count(*)::int as parties from parties
      where business_id = ${ctx.businessId}::uuid and is_active = true
    )
    select sales.sales_today::text, sales.sales_month::text,
           sales.invoices_today, sales.invoices_month,
           owed.outstanding::text, stock.low_stock, stock.products, people.parties
    from sales, owed, stock, people
  `);

  return {
    salesToday: row?.sales_today ?? '0.00',
    salesThisMonth: row?.sales_month ?? '0.00',
    invoicesToday: row?.invoices_today ?? 0,
    invoicesThisMonth: row?.invoices_month ?? 0,
    totalOutstanding: row?.outstanding ?? '0.00',
    lowStockCount: row?.low_stock ?? 0,
    productCount: row?.products ?? 0,
    partyCount: row?.parties ?? 0,
  };
}

export type SalesSummaryRow = {
  date: string;
  invoiceCount: number;
  taxableValue: string;
  taxTotal: string;
  grandTotal: string;
};

/** Day-by-day sales for a date range. Backs the sales report and its CSV. */
export async function getSalesSummary(
  ctx: TenantCtx,
  range: { from: string; to: string },
): Promise<SalesSummaryRow[]> {
  const rows = await getDb().execute<SalesSummaryRow>(sql`
    select
      invoice_date::text                                   as "date",
      count(*)::int                                        as "invoiceCount",
      sum(subtotal)::numeric(12,2)::text                   as "taxableValue",
      sum(cgst_total + sgst_total + igst_total + cess_total)::numeric(12,2)::text as "taxTotal",
      sum(grand_total)::numeric(12,2)::text                as "grandTotal"
    from invoices
    where business_id = ${ctx.businessId}::uuid
      and ${SALES_FILTER}
      and invoice_date between ${range.from}::date and ${range.to}::date
    group by invoice_date
    order by invoice_date desc
  `);
  return [...rows];
}

export type TaxRateSummaryRow = {
  taxRate: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  cess: string;
};

/**
 * Taxable value and tax split per rate.
 *
 * This is the shape a CA asks for, and the shape GSTR-1's HSN summary needs in
 * Phase 2 — built now because the underlying line data must support it, and
 * finding out it does not after a year of invoices would be far too late.
 */
export async function getTaxSummary(
  ctx: TenantCtx,
  range: { from: string; to: string },
): Promise<TaxRateSummaryRow[]> {
  const rows = await getDb().execute<TaxRateSummaryRow>(sql`
    select
      l.tax_rate::text                        as "taxRate",
      sum(l.taxable_value)::numeric(12,2)::text as "taxableValue",
      sum(l.cgst_amount)::numeric(12,2)::text   as "cgst",
      sum(l.sgst_amount)::numeric(12,2)::text   as "sgst",
      sum(l.igst_amount)::numeric(12,2)::text   as "igst",
      sum(l.cess_amount)::numeric(12,2)::text   as "cess"
    from invoice_lines l
    join invoices i on i.id = l.invoice_id
    where l.business_id = ${ctx.businessId}::uuid
      and i.status = 'issued'
      and i.kind not in ('estimate', 'delivery_challan')
      and i.invoice_date between ${range.from}::date and ${range.to}::date
    group by l.tax_rate
    order by l.tax_rate
  `);
  return [...rows];
}

export type StockSummaryRow = {
  productId: string;
  name: string;
  sku: string | null;
  unit: string | null;
  currentStock: string;
  lowStockAlert: string | null;
  salePrice: string;
  stockValue: string;
  isLow: boolean;
};

/**
 * What is on the shelf and what it is worth.
 *
 * Valued at SALE price, not cost. Cost is often blank — plenty of shops never
 * enter it — and a stock report full of zeros is worse than one that answers a
 * slightly different question, clearly labelled.
 */
export async function getStockSummary(ctx: TenantCtx): Promise<StockSummaryRow[]> {
  const rows = await getDb().execute<StockSummaryRow>(sql`
    select
      p.id::text            as "productId",
      p.name                as "name",
      p.sku                 as "sku",
      u.short_name          as "unit",
      p.current_stock::text as "currentStock",
      p.low_stock_alert::text as "lowStockAlert",
      p.sale_price::text    as "salePrice",
      (p.current_stock * p.sale_price)::numeric(12,2)::text as "stockValue",
      (p.low_stock_alert is not null and p.current_stock <= p.low_stock_alert) as "isLow"
    from products p
    left join units u on u.id = p.unit_id
    where p.business_id = ${ctx.businessId}::uuid
      and p.is_active = true
      and p.track_inventory = true
    order by (p.low_stock_alert is not null and p.current_stock <= p.low_stock_alert) desc,
             p.name
  `);
  return [...rows];
}

/** The most recent documents, for the dashboard. */
export async function getRecentInvoices(ctx: TenantCtx, limit = 8) {
  const rows = await getDb().execute<{
    id: string;
    invoiceNo: string | null;
    invoiceDate: string;
    partyName: string;
    grandTotal: string;
    status: string;
    paymentStatus: string;
  }>(sql`
    select id::text as "id", invoice_no as "invoiceNo", invoice_date::text as "invoiceDate",
           party_name as "partyName", grand_total::text as "grandTotal",
           status::text as "status", payment_status::text as "paymentStatus"
    from invoices
    where business_id = ${ctx.businessId}::uuid
      and kind not in ('estimate', 'delivery_challan')
    order by created_at desc
    limit ${limit}
  `);
  return [...rows];
}

export type SalesExportRow = {
  invoiceNo: string | null;
  invoiceDate: string;
  kind: string;
  status: string;
  partyName: string;
  partyPhone: string | null;
  partyGstin: string | null;
  partyAddress: string | null;
  placeOfSupply: string | null;
  isInterstate: boolean;
  itemName: string;
  hsnCode: string | null;
  qty: string;
  unit: string | null;
  rate: string;
  taxRate: string;
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  lineTotal: string;
  invoiceTotal: string;
  amountPaid: string;
  paymentStatus: string;
  fy: string;
};

/**
 * Sales, one row per item sold.
 *
 * Deliberately the same grain and the same columns as the returns export, so
 * the two files subtract from each other line by line. That is how an
 * accountant works out net taxable sales, and how the TCS files from a
 * marketplace are laid out for the same reason.
 *
 * Cancelled invoices are included with their status, not filtered out. A CA
 * reconciling a numbered series needs to see that 007 exists and is void;
 * a missing row looks like a hidden sale.
 */
export async function listInvoiceLinesForExport(
  ctx: TenantCtx,
  range?: { from: string; to: string },
): Promise<SalesExportRow[]> {
  const rows = await getDb().execute<SalesExportRow>(sql`
    select i.invoice_no as "invoiceNo",
           i.invoice_date::text as "invoiceDate",
           i.kind::text as "kind",
           i.status::text as "status",
           i.party_name as "partyName",
           i.party_phone as "partyPhone",
           i.party_gstin as "partyGstin",
           i.party_address as "partyAddress",
           i.place_of_supply as "placeOfSupply",
           i.is_interstate as "isInterstate",
           l.name as "itemName",
           l.hsn_code as "hsnCode",
           l.qty::text as "qty",
           l.unit as "unit",
           l.rate::text as "rate",
           l.tax_rate::text as "taxRate",
           l.taxable_value::text as "taxableValue",
           l.cgst_amount::text as "cgstAmount",
           l.sgst_amount::text as "sgstAmount",
           l.igst_amount::text as "igstAmount",
           l.cess_amount::text as "cessAmount",
           l.line_total::text as "lineTotal",
           i.grand_total::text as "invoiceTotal",
           i.amount_paid::text as "amountPaid",
           i.payment_status::text as "paymentStatus",
           i.fy as "fy"
    from invoice_lines l
    join invoices i on i.id = l.invoice_id
    where i.business_id = ${ctx.businessId}::uuid
      and i.status <> 'draft'
      ${range ? sql`and i.invoice_date between ${range.from} and ${range.to}` : sql``}
    order by i.invoice_date desc, i.invoice_no desc, l.line_no
    limit 5000
  `);
  return [...rows];
}

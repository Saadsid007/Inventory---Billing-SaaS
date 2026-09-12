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
  cogsTotal: string;
  grossProfit: string;
  marginPct: string;
};

/** Day-by-day or month-by-month sales for a date range with COGS and gross profit. */
export async function getSalesSummary(
  ctx: TenantCtx,
  range: { from: string; to: string },
  groupBy: 'day' | 'month' = 'day',
): Promise<SalesSummaryRow[]> {
  const isMonth = groupBy === 'month';
  const dateExpr = isMonth ? sql`to_char(i.invoice_date, 'YYYY-MM')` : sql`i.invoice_date::text`;
  const groupExpr = isMonth ? sql`to_char(i.invoice_date, 'YYYY-MM')` : sql`i.invoice_date`;

  const rows = await getDb().execute<SalesSummaryRow>(sql`
    with line_costs as (
      select
        l.invoice_id,
        sum(l.qty * coalesce(p.purchase_price, 0)) as cogs
      from invoice_lines l
      left join products p on p.id = l.product_id
      where l.business_id = ${ctx.businessId}::uuid
      group by l.invoice_id
    )
    select
      ${dateExpr}                                          as "date",
      count(*)::int                                        as "invoiceCount",
      sum(i.subtotal)::numeric(12,2)::text                 as "taxableValue",
      sum(i.cgst_total + i.sgst_total + i.igst_total + i.cess_total)::numeric(12,2)::text as "taxTotal",
      sum(i.grand_total)::numeric(12,2)::text              as "grandTotal",
      coalesce(sum(lc.cogs), 0)::numeric(12,2)::text       as "cogsTotal",
      (sum(i.subtotal) - coalesce(sum(lc.cogs), 0))::numeric(12,2)::text as "grossProfit",
      case
        when sum(i.subtotal) > 0 then
          round(((sum(i.subtotal) - coalesce(sum(lc.cogs), 0)) / sum(i.subtotal) * 100)::numeric, 1)::text
        else '0.0'
      end                                                  as "marginPct"
    from invoices i
    left join line_costs lc on lc.invoice_id = i.id
    where i.business_id = ${ctx.businessId}::uuid
      and ${SALES_FILTER}
      and i.invoice_date between ${range.from}::date and ${range.to}::date
    group by ${groupExpr}
    order by ${groupExpr} desc
  `);
  return [...rows];
}

export type ProductProfitRow = {
  productId: string;
  name: string;
  sku: string | null;
  unit: string | null;
  qtySold: string;
  revenue: string;
  cogs: string;
  profit: string;
  marginPct: string;
};

/** Product-wise sales, costs, and profit breakdown for a date range. */
export async function getProductProfitSummary(
  ctx: TenantCtx,
  range: { from: string; to: string },
): Promise<ProductProfitRow[]> {
  const rows = await getDb().execute<ProductProfitRow>(sql`
    select
      coalesce(p.id::text, l.product_id::text, l.name) as "productId",
      l.name as "name",
      p.sku as "sku",
      l.unit as "unit",
      sum(l.qty)::numeric(12,3)::text as "qtySold",
      sum(l.taxable_value)::numeric(12,2)::text as "revenue",
      sum(l.qty * coalesce(p.purchase_price, 0))::numeric(12,2)::text as "cogs",
      (sum(l.taxable_value) - sum(l.qty * coalesce(p.purchase_price, 0)))::numeric(12,2)::text as "profit",
      case
        when sum(l.taxable_value) > 0 then
          round(((sum(l.taxable_value) - sum(l.qty * coalesce(p.purchase_price, 0))) / sum(l.taxable_value) * 100)::numeric, 1)::text
        else '0.0'
      end as "marginPct"
    from invoice_lines l
    join invoices i on i.id = l.invoice_id
    left join products p on p.id = l.product_id
    where l.business_id = ${ctx.businessId}::uuid
      and i.status = 'issued'
      and i.kind not in ('estimate', 'delivery_challan')
      and i.invoice_date between ${range.from}::date and ${range.to}::date
    group by coalesce(p.id::text, l.product_id::text, l.name), l.name, p.sku, l.unit
    order by (sum(l.taxable_value) - sum(l.qty * coalesce(p.purchase_price, 0))) desc
    limit 100
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
  purchasePrice: string;
  salePrice: string;
  stockCost: string;
  stockValue: string;
  potentialProfit: string;
  potentialMarginPct: string;
  isLow: boolean;
};

/**
 * What is on the shelf, what it cost, and what it is worth.
 *
 * Provides both sale price value and purchase cost, computing unrealised margin.
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
      coalesce(p.purchase_price, 0)::numeric(12,2)::text as "purchasePrice",
      p.sale_price::text    as "salePrice",
      (p.current_stock * coalesce(p.purchase_price, 0))::numeric(12,2)::text as "stockCost",
      (p.current_stock * p.sale_price)::numeric(12,2)::text as "stockValue",
      ((p.current_stock * p.sale_price) - (p.current_stock * coalesce(p.purchase_price, 0)))::numeric(12,2)::text as "potentialProfit",
      case
        when (p.current_stock * p.sale_price) > 0 then
          round((((p.current_stock * p.sale_price) - (p.current_stock * coalesce(p.purchase_price, 0))) / (p.current_stock * p.sale_price) * 100)::numeric, 1)::text
        else '0.0'
      end                   as "potentialMarginPct",
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
  costPrice: string;
  cogs: string;
  profit: string;
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
           coalesce(p.purchase_price, 0)::numeric(12,2)::text as "costPrice",
           (l.qty * coalesce(p.purchase_price, 0))::numeric(12,2)::text as "cogs",
           (l.taxable_value - (l.qty * coalesce(p.purchase_price, 0)))::numeric(12,2)::text as "profit",
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
    left join products p on p.id = l.product_id
    where i.business_id = ${ctx.businessId}::uuid
      and i.status <> 'draft'
      ${range ? sql`and i.invoice_date between ${range.from} and ${range.to}` : sql``}
    order by i.invoice_date desc, i.invoice_no desc, l.line_no
    limit 5000
  `);
  return [...rows];
}

export type ProfitLossRow = {
  date: string;
  invoiceCount: number;
  returnCount: number;
  grossSales: string;
  taxableSales: string;
  returnedValue: string;
  returnedTaxable: string;
  netRevenue: string;
  salesCogs: string;
  returnedCogs: string;
  netCogs: string;
  grossProfit: string;
  marginPct: string;
  taxTotal: string;
  netTaxTotal: string;
};

/**
 * Profit and loss breakdown (Daily or Month-wise) combining sales and returns.
 */
export async function getProfitLossSummary(
  ctx: TenantCtx,
  range: { from: string; to: string },
  groupBy: 'day' | 'month' = 'day',
): Promise<ProfitLossRow[]> {
  const { getReturnsSummary } = await import('./returns');
  const [sales, returns] = await Promise.all([
    getSalesSummary(ctx, range, groupBy),
    getReturnsSummary(ctx, range, groupBy),
  ]);

  const returnMap = new Map(returns.map((r) => [r.date, r]));
  const allDates = Array.from(
    new Set([...sales.map((s) => s.date), ...returns.map((r) => r.date)]),
  );
  allDates.sort((a, b) => b.localeCompare(a));

  return allDates.map((date) => {
    const s = sales.find((x) => x.date === date);
    const r = returnMap.get(date);

    const invoiceCount = s?.invoiceCount ?? 0;
    const returnCount = r?.returnCount ?? 0;
    const grossSalesNum = Number(s?.grandTotal ?? 0);
    const taxableSalesNum = Number(s?.taxableValue ?? 0);
    const salesTaxNum = Number(s?.taxTotal ?? 0);
    const salesCogsNum = Number(s?.cogsTotal ?? 0);

    const returnedValueNum = Number(r?.grandTotal ?? 0);
    const returnedTaxableNum = Number(r?.taxableValue ?? 0);
    const returnedTaxNum = Number(r?.taxTotal ?? 0);
    const returnedCogsNum = Number(r?.cogsTotal ?? 0);

    const netRevenueNum = taxableSalesNum - returnedTaxableNum;
    const netCogsNum = salesCogsNum - returnedCogsNum;
    const grossProfitNum = netRevenueNum - netCogsNum;
    const marginPctNum = netRevenueNum > 0 ? (grossProfitNum / netRevenueNum) * 100 : 0;
    const netTaxNum = salesTaxNum - returnedTaxNum;

    return {
      date,
      invoiceCount,
      returnCount,
      grossSales: grossSalesNum.toFixed(2),
      taxableSales: taxableSalesNum.toFixed(2),
      returnedValue: returnedValueNum.toFixed(2),
      returnedTaxable: returnedTaxableNum.toFixed(2),
      netRevenue: netRevenueNum.toFixed(2),
      salesCogs: salesCogsNum.toFixed(2),
      returnedCogs: returnedCogsNum.toFixed(2),
      netCogs: netCogsNum.toFixed(2),
      grossProfit: grossProfitNum.toFixed(2),
      marginPct: marginPctNum.toFixed(1),
      taxTotal: salesTaxNum.toFixed(2),
      netTaxTotal: netTaxNum.toFixed(2),
    };
  });
}

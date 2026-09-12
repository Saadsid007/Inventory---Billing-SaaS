import {
  getProductProfitSummary,
  getProfitLossSummary,
  getReturnsSummary,
  getSalesSummary,
  getStockSummary,
  getTaxSummary,
  listPartyBalances,
} from '@billwise/db';
import { todayInIndia } from '@billwise/core';
import { PageBody, PageHeader, Section } from '@billwise/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { DateRangePicker } from './date-range';
import { ExportButtons } from './export-buttons';
import { SalesReportsTabs } from './sales-reports-tabs';
import {
  SortableOutstandingTable,
  SortableStockTable,
  SortableTaxTable,
} from './sortable-sections';

export const metadata: Metadata = { title: 'Reports & P&L' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/** Default range: the current month to date. */
function defaultRange() {
  const today = todayInIndia();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; groupBy?: 'day' | 'month' }>;
}) {
  const ctx = await requireBusiness();
  const sp = await searchParams;
  const fallback = defaultRange();
  const range = { from: sp.from || fallback.from, to: sp.to || fallback.to };
  const groupBy = sp.groupBy === 'month' ? 'month' : 'day';

  const [sales, tax, stock, balances, returns, pnlRows, productProfits] = await Promise.all([
    getSalesSummary(ctx, range, groupBy),
    getTaxSummary(ctx, range),
    getStockSummary(ctx),
    listPartyBalances(ctx),
    getReturnsSummary(ctx, range, groupBy),
    getProfitLossSummary(ctx, range, groupBy),
    getProductProfitSummary(ctx, range),
  ]);

  const totals = sales.reduce(
    (a, r) => ({
      invoices: a.invoices + r.invoiceCount,
      taxable: a.taxable + Number(r.taxableValue),
      tax: a.tax + Number(r.taxTotal),
      grand: a.grand + Number(r.grandTotal),
      cogs: a.cogs + Number(r.cogsTotal),
      profit: a.profit + Number(r.grossProfit),
    }),
    { invoices: 0, taxable: 0, tax: 0, grand: 0, cogs: 0, profit: 0 },
  );
  const salesMarginPct = totals.taxable > 0 ? (totals.profit / totals.taxable) * 100 : 0;

  const returnTotals = returns.reduce(
    (a, r) => ({
      count: a.count + r.returnCount,
      taxable: a.taxable + Number(r.taxableValue),
      tax: a.tax + Number(r.taxTotal),
      grand: a.grand + Number(r.grandTotal),
      cogs: a.cogs + Number(r.cogsTotal),
    }),
    { count: 0, taxable: 0, tax: 0, grand: 0, cogs: 0 },
  );

  /**
   * Net of returns: figures accountant & owner actually book.
   */
  const netTaxable = totals.taxable - returnTotals.taxable;
  const netCogs = totals.cogs - returnTotals.cogs;
  const netProfit = netTaxable - netCogs;
  const netMarginPct = netTaxable > 0 ? (netProfit / netTaxable) * 100 : 0;

  const net = {
    taxable: netTaxable,
    tax: totals.tax - returnTotals.tax,
    grand: totals.grand - returnTotals.grand,
    cogs: netCogs,
    profit: netProfit,
    marginPct: netMarginPct,
  };

  const stockValue = stock.reduce((a, r) => a + Number(r.stockValue), 0);
  const stockCost = stock.reduce((a, r) => a + Number(r.stockCost), 0);
  const stockProfit = stockValue - stockCost;
  const stockMarginPct = stockValue > 0 ? (stockProfit / stockValue) * 100 : 0;

  const owed = balances.filter((b) => Number(b.outstanding) > 0);
  const owedTotal = owed.reduce((a, b) => a + Number(b.outstanding), 0);

  return (
    <PageBody className="space-y-10">
      <PageHeader
        title="Reports & Analytics"
        description="Profit & loss, sales, returns, stock valuation and outstanding khata with daily & month-wise analytics."
        actions={<ExportButtons />}
      />

      <SalesReportsTabs
        sales={sales}
        totals={{ ...totals, marginPct: salesMarginPct }}
        returns={returns}
        returnTotals={returnTotals}
        net={net}
        pnlRows={pnlRows}
        productProfits={productProfits}
        groupBy={groupBy}
        dateRangePicker={<DateRangePicker initial={{ from: range.from, to: range.to, groupBy }} />}
      />

      {tax.length > 0 && (
        <Section
          title="Tax by rate"
          description="What a CA asks for at year end, and the basis of the GSTR-1 HSN summary."
        >
          <SortableTaxTable tax={tax} />
        </Section>
      )}

      <Section
        title="Stock valuation & profit potential"
        description="Inventory shelf value, total purchase cost, and unrealized profit margin across tracked items."
        actions={
          <div className="flex flex-wrap items-center gap-3 tabular text-xs sm:text-sm text-muted-foreground">
            <span>
              Cost:{' '}
              <span className="font-semibold text-foreground">{inr(stockCost.toFixed(2))}</span>
            </span>
            <span className="opacity-40">•</span>
            <span>
              Sale value:{' '}
              <span className="font-semibold text-foreground">{inr(stockValue.toFixed(2))}</span>
            </span>
            <span className="opacity-40">•</span>
            <span>
              Potential profit:{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {inr(stockProfit.toFixed(2))} ({stockMarginPct.toFixed(1)}%)
              </span>
            </span>
          </div>
        }
      >
        <SortableStockTable stock={stock} />
      </Section>

      <Section
        title="Outstanding by customer"
        description="Accounts receivable khata: who owes you money and payment history."
        actions={
          <p className="tabular text-sm text-muted-foreground">
            Total outstanding:{' '}
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {inr(owedTotal.toFixed(2))}
            </span>
          </p>
        }
      >
        <SortableOutstandingTable owed={owed} />
      </Section>
    </PageBody>
  );
}

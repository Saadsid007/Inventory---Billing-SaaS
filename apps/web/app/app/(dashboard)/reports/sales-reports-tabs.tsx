'use client';

import {
  Badge,
  EmptyState,
  Pagination,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@billwise/ui';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  FileText,
  IndianRupee,
  Package,
  Receipt,
  SearchX,
  TrendingDown,
  TrendingUp,
  Undo2,
} from 'lucide-react';
import * as React from 'react';
import type { ProductProfitRow, ProfitLossRow, SalesSummaryRow } from '@billwise/db';

const inr = (v: number | string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export type SalesRow = SalesSummaryRow;

export type ReturnsRow = {
  date: string;
  returnCount: number;
  taxableValue: string;
  taxTotal: string;
  grandTotal: string;
  cogsTotal: string;
};

function formatPeriod(period: string, groupBy?: 'day' | 'month') {
  if (groupBy === 'month' && /^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-');
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return period;
}

function useSortableData<T>(
  items: readonly T[],
  defaultKey: keyof T,
  defaultDirection: 'asc' | 'desc' = 'desc',
) {
  const [sortKey, setSortKey] = React.useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>(defaultDirection);

  const requestSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedItems = React.useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA ?? '');
      const strB = String(valB ?? '');
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    return copy;
  }, [items, sortKey, sortDir]);

  return { sortedItems, sortKey, sortDir, requestSort };
}

function SortHeader<T>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  numeric,
  className,
}: {
  label: string;
  sortKey: keyof T;
  activeKey: keyof T;
  direction: 'asc' | 'desc';
  onSort: (key: keyof T) => void;
  numeric?: boolean;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  return (
    <TH numeric={numeric} className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group inline-flex items-center gap-1.5 cursor-pointer select-none transition-colors hover:text-white ${
          isActive ? 'text-white font-black' : 'text-white/85'
        } ${numeric ? 'justify-end ml-auto' : ''}`}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="size-3 text-amber-300 shrink-0" />
          ) : (
            <ArrowDown className="size-3 text-amber-300 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </button>
    </TH>
  );
}

export function SalesReportsTabs({
  sales,
  totals,
  returns,
  returnTotals,
  net,
  pnlRows,
  productProfits,
  dateRangePicker,
  groupBy = 'day',
}: {
  sales: readonly SalesRow[];
  totals: {
    invoices: number;
    taxable: number;
    tax: number;
    grand: number;
    cogs: number;
    profit: number;
    marginPct: number;
  };
  returns: readonly ReturnsRow[];
  returnTotals: {
    count: number;
    taxable: number;
    tax: number;
    grand: number;
    cogs: number;
  };
  net: {
    taxable: number;
    tax: number;
    grand: number;
    cogs: number;
    profit: number;
    marginPct: number;
  };
  pnlRows: readonly ProfitLossRow[];
  productProfits: readonly ProductProfitRow[];
  dateRangePicker?: React.ReactNode;
  groupBy?: 'day' | 'month';
}) {
  const [activeTab, setActiveTab] = React.useState<'sales' | 'returns' | 'pnl' | 'products'>('pnl');

  // Sortable data
  const salesSort = useSortableData(sales, 'date', 'desc');
  const returnsSort = useSortableData(returns, 'date', 'desc');
  const pnlSort = useSortableData(pnlRows, 'date', 'desc');
  const productSort = useSortableData(productProfits, 'profit', 'desc');

  // Pagination for Sales table
  const [salesPage, setSalesPage] = React.useState(1);
  const [salesPageSize, setSalesPageSize] = React.useState(15);

  // Pagination for Returns table
  const [returnsPage, setReturnsPage] = React.useState(1);
  const [returnsPageSize, setReturnsPageSize] = React.useState(15);

  // Pagination for P&L table
  const [pnlPage, setPnlPage] = React.useState(1);
  const [pnlPageSize, setPnlPageSize] = React.useState(15);

  // Pagination for Product Profit table
  const [productPage, setProductPage] = React.useState(1);
  const [productPageSize, setProductPageSize] = React.useState(15);

  const paginatedSales = React.useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return salesSort.sortedItems.slice(start, start + salesPageSize);
  }, [salesSort.sortedItems, salesPage, salesPageSize]);

  const paginatedReturns = React.useMemo(() => {
    const start = (returnsPage - 1) * returnsPageSize;
    return returnsSort.sortedItems.slice(start, start + returnsPageSize);
  }, [returnsSort.sortedItems, returnsPage, returnsPageSize]);

  const paginatedPnl = React.useMemo(() => {
    const start = (pnlPage - 1) * pnlPageSize;
    return pnlSort.sortedItems.slice(start, start + pnlPageSize);
  }, [pnlSort.sortedItems, pnlPage, pnlPageSize]);

  const paginatedProducts = React.useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return productSort.sortedItems.slice(start, start + productPageSize);
  }, [productSort.sortedItems, productPage, productPageSize]);

  const periodHeaderLabel = groupBy === 'month' ? 'Month' : 'Date';

  return (
    <div className="space-y-4">
      {/* Top Header Controls: 4 Navigation Tabs + Date Range / Grouping Bar */}
      <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
        {/* Navigation Tabs with active indicator badges */}
        <div className="inline-flex w-full xl:w-auto flex-wrap items-center gap-1 rounded-xl border border-slate-300/80 bg-slate-200/80 p-1.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('pnl')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'pnl'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Profit & Loss (P&L)</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeTab === 'pnl'
                  ? 'bg-white/25 text-white'
                  : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {net.marginPct.toFixed(1)}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'sales'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Receipt className="size-3.5" />
            <span>Sales & Margins</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeTab === 'sales'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-300/90 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {totals.invoices}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'returns'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Undo2 className="size-3.5" />
            <span>Returns & Net</span>
            {returnTotals.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  activeTab === 'returns'
                    ? 'bg-amber-300 text-amber-950'
                    : 'bg-amber-500/25 text-amber-900 dark:text-amber-200'
                }`}
              >
                {returnTotals.count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Package className="size-3.5" />
            <span>Product Margins</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeTab === 'products'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-300/90 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {productProfits.length}
            </span>
          </button>
        </div>

        {/* Date Range Controls with Day/Month-wise switch */}
        {dateRangePicker && (
          <div className="flex items-center justify-start xl:justify-end">{dateRangePicker}</div>
        )}
      </div>

      {/* VIEW 1: PROFIT & LOSS (P&L) STATEMENT */}
      {activeTab === 'pnl' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* Executive P&L Stat Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Net Taxable Revenue"
              value={inr(net.taxable.toFixed(2))}
              hint={`Gross: ${inr(totals.taxable.toFixed(2))}`}
              icon={Receipt}
            />
            <StatCard
              label="Cost of Goods (COGS)"
              value={inr(net.cogs.toFixed(2))}
              hint="Purchase price of goods sold"
              icon={Package}
              tone="default"
            />
            <StatCard
              label="Gross Profit"
              value={inr(net.profit.toFixed(2))}
              hint={net.profit >= 0 ? 'Net profit booked' : 'Net operating loss'}
              icon={net.profit >= 0 ? TrendingUp : TrendingDown}
              tone={net.profit >= 0 ? 'success' : 'destructive'}
            />
            <StatCard
              label="Gross Margin"
              value={`${net.marginPct.toFixed(1)}%`}
              hint="Gross profit / Net taxable"
              icon={IndianRupee}
              tone={net.marginPct >= 20 ? 'success' : net.marginPct > 0 ? 'info' : 'destructive'}
            />
            <StatCard
              label="GST Collected (Net)"
              value={inr(net.tax.toFixed(2))}
              hint="GST liability to government"
              icon={FileText}
              tone="info"
            />
          </div>

          {/* P&L Table */}
          {pnlRows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No transactions in this period"
              description="Try changing the date range above. You can also switch between Daily and Month-wise views."
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
                <Table>
                  <THead>
                    <TR>
                      <SortHeader<ProfitLossRow>
                        label={periodHeaderLabel}
                        sortKey="date"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                      />
                      <SortHeader<ProfitLossRow>
                        label="Invoices"
                        sortKey="invoiceCount"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProfitLossRow>
                        label="Taxable Revenue (₹)"
                        sortKey="taxableSales"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProfitLossRow>
                        label="Returns (₹)"
                        sortKey="returnedValue"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProfitLossRow>
                        label="Net Revenue (₹)"
                        sortKey="netRevenue"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProfitLossRow>
                        label="Cost COGS (₹)"
                        sortKey="netCogs"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProfitLossRow>
                        label="Gross Profit (₹)"
                        sortKey="grossProfit"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProfitLossRow>
                        label="Margin"
                        sortKey="marginPct"
                        activeKey={pnlSort.sortKey}
                        direction={pnlSort.sortDir}
                        onSort={pnlSort.requestSort}
                        numeric
                      />
                      <TH className="text-center">Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedPnl.map((r) => {
                      const profitNum = Number(r.grossProfit);
                      const marginNum = Number(r.marginPct);
                      return (
                        <TR key={r.date} className="vendor-table-row">
                          <TD className="tabular font-semibold">{formatPeriod(r.date, groupBy)}</TD>
                          <TD numeric>{r.invoiceCount}</TD>
                          <TD numeric className="tabular">
                            ₹{r.taxableSales}
                          </TD>
                          <TD numeric className="tabular text-muted-foreground">
                            {Number(r.returnedValue) > 0 ? `₹${r.returnedValue}` : '-'}
                          </TD>
                          <TD numeric className="tabular font-medium text-foreground">
                            ₹{r.netRevenue}
                          </TD>
                          <TD numeric className="tabular text-muted-foreground">
                            ₹{r.netCogs}
                          </TD>
                          <TD
                            numeric
                            className={`tabular font-bold ${
                              profitNum >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ₹{r.grossProfit}
                          </TD>
                          <TD numeric className="tabular font-semibold">
                            {r.marginPct}%
                          </TD>
                          <TD className="text-center">
                            {profitNum > 0 ? (
                              <Badge variant={marginNum >= 25 ? 'success' : 'default'} dot>
                                Profit
                              </Badge>
                            ) : profitNum < 0 ? (
                              <Badge variant="destructive" dot>
                                Loss
                              </Badge>
                            ) : (
                              <Badge variant="outline">Even</Badge>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>

              {pnlRows.length > pnlPageSize && (
                <Pagination
                  currentPage={pnlPage}
                  totalPages={Math.ceil(pnlRows.length / pnlPageSize)}
                  totalItems={pnlRows.length}
                  pageSize={pnlPageSize}
                  onPageChange={setPnlPage}
                  onPageSizeChange={setPnlPageSize}
                  pageSizeOptions={[15, 30, 50]}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SALES & MARGINS REPORT */}
      {activeTab === 'sales' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* Sales Stat Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              label="Invoices Issued"
              value={String(totals.invoices)}
              hint="Bills generated in range"
              icon={FileText}
            />
            <StatCard
              label="Taxable Revenue"
              value={inr(totals.taxable.toFixed(2))}
              hint="Pre-tax item subtotal"
              icon={Receipt}
            />
            <StatCard
              label="Total Cost (COGS)"
              value={inr(totals.cogs.toFixed(2))}
              hint="Purchase price of goods"
              icon={Package}
            />
            <StatCard
              label="Gross Profit"
              value={inr(totals.profit.toFixed(2))}
              hint={`${totals.marginPct.toFixed(1)}% margin on sales`}
              icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
              tone={totals.profit >= 0 ? 'success' : 'destructive'}
            />
            <StatCard
              label="Tax Collected"
              value={inr(totals.tax.toFixed(2))}
              hint="GST / Cess collected"
              icon={Receipt}
              tone="info"
            />
            <StatCard
              label="Total Gross Sales"
              value={inr(totals.grand.toFixed(2))}
              hint="Final invoiced total"
              icon={IndianRupee}
              tone="success"
            />
          </div>

          {/* Sales Table with Sortable Columns */}
          {sales.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No sales in this range"
              description="Try a wider date range or switch presets."
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
                <Table>
                  <THead>
                    <TR>
                      <SortHeader<SalesRow>
                        label={periodHeaderLabel}
                        sortKey="date"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                      />
                      <SortHeader<SalesRow>
                        label="Invoices"
                        sortKey="invoiceCount"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                        numeric
                      />
                      <SortHeader<SalesRow>
                        label="Taxable (₹)"
                        sortKey="taxableValue"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                        numeric
                      />
                      <SortHeader<SalesRow>
                        label="Cost COGS (₹)"
                        sortKey="cogsTotal"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                        numeric
                      />
                      <SortHeader<SalesRow>
                        label="Gross Profit (₹)"
                        sortKey="grossProfit"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                        numeric
                      />
                      <SortHeader<SalesRow>
                        label="Margin"
                        sortKey="marginPct"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                        numeric
                      />
                      <SortHeader<SalesRow>
                        label="Tax (₹)"
                        sortKey="taxTotal"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                        numeric
                      />
                      <SortHeader<SalesRow>
                        label="Total Sales (₹)"
                        sortKey="grandTotal"
                        activeKey={salesSort.sortKey}
                        direction={salesSort.sortDir}
                        onSort={salesSort.requestSort}
                        numeric
                      />
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedSales.map((r) => {
                      const profitNum = Number(r.grossProfit);
                      return (
                        <TR key={r.date} className="vendor-table-row">
                          <TD className="tabular font-medium">{formatPeriod(r.date, groupBy)}</TD>
                          <TD numeric>{r.invoiceCount}</TD>
                          <TD numeric className="tabular">
                            ₹{r.taxableValue}
                          </TD>
                          <TD numeric className="tabular text-muted-foreground">
                            ₹{r.cogsTotal}
                          </TD>
                          <TD
                            numeric
                            className={`tabular font-bold ${
                              profitNum >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ₹{r.grossProfit}
                          </TD>
                          <TD numeric className="tabular font-medium">
                            {r.marginPct}%
                          </TD>
                          <TD numeric className="tabular">
                            ₹{r.taxTotal}
                          </TD>
                          <TD numeric className="tabular font-bold text-foreground">
                            ₹{r.grandTotal}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>

              {sales.length > salesPageSize && (
                <Pagination
                  currentPage={salesPage}
                  totalPages={Math.ceil(sales.length / salesPageSize)}
                  totalItems={sales.length}
                  pageSize={salesPageSize}
                  onPageChange={setSalesPage}
                  onPageSizeChange={setSalesPageSize}
                  pageSizeOptions={[15, 30, 50]}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: RETURNS AND NET SALES */}
      {activeTab === 'returns' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* Returns & Net Stat Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              label="Returns Recorded"
              value={String(returnTotals.count)}
              hint={returnTotals.count === 1 ? 'credit note issued' : 'credit notes issued'}
              icon={Undo2}
            />
            <StatCard
              label="Returned Total"
              value={inr(returnTotals.grand.toFixed(2))}
              hint={`Taxable ${inr(returnTotals.taxable.toFixed(2))}`}
              icon={Undo2}
              tone={returnTotals.grand > 0 ? 'warning' : 'default'}
            />
            <StatCard
              label="Restocked Cost"
              value={inr(returnTotals.cogs.toFixed(2))}
              hint="Restocked inventory value"
              icon={Package}
            />
            <StatCard
              label="Net Taxable"
              value={inr(net.taxable.toFixed(2))}
              hint="Gross sales minus returns"
              icon={Receipt}
            />
            <StatCard
              label="Net Gross Profit"
              value={inr(net.profit.toFixed(2))}
              hint={`${net.marginPct.toFixed(1)}% net margin`}
              icon={net.profit >= 0 ? TrendingUp : TrendingDown}
              tone={net.profit >= 0 ? 'success' : 'destructive'}
            />
            <StatCard
              label="Net Booked Sales"
              value={inr(net.grand.toFixed(2))}
              hint={`Net GST ${inr(net.tax.toFixed(2))}`}
              icon={IndianRupee}
              tone="success"
            />
          </div>

          {/* Returns Table */}
          {returns.length === 0 ? (
            <EmptyState
              icon={Undo2}
              title="Nothing came back in this range"
              description="Net sales is the same as gross sales. Returns are recorded on the bill they were sold on."
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
                <Table>
                  <THead>
                    <TR>
                      <SortHeader<ReturnsRow>
                        label={periodHeaderLabel}
                        sortKey="date"
                        activeKey={returnsSort.sortKey}
                        direction={returnsSort.sortDir}
                        onSort={returnsSort.requestSort}
                      />
                      <SortHeader<ReturnsRow>
                        label="Credit Notes"
                        sortKey="returnCount"
                        activeKey={returnsSort.sortKey}
                        direction={returnsSort.sortDir}
                        onSort={returnsSort.requestSort}
                        numeric
                      />
                      <SortHeader<ReturnsRow>
                        label="Taxable (₹)"
                        sortKey="taxableValue"
                        activeKey={returnsSort.sortKey}
                        direction={returnsSort.sortDir}
                        onSort={returnsSort.requestSort}
                        numeric
                      />
                      <SortHeader<ReturnsRow>
                        label="Restocked Cost (₹)"
                        sortKey="cogsTotal"
                        activeKey={returnsSort.sortKey}
                        direction={returnsSort.sortDir}
                        onSort={returnsSort.requestSort}
                        numeric
                      />
                      <SortHeader<ReturnsRow>
                        label="Tax (₹)"
                        sortKey="taxTotal"
                        activeKey={returnsSort.sortKey}
                        direction={returnsSort.sortDir}
                        onSort={returnsSort.requestSort}
                        numeric
                      />
                      <SortHeader<ReturnsRow>
                        label="Returned Total (₹)"
                        sortKey="grandTotal"
                        activeKey={returnsSort.sortKey}
                        direction={returnsSort.sortDir}
                        onSort={returnsSort.requestSort}
                        numeric
                      />
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedReturns.map((r) => (
                      <TR key={r.date} className="vendor-table-row">
                        <TD className="tabular font-medium">{formatPeriod(r.date, groupBy)}</TD>
                        <TD numeric>{r.returnCount}</TD>
                        <TD numeric className="tabular">
                          ₹{r.taxableValue}
                        </TD>
                        <TD numeric className="tabular text-muted-foreground">
                          ₹{r.cogsTotal}
                        </TD>
                        <TD numeric className="tabular">
                          ₹{r.taxTotal}
                        </TD>
                        <TD
                          numeric
                          className="tabular font-bold text-amber-700 dark:text-amber-300"
                        >
                          ₹{r.grandTotal}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              {returns.length > returnsPageSize && (
                <Pagination
                  currentPage={returnsPage}
                  totalPages={Math.ceil(returns.length / returnsPageSize)}
                  totalItems={returns.length}
                  pageSize={returnsPageSize}
                  onPageChange={setReturnsPage}
                  onPageSizeChange={setReturnsPageSize}
                  pageSizeOptions={[15, 30, 50]}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: PRODUCT MARGINS & PROFITABILITY */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {productProfits.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No product sales recorded"
              description="Sell products on issued invoices to see which products generate the highest profit and margins."
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
                <Table>
                  <THead>
                    <TR>
                      <SortHeader<ProductProfitRow>
                        label="Product"
                        sortKey="name"
                        activeKey={productSort.sortKey}
                        direction={productSort.sortDir}
                        onSort={productSort.requestSort}
                      />
                      <SortHeader<ProductProfitRow>
                        label="Units Sold"
                        sortKey="qtySold"
                        activeKey={productSort.sortKey}
                        direction={productSort.sortDir}
                        onSort={productSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProductProfitRow>
                        label="Revenue (₹)"
                        sortKey="revenue"
                        activeKey={productSort.sortKey}
                        direction={productSort.sortDir}
                        onSort={productSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProductProfitRow>
                        label="Cost COGS (₹)"
                        sortKey="cogs"
                        activeKey={productSort.sortKey}
                        direction={productSort.sortDir}
                        onSort={productSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProductProfitRow>
                        label="Gross Profit (₹)"
                        sortKey="profit"
                        activeKey={productSort.sortKey}
                        direction={productSort.sortDir}
                        onSort={productSort.requestSort}
                        numeric
                      />
                      <SortHeader<ProductProfitRow>
                        label="Margin %"
                        sortKey="marginPct"
                        activeKey={productSort.sortKey}
                        direction={productSort.sortDir}
                        onSort={productSort.requestSort}
                        numeric
                      />
                      <TH className="text-center">Margin Tier</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedProducts.map((p) => {
                      const profitNum = Number(p.profit);
                      const marginNum = Number(p.marginPct);
                      return (
                        <TR key={p.productId} className="vendor-table-row">
                          <TD>
                            <span className="font-semibold text-foreground">{p.name}</span>
                            {p.sku && (
                              <span className="ml-2 text-xs text-muted-foreground font-mono">
                                {p.sku}
                              </span>
                            )}
                          </TD>
                          <TD numeric className="tabular">
                            {p.qtySold}{' '}
                            {p.unit && (
                              <span className="text-xs text-muted-foreground">{p.unit}</span>
                            )}
                          </TD>
                          <TD numeric className="tabular font-medium">
                            ₹{p.revenue}
                          </TD>
                          <TD numeric className="tabular text-muted-foreground">
                            ₹{p.cogs}
                          </TD>
                          <TD
                            numeric
                            className={`tabular font-bold ${
                              profitNum >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ₹{p.profit}
                          </TD>
                          <TD numeric className="tabular font-semibold">
                            {p.marginPct}%
                          </TD>
                          <TD className="text-center">
                            {marginNum >= 30 ? (
                              <Badge variant="success" dot>
                                High
                              </Badge>
                            ) : marginNum >= 15 ? (
                              <Badge variant="default" dot>
                                Healthy
                              </Badge>
                            ) : marginNum > 0 ? (
                              <Badge variant="warning" dot>
                                Thin
                              </Badge>
                            ) : (
                              <Badge variant="destructive" dot>
                                Loss
                              </Badge>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>

              {productProfits.length > productPageSize && (
                <Pagination
                  currentPage={productPage}
                  totalPages={Math.ceil(productProfits.length / productPageSize)}
                  totalItems={productProfits.length}
                  pageSize={productPageSize}
                  onPageChange={setProductPage}
                  onPageSizeChange={setProductPageSize}
                  pageSizeOptions={[15, 30, 50]}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

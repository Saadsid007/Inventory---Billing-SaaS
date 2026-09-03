'use client';

import {
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
  FileText,
  IndianRupee,
  Receipt,
  SearchX,
  Undo2,
} from 'lucide-react';
import * as React from 'react';

const inr = (v: number | string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export type SalesRow = {
  date: string;
  invoiceCount: number;
  taxableValue: string;
  taxTotal: string;
  grandTotal: string;
};

export type ReturnsRow = {
  date: string;
  returnCount: number;
  taxableValue: string;
  taxTotal: string;
  grandTotal: string;
};

export function SalesReportsTabs({
  sales,
  totals,
  returns,
  returnTotals,
  net,
  dateRangePicker,
}: {
  sales: readonly SalesRow[];
  totals: { invoices: number; taxable: number; tax: number; grand: number };
  returns: readonly ReturnsRow[];
  returnTotals: { count: number; taxable: number; tax: number; grand: number };
  net: { taxable: number; tax: number; grand: number };
  dateRangePicker?: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = React.useState<'sales' | 'returns'>('sales');

  // Pagination for Sales table
  const [salesPage, setSalesPage] = React.useState(1);
  const [salesPageSize, setSalesPageSize] = React.useState(15);

  // Pagination for Returns table
  const [returnsPage, setReturnsPage] = React.useState(1);
  const [returnsPageSize, setReturnsPageSize] = React.useState(15);

  const paginatedSales = React.useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return sales.slice(start, start + salesPageSize);
  }, [sales, salesPage, salesPageSize]);

  const paginatedReturns = React.useMemo(() => {
    const start = (returnsPage - 1) * returnsPageSize;
    return returns.slice(start, start + returnsPageSize);
  }, [returns, returnsPage, returnsPageSize]);

  return (
    <div className="space-y-4">
      {/* Top Header Controls: 2 Buttons / Tabs + Date Range Picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* The 2 Switching Buttons with visible background & active highlight */}
        <div className="inline-flex w-full sm:w-auto items-center rounded-xl border border-slate-300/80 bg-slate-200/80 p-1.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'sales'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Receipt className="size-3.5" />
            <span>Sales</span>
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
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'returns'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Undo2 className="size-3.5" />
            <span>Returns and net sales</span>
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
        </div>

        {/* Date Range Controls */}
        {dateRangePicker && (
          <div className="flex items-center justify-end">
            {dateRangePicker}
          </div>
        )}
      </div>

      {/* VIEW 1: SALES REPORT (Only shown when Sales is selected) */}
      {activeTab === 'sales' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* Sales Stat Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Invoices Issued"
              value={String(totals.invoices)}
              hint="Bills generated in date range"
              icon={FileText}
            />
            <StatCard
              label="Taxable Value"
              value={inr(totals.taxable.toFixed(2))}
              hint="Pre-tax item subtotal"
              icon={Receipt}
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
              hint="Final invoiced gross amount"
              icon={IndianRupee}
              tone="success"
            />
          </div>

          {/* Sales Table */}
          {sales.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No sales in this range"
              description="Try a wider date range. The picker above starts at this month so far."
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
                <Table>
                  <THead>
                    <TR>
                      <TH>Date</TH>
                      <TH numeric>Invoices</TH>
                      <TH numeric>Taxable (₹)</TH>
                      <TH numeric>Tax (₹)</TH>
                      <TH numeric>Total Sales (₹)</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedSales.map((r) => (
                      <TR key={r.date} className="vendor-table-row">
                        <TD className="tabular font-medium">{r.date}</TD>
                        <TD numeric>{r.invoiceCount}</TD>
                        <TD numeric className="tabular">₹{r.taxableValue}</TD>
                        <TD numeric className="tabular">₹{r.taxTotal}</TD>
                        <TD numeric className="tabular font-bold text-foreground">
                          ₹{r.grandTotal}
                        </TD>
                      </TR>
                    ))}
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

      {/* VIEW 2: RETURNS AND NET SALES (Only shown when Returns and net sales is selected) */}
      {activeTab === 'returns' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* Returns & Net Stat Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Returns Recorded"
              value={String(returnTotals.count)}
              hint={returnTotals.count === 1 ? 'credit note issued' : 'credit notes issued'}
              icon={Undo2}
            />
            <StatCard
              label="Returned Value"
              value={inr(returnTotals.grand.toFixed(2))}
              hint={`Taxable ${inr(returnTotals.taxable.toFixed(2))}`}
              icon={Undo2}
              tone={returnTotals.grand > 0 ? 'warning' : 'default'}
            />
            <StatCard
              label="Net Taxable"
              value={inr(net.taxable.toFixed(2))}
              hint="Gross sales minus returns"
              icon={Receipt}
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
                      <TH>Date</TH>
                      <TH numeric>Credit Notes</TH>
                      <TH numeric>Taxable (₹)</TH>
                      <TH numeric>Tax (₹)</TH>
                      <TH numeric>Returned Total (₹)</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedReturns.map((r) => (
                      <TR key={r.date} className="vendor-table-row">
                        <TD className="tabular font-medium">{r.date}</TD>
                        <TD numeric>{r.returnCount}</TD>
                        <TD numeric className="tabular">₹{r.taxableValue}</TD>
                        <TD numeric className="tabular">₹{r.taxTotal}</TD>
                        <TD numeric className="tabular font-bold text-amber-700 dark:text-amber-300">
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
    </div>
  );
}

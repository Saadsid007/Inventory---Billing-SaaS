'use client';

import { Badge, EmptyState, Pagination, Table, TBody, TD, TH, THead, TR } from '@billwise/ui';
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Package } from 'lucide-react';
import * as React from 'react';
import type { StockSummaryRow, TaxRateSummaryRow } from '@billwise/db';

export type PartyBalanceItem = {
  partyId: string;
  name: string;
  phone: string | null;
  invoicedTotal: string;
  paidIn: string;
  outstanding: string;
};

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

/** Interactive Sortable Stock & Inventory Profitability Table */
export function SortableStockTable({ stock }: { stock: readonly StockSummaryRow[] }) {
  const { sortedItems, sortKey, sortDir, requestSort } = useSortableData(
    stock,
    'potentialProfit',
    'desc',
  );
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  if (stock.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Nothing tracked yet"
        description="Products with inventory tracking switched on will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <Table>
          <THead>
            <TR>
              <SortHeader<StockSummaryRow>
                label="Product"
                sortKey="name"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
              />
              <SortHeader<StockSummaryRow>
                label="In Stock"
                sortKey="currentStock"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<StockSummaryRow>
                label="Alert At"
                sortKey="lowStockAlert"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<StockSummaryRow>
                label="Cost Price (₹)"
                sortKey="purchasePrice"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<StockSummaryRow>
                label="Sale Price (₹)"
                sortKey="salePrice"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<StockSummaryRow>
                label="Total Cost (₹)"
                sortKey="stockCost"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<StockSummaryRow>
                label="Total Value (₹)"
                sortKey="stockValue"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<StockSummaryRow>
                label="Potential Profit (₹)"
                sortKey="potentialProfit"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<StockSummaryRow>
                label="Margin"
                sortKey="potentialMarginPct"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <TH className="text-center">Stock Alert</TH>
            </TR>
          </THead>
          <TBody>
            {paginated.map((r) => {
              const profitNum = Number(r.potentialProfit);
              return (
                <TR key={r.productId} className="vendor-table-row">
                  <TD>
                    <span className="font-semibold text-foreground">{r.name}</span>
                    {r.sku && (
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{r.sku}</span>
                    )}
                  </TD>
                  <TD numeric className="tabular font-medium">
                    {r.currentStock}
                    {r.unit && <span className="ml-1 text-xs text-muted-foreground">{r.unit}</span>}
                  </TD>
                  <TD numeric className="text-muted-foreground tabular">
                    {r.lowStockAlert ?? '-'}
                  </TD>
                  <TD numeric className="text-muted-foreground tabular">
                    ₹{r.purchasePrice}
                  </TD>
                  <TD numeric className="tabular font-medium">
                    ₹{r.salePrice}
                  </TD>
                  <TD numeric className="text-muted-foreground tabular">
                    ₹{r.stockCost}
                  </TD>
                  <TD numeric className="tabular font-medium text-foreground">
                    ₹{r.stockValue}
                  </TD>
                  <TD
                    numeric
                    className={`tabular font-bold ${
                      profitNum >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    ₹{r.potentialProfit}
                  </TD>
                  <TD numeric className="tabular font-semibold">
                    {r.potentialMarginPct}%
                  </TD>
                  <TD className="text-center">
                    {r.isLow ? (
                      <Badge variant="warning" dot>
                        Low stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Normal
                      </Badge>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>

      {stock.length > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(stock.length / pageSize)}
          totalItems={stock.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[15, 30, 50]}
        />
      )}
    </div>
  );
}

/** Interactive Sortable Outstanding Khata Table */
export function SortableOutstandingTable({ owed }: { owed: readonly PartyBalanceItem[] }) {
  const { sortedItems, sortKey, sortDir, requestSort } = useSortableData(
    owed,
    'outstanding',
    'desc',
  );
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  if (owed.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nobody owes you anything"
        description="Every bill you have issued has been paid in full."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <Table>
          <THead>
            <TR>
              <SortHeader<PartyBalanceItem>
                label="Party"
                sortKey="name"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
              />
              <TH>Phone</TH>
              <SortHeader<PartyBalanceItem>
                label="Invoiced (₹)"
                sortKey="invoicedTotal"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<PartyBalanceItem>
                label="Received (₹)"
                sortKey="paidIn"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
              <SortHeader<PartyBalanceItem>
                label="Outstanding (₹)"
                sortKey="outstanding"
                activeKey={sortKey}
                direction={sortDir}
                onSort={requestSort}
                numeric
              />
            </TR>
          </THead>
          <TBody>
            {paginated.map((b) => (
              <TR key={b.partyId} className="vendor-table-row">
                <TD className="font-medium text-foreground">{b.name}</TD>
                <TD className="tabular text-muted-foreground">{b.phone ?? '-'}</TD>
                <TD numeric className="text-muted-foreground tabular">
                  ₹{b.invoicedTotal}
                </TD>
                <TD numeric className="text-muted-foreground tabular">
                  ₹{b.paidIn}
                </TD>
                <TD numeric className="font-bold text-amber-600 dark:text-amber-400 tabular">
                  ₹{b.outstanding}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      {owed.length > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(owed.length / pageSize)}
          totalItems={owed.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[15, 30, 50]}
        />
      )}
    </div>
  );
}

/** Interactive Sortable Tax Summary Table */
export function SortableTaxTable({ tax }: { tax: readonly TaxRateSummaryRow[] }) {
  const { sortedItems, sortKey, sortDir, requestSort } = useSortableData(
    tax,
    'taxableValue',
    'desc',
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
      <Table>
        <THead>
          <TR>
            <SortHeader<TaxRateSummaryRow>
              label="Rate"
              sortKey="taxRate"
              activeKey={sortKey}
              direction={sortDir}
              onSort={requestSort}
            />
            <SortHeader<TaxRateSummaryRow>
              label="Taxable Value (₹)"
              sortKey="taxableValue"
              activeKey={sortKey}
              direction={sortDir}
              onSort={requestSort}
              numeric
            />
            <SortHeader<TaxRateSummaryRow>
              label="CGST (₹)"
              sortKey="cgst"
              activeKey={sortKey}
              direction={sortDir}
              onSort={requestSort}
              numeric
            />
            <SortHeader<TaxRateSummaryRow>
              label="SGST (₹)"
              sortKey="sgst"
              activeKey={sortKey}
              direction={sortDir}
              onSort={requestSort}
              numeric
            />
            <SortHeader<TaxRateSummaryRow>
              label="IGST (₹)"
              sortKey="igst"
              activeKey={sortKey}
              direction={sortDir}
              onSort={requestSort}
              numeric
            />
            <SortHeader<TaxRateSummaryRow>
              label="Cess (₹)"
              sortKey="cess"
              activeKey={sortKey}
              direction={sortDir}
              onSort={requestSort}
              numeric
            />
          </TR>
        </THead>
        <TBody>
          {sortedItems.map((r) => (
            <TR key={r.taxRate} className="vendor-table-row">
              <TD className="tabular font-semibold text-foreground">{r.taxRate}%</TD>
              <TD numeric className="tabular font-medium">
                ₹{r.taxableValue}
              </TD>
              <TD numeric className="tabular text-muted-foreground">
                ₹{r.cgst}
              </TD>
              <TD numeric className="tabular text-muted-foreground">
                ₹{r.sgst}
              </TD>
              <TD numeric className="tabular text-muted-foreground">
                ₹{r.igst}
              </TD>
              <TD numeric className="tabular text-muted-foreground">
                ₹{r.cess}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

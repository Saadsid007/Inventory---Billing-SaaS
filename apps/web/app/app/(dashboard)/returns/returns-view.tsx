'use client';

import type { listSalesReturns } from '@billwise/db';
import {
  Button,
  FilterBar,
  Input,
  Pagination,
  RowActions,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  tableLinkClass,
} from '@billwise/ui';
import { Calendar, Eye, FileText, IndianRupee, Package, Search, User, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

type ReturnRow = Awaited<ReturnType<typeof listSalesReturns>>[number];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function ReturnsView({ returns }: { returns: ReturnRow[] }) {
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return returns;
    return returns.filter(
      (r) =>
        (r.partyName && r.partyName.toLowerCase().includes(s)) ||
        (r.invoiceNo && r.invoiceNo.toLowerCase().includes(s)) ||
        (r.productNames && r.productNames.toLowerCase().includes(s)) ||
        (r.reason && r.reason.toLowerCase().includes(s)),
    );
  }, [returns, q]);

  React.useEffect(() => {
    setPage(1);
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-4">
      <FilterBar>
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer, bill # or product…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
          />
        </div>

        {q && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8.5 rounded-lg text-xs px-2.5"
            onClick={() => setQ('')}
          >
            <X className="size-3" /> Clear
          </Button>
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No returns match &ldquo;{q}&rdquo;.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <Table className="rounded-none border-none shadow-none">
            <THead>
              <TR>
                <TH icon={Calendar}>Date</TH>
                <TH icon={User}>Customer</TH>
                <TH icon={FileText}>Against bill</TH>
                <TH icon={Package}>Product name</TH>
                <TH>Reason</TH>
                <TH numeric>Quantity</TH>
                <TH icon={IndianRupee} numeric>
                  Credited
                </TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {paginated.map((r) => (
                <TR key={r.id}>
                  <TD className="tabular whitespace-nowrap">{shortDate(r.returnDate)}</TD>
                  <TD>{r.partyName ?? 'Walk-in'}</TD>
                  <TD>
                    {r.invoiceId && r.invoiceNo ? (
                      <Link href={`/app/invoices/${r.invoiceId}`} className={tableLinkClass}>
                        {r.invoiceNo}
                      </Link>
                    ) : (
                      <span className="tabular text-muted-foreground">{r.invoiceNo ?? '-'}</span>
                    )}
                  </TD>
                  <TD className="font-medium text-foreground">
                    <span>{r.productNames ?? '-'}</span>
                    {r.itemCount > 1 && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({r.itemCount} items)
                      </span>
                    )}
                  </TD>
                  <TD className="text-muted-foreground">{r.reason ?? '-'}</TD>
                  <TD numeric>{r.qtyTotal}</TD>
                  <TD numeric className="font-medium">
                    ₹{r.totalAmount}
                  </TD>
                  <TD>
                    <RowActions>
                      {r.invoiceId ? (
                        <Link href={`/app/invoices/${r.invoiceId}`}>
                          <Button variant="success" size="table">
                            <Eye className="size-3" />
                            View
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </RowActions>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}

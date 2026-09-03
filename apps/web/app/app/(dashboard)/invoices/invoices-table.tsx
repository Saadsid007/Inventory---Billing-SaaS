'use client';

import type { listInvoices } from '@billwise/db';
import { INVOICE_KIND_LABELS } from '@billwise/shared';
import {
  Badge,
  Button,
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
import { Calendar, CreditCard, Eye, FileText, Hash, Pencil, Printer, User } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>[number];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function InvoicesTable({ invoices }: { invoices: readonly InvoiceRow[] }) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const totalPages = Math.max(1, Math.ceil(invoices.length / pageSize));
  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return invoices.slice(start, start + pageSize);
  }, [invoices, page, pageSize]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <Table className="rounded-none border-none shadow-none">
        <THead>
          <TR>
            <TH icon={Hash}>Number</TH>
            <TH icon={Calendar}>Date</TH>
            <TH icon={User}>Customer</TH>
            <TH icon={FileText}>Type</TH>
            <TH icon={CreditCard} numeric>
              Total
            </TH>
            <TH icon={CreditCard}>Payment</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {paginated.map((inv) => (
            <TR key={inv.id}>
              <TD>
                <Link href={`/app/invoices/${inv.id}`} className={tableLinkClass}>
                  {inv.invoiceNo ?? 'Draft'}
                </Link>
                {inv.status === 'cancelled' && (
                  <Badge variant="destructive" className="ml-2">
                    Cancelled
                  </Badge>
                )}
                {inv.status === 'draft' && (
                  <Badge variant="outline" className="ml-2">
                    Draft
                  </Badge>
                )}
              </TD>
              <TD className="tabular whitespace-nowrap text-muted-foreground">
                {shortDate(inv.invoiceDate)}
              </TD>
              <TD className="max-w-[14rem] truncate font-medium">{inv.partyName}</TD>
              <TD className="text-muted-foreground">{INVOICE_KIND_LABELS[inv.kind]}</TD>
              <TD numeric className="font-bold tabular">
                ₹{inv.grandTotal}
              </TD>
              <TD>
                {inv.status !== 'issued' ? (
                  <span className="text-muted-foreground">-</span>
                ) : inv.paymentStatus === 'paid' ? (
                  <Badge variant="success" dot>
                    Paid
                  </Badge>
                ) : inv.paymentStatus === 'partial' ? (
                  <Badge variant="warning" dot>
                    ₹{inv.amountPaid} of ₹{inv.grandTotal}
                  </Badge>
                ) : (
                  <Badge variant="outline" dot>
                    Unpaid
                  </Badge>
                )}
              </TD>
              <TD>
                <RowActions>
                  <Link href={`/app/invoices/${inv.id}`}>
                    <Button variant="success" size="table">
                      <Eye className="size-3" />
                      View
                    </Button>
                  </Link>
                  {inv.status === 'draft' && (
                    <Link href={`/app/invoices/${inv.id}`}>
                      <Button variant="outline" size="table" title="Edit draft">
                        <Pencil className="size-3" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {inv.status === 'issued' && (
                    <Link href={`/app/invoices/${inv.id}/print`} target="_blank">
                      <Button variant="outline" size="table" title="Print invoice">
                        <Printer className="size-3" />
                        Print
                      </Button>
                    </Link>
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
        totalItems={invoices.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[15, 30, 50]}
      />
    </div>
  );
}

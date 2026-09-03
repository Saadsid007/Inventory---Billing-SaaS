import { listInvoices } from '@billwise/db';
import { type InvoiceKind } from '@billwise/shared';
import {
  Button,
  EmptyState,
  PageBody,
  PageHeader,
} from '@billwise/ui';
import {
  FileText,
  Plus,
  SearchX,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceFilterBar } from './filter-bar';
import { InvoicesTable } from './invoices-table';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    kind?: string;
    status?: string;
    payment?: string;
  }>;
}) {
  const ctx = await requireBusiness();
  const sp = await searchParams;

  const isFiltered = Boolean(
    sp.q || sp.from || sp.to || sp.kind || sp.status || sp.payment,
  );

  const invoices = await listInvoices(ctx, {
    search: sp.q,
    from: sp.from,
    to: sp.to,
    kind: (sp.kind as InvoiceKind) || undefined,
    status: (sp.status as 'draft' | 'issued' | 'cancelled') || undefined,
    paymentStatus: (sp.payment as 'unpaid' | 'partial' | 'paid') || undefined,
    limit: 200,
  });

  return (
    <PageBody>
      <PageHeader
        title="Invoices"
        description={
          isFiltered
            ? `${invoices.length} ${invoices.length === 1 ? 'document matches' : 'documents match'} your filters.`
            : 'Bills you have issued, drafts you are still working on, and anything cancelled.'
        }
        actions={
          <Link href="/app/invoices/new">
            <Button>
              <Plus /> New invoice
            </Button>
          </Link>
        }
      />

      <InvoiceFilterBar
        initial={{
          q: sp.q ?? '',
          from: sp.from ?? '',
          to: sp.to ?? '',
          kind: sp.kind ?? '',
          status: sp.status ?? '',
          payment: sp.payment ?? '',
        }}
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={isFiltered ? SearchX : FileText}
          title={isFiltered ? 'Nothing matches those filters' : 'No invoices yet'}
          description={
            isFiltered
              ? 'Try a wider date range, or clear the filters and start again.'
              : 'Make your first bill. You do not need to add products first, since items can be typed straight onto the invoice.'
          }
          action={
            !isFiltered && (
              <Link href="/app/invoices/new">
                <Button>
                  <Plus /> Create your first invoice
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <InvoicesTable invoices={invoices} />
      )}

      {invoices.length >= 200 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing the first 200. Narrow the filters to see more.
        </p>
      )}
    </PageBody>
  );
}

import { getParty, getPartyBalance, listApplications, listInvoices } from '@billwise/db';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@billwise/shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  RowActions,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  tableLinkClass,
} from '@billwise/ui';
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  Receipt,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Customer' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const badgeFor = (status: ApplicationStatus) =>
  status === 'ready'
    ? 'success'
    : status === 'rejected'
      ? 'destructive'
      : status === 'delivered'
        ? 'secondary'
        : 'info';

/**
 * One customer: what they owe, their work, and their receipts.
 *
 * Not a running ledger. That view answers "how did this balance come about",
 * which is an accountant's question. The counter's question is "what is this
 * person's stuff and what do they owe me", and two lists answer it.
 */
export default async function SevaCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;

  const [party, balance] = await Promise.all([getParty(ctx, id), getPartyBalance(ctx, id)]);
  if (!party) notFound();

  const [receipts, work] = await Promise.all([
    listInvoices(ctx, { partyId: id, limit: 50 }),
    listApplications(ctx, { partyId: id, limit: 50 }),
  ]);

  const outstanding = Number(balance?.outstanding ?? 0);

  return (
    <PageBody className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/seva/customers"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All customers
          </Link>
        }
        title={party.name}
        description={party.phone ?? undefined}
        actions={
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {party.phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${party.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs"
                  title="Call customer"
                >
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/91${party.phone.replace(/\D/g, '').slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-2xs"
                  title="Message customer on WhatsApp"
                >
                  <MessageCircle className="size-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
            <Link href={`/app/seva/receipts/new?partyId=${party.id}`}>
              <Button size="sm" className="h-9 gap-1.5 font-medium shadow-xs">
                <Plus className="size-3.5" /> New Receipt
              </Button>
            </Link>
            <Card className="px-4 py-2 text-right shadow-2xs">
              <p className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Outstanding
              </p>
              <p
                className={`tabular text-xl font-bold ${
                  outstanding > 0 ? 'text-warning' : 'text-foreground'
                }`}
              >
                {inr(outstanding)}
              </p>
            </Card>
          </div>
        }
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4 text-primary" /> Work Register
          </h2>
          <Link
            href={`/app/seva/work?q=${encodeURIComponent(party.name)}`}
            className="text-xs text-primary hover:underline font-medium"
          >
            Open in work register &rarr;
          </Link>
        </div>
        {work.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No work on the register"
            description="Nothing has been taken on for this customer yet."
            action={
              <Link href="/app/seva/work">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="size-3.5" /> Add work on register
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Work</TH>
                <TH>Reference</TH>
                <TH>Status</TH>
                <TH numeric>Balance</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {work.map((w) => {
                const bal = Number(w.balance || 0);
                return (
                  <TR key={w.id}>
                    <TD>
                      <span className="font-medium">{w.serviceName}</span>
                      {w.documentsHeld && (
                        <span className="block text-xs text-muted-foreground">{w.documentsHeld}</span>
                      )}
                    </TD>
                    <TD className="tabular text-xs">{w.referenceNo ?? '—'}</TD>
                    <TD>
                      <Badge variant={badgeFor(w.status)}>
                        {APPLICATION_STATUS_LABELS[w.status]}
                      </Badge>
                    </TD>
                    <TD numeric className={bal > 0 ? 'font-semibold text-warning' : 'text-muted-foreground'}>
                      {w.invoiceId ? (bal > 0 ? inr(bal) : 'Paid') : 'Unbilled'}
                    </TD>
                    <TD>
                      <RowActions>
                        {w.invoiceId ? (
                          <>
                            <Link href={`/app/seva/receipts/${w.invoiceId}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 font-medium"
                                title="View receipt details"
                              >
                                <Eye className="size-3" />
                                <span>Receipt</span>
                              </Button>
                            </Link>
                            <a
                              href={`/app/receipts/${w.invoiceId}/print`}
                              target="_blank"
                              rel="noreferrer"
                              className="size-7 inline-flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground transition-colors"
                              title="Print receipt slip"
                            >
                              <Printer className="size-3.5" />
                            </a>
                          </>
                        ) : (
                          <Link href={`/app/seva/work?q=${encodeURIComponent(w.referenceNo || w.serviceName)}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              title="Open on work register"
                            >
                              Manage
                            </Button>
                          </Link>
                        )}
                      </RowActions>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="size-4 text-primary" /> Receipts History
          </h2>
          <Link
            href={`/app/seva/receipts/new?partyId=${party.id}`}
            className="text-xs text-primary hover:underline font-medium"
          >
            + Create receipt
          </Link>
        </div>
        {receipts.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No receipts"
            description="Nothing has been billed to this customer yet."
            action={
              <Link href={`/app/seva/receipts/new?partyId=${party.id}`}>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" /> Create receipt
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Number</TH>
                <TH>Date</TH>
                <TH numeric>Total</TH>
                <TH numeric>Outstanding</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {receipts.map((row) => {
                const due = Number(row.grandTotal) - Number(row.amountPaid);
                const isCancelled = row.status === 'cancelled';
                return (
                  <TR key={row.id}>
                    <TD>
                      <Link href={`/app/seva/receipts/${row.id}`} className={tableLinkClass}>
                        {row.invoiceNo ?? 'Draft'}
                      </Link>
                    </TD>
                    <TD className="tabular text-muted-foreground">{shortDate(row.invoiceDate)}</TD>
                    <TD numeric>{inr(row.grandTotal)}</TD>
                    <TD numeric className={due > 0 && !isCancelled ? 'font-semibold text-warning' : 'text-muted-foreground'}>
                      {due > 0 && !isCancelled ? inr(due.toFixed(2)) : '—'}
                    </TD>
                    <TD>
                      <Badge
                        variant={
                          isCancelled
                            ? 'destructive'
                            : row.paymentStatus === 'paid'
                              ? 'success'
                              : row.paymentStatus === 'partial'
                                ? 'warning'
                                : 'secondary'
                        }
                      >
                        {isCancelled
                          ? 'Cancelled'
                          : row.paymentStatus === 'paid'
                            ? 'Paid'
                            : row.paymentStatus === 'partial'
                              ? 'Part paid'
                              : 'Unpaid'}
                      </Badge>
                    </TD>
                    <TD>
                      <RowActions>
                        <Link href={`/app/seva/receipts/${row.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 font-medium border-primary/30 text-primary hover:bg-primary/10 shadow-2xs"
                            title="View receipt details"
                          >
                            <Eye className="size-3" />
                            <span>View</span>
                          </Button>
                        </Link>
                        <a
                          href={`/app/receipts/${row.id}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="size-7 inline-flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground transition-colors"
                          title="Print receipt slip"
                        >
                          <Printer className="size-3.5" />
                        </a>
                      </RowActions>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>
    </PageBody>
  );
}

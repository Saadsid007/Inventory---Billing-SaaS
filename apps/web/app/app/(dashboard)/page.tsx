import { getDashboardStats, getRecentInvoices } from '@bahikhata/db';
import { MONTHLY_PRICE_INR, trialDaysRemaining } from '@bahikhata/shared';
import { Badge, EmptyState, StatCard, TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Dashboard' };

const inr = (v: string) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default async function DashboardPage() {
  // Called again rather than trusted from the layout: a page is reachable on
  // its own during client-side navigation, and the guard is cached.
  const ctx = await requireBusiness();

  const [{ businessName, status, slug, trialEndsAt }, stats, recent] = await Promise.all([
    requireMembership(),
    getDashboardStats(ctx),
    getRecentInvoices(ctx, 8),
  ]);

  const daysLeft = status === 'trial' && trialEndsAt ? trialDaysRemaining(trialEndsAt) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{businessName}</h1>
        <p className="text-sm text-muted-foreground">
          Public catalog:{' '}
          <Link href="/app/catalog" className="hover:underline">
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/store/{slug}</code>
          </Link>
        </p>
      </header>

      {/* Nag only in the last three days. A countdown from day one just teaches
          people to ignore the banner. */}
      {daysLeft !== null && daysLeft <= 3 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span className="font-medium">
            {daysLeft === 0
              ? 'Your trial ends today.'
              : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your trial.`}
          </span>{' '}
          <span className="text-muted-foreground">
            Subscribe at ₹{MONTHLY_PRICE_INR} a month to keep going.
          </span>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sales today"
          value={inr(stats.salesToday)}
          hint={`${stats.invoicesToday} ${stats.invoicesToday === 1 ? 'invoice' : 'invoices'}`}
        />
        <StatCard
          label="Sales this month"
          value={inr(stats.salesThisMonth)}
          hint={`${stats.invoicesThisMonth} ${stats.invoicesThisMonth === 1 ? 'invoice' : 'invoices'}`}
        />
        <StatCard
          label="Total outstanding"
          value={inr(stats.totalOutstanding)}
          hint={`Across ${stats.partyCount} ${stats.partyCount === 1 ? 'contact' : 'contacts'}`}
        />
        <StatCard
          label="Low stock items"
          value={String(stats.lowStockCount)}
          hint={stats.lowStockCount > 0 ? 'Needs restocking' : `${stats.productCount} products`}
        />
      </section>

      {stats.lowStockCount > 0 && (
        <Link
          href="/app/products?low=1"
          className="block rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm hover:bg-warning/15"
        >
          <span className="font-medium">
            {stats.lowStockCount} {stats.lowStockCount === 1 ? 'item is' : 'items are'} at or
            below the low-stock level.
          </span>{' '}
          <span className="text-muted-foreground">See which →</span>
        </Link>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent invoices</h2>
          <Link href="/app/invoices" className="text-sm text-muted-foreground hover:underline">
            See all
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Your bills will show up here as you make them."
            action={
              <Link
                href="/app/invoices/new"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Make your first bill
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Number</TH>
                <TH>Date</TH>
                <TH>Customer</TH>
                <TH numeric>Total</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {recent.map((inv) => (
                <TR key={inv.id}>
                  <TD>
                    <Link
                      href={`/app/invoices/${inv.id}`}
                      className="font-medium hover:underline"
                    >
                      {inv.invoiceNo ?? 'Draft'}
                    </Link>
                  </TD>
                  <TD className="tabular text-muted-foreground">{inv.invoiceDate}</TD>
                  <TD>{inv.partyName}</TD>
                  <TD numeric>₹{inv.grandTotal}</TD>
                  <TD>
                    {inv.status === 'cancelled' ? (
                      <Badge variant="destructive">Cancelled</Badge>
                    ) : inv.status === 'draft' ? (
                      <Badge variant="outline">Draft</Badge>
                    ) : inv.paymentStatus === 'paid' ? (
                      <Badge variant="success">Paid</Badge>
                    ) : inv.paymentStatus === 'partial' ? (
                      <Badge variant="warning">Part paid</Badge>
                    ) : (
                      <Badge variant="outline">Unpaid</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}

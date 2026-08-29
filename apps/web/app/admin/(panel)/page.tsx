import { getAdminStats, listAllBusinesses } from '@bahikhata/db';
import { Badge, StatCard, TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth/require-business';
import { AdminSearch } from '../admin-search';
import { BusinessActions } from '../business-actions';

export const metadata: Metadata = { title: 'Admin' };

/**
 * Super admin. Build spec §6:
 *
 *   "/admin/businesses/[id]  Metadata only — NEVER business transaction data"
 *
 * This page shows how many invoices a shop has issued. It does not show, and
 * must never show, an invoice, a customer name, a product or an amount. Being
 * able to help with billing is not a reason to be able to read a customer's
 * books.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q } = await searchParams;

  const [stats, businesses] = await Promise.all([
    getAdminStats(),
    listAllBusinesses({ search: q }),
  ]);

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
        <p className="text-sm text-muted-foreground">
          Metadata and counts only. No customer transaction data is shown here, by design.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Businesses" value={String(stats.businesses)} />
        <StatCard label="On trial" value={String(stats.trialing)} />
        <StatCard label="Paying" value={String(stats.paying)} />
        <StatCard label="Suspended" value={String(stats.suspended)} />
        <StatCard
          label="Active this week"
          value={String(stats.activeThisWeek)}
          hint={`${stats.invoices} invoices all time`}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium">All businesses</h2>
          <AdminSearch initial={q ?? ''} />
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Business</TH>
              <TH>Owner</TH>
              <TH>Status</TH>
              <TH numeric>Invoices</TH>
              <TH numeric>Products</TH>
              <TH>Last activity</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {businesses.map((b) => (
              <TR key={b.id}>
                <TD>
                  <span className="font-medium">{b.name}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    /store/{b.slug} · {b.stateCode}
                    {b.gstin ? ' · GST' : ' · unregistered'}
                  </span>
                </TD>
                <TD>
                  {b.ownerName}
                  <br />
                  <span className="text-xs text-muted-foreground">{b.ownerEmail}</span>
                </TD>
                <TD>
                  {b.status === 'active' ? (
                    <Badge variant="success">Paying</Badge>
                  ) : b.status === 'suspended' ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : b.status === 'trial' ? (
                    <>
                      <Badge variant="warning">Trial</Badge>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        ends {fmtDate(b.trialEndsAt)}
                      </span>
                    </>
                  ) : (
                    <Badge variant="outline">{b.status}</Badge>
                  )}
                </TD>
                <TD numeric>{b.invoiceCount}</TD>
                <TD numeric>{b.productCount}</TD>
                <TD className="text-xs text-muted-foreground">{fmtDate(b.lastInvoiceAt)}</TD>
                <TD>
                  <BusinessActions
                    businessId={b.id}
                    name={b.name}
                    status={b.status}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>

        {businesses.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No businesses match that search.
          </p>
        )}
      </section>
    </div>
  );
}

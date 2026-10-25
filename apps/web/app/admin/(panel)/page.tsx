import { getAdminStats, listAllBusinesses } from '@billwise/db';
import { evaluateAccess } from '@billwise/shared';
import {
  Badge,
  EmptyState,
  PageBody,
  PageHeader,
  Section,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { Activity, Building2, CreditCard, PauseCircle, SearchX, Timer } from 'lucide-react';
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
      : '-';

  return (
    <PageBody className="mx-auto max-w-6xl p-6 sm:p-8">
      <PageHeader
        title="Businesses"
        description="Metadata and counts only. No customer transaction data is shown here, by design."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Businesses" value={String(stats.businesses)} icon={Building2} />
        <StatCard label="On trial" value={String(stats.trialing)} icon={Timer} tone="warning" />
        <StatCard label="Paying" value={String(stats.paying)} icon={CreditCard} tone="success" />
        <StatCard
          label="Suspended"
          value={String(stats.suspended)}
          icon={PauseCircle}
          tone={stats.suspended > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          label="Active this week"
          value={String(stats.activeThisWeek)}
          hint={`${stats.invoices} invoices all time`}
          icon={Activity}
          tone="info"
        />
      </section>

      <Section title="All businesses" actions={<AdminSearch initial={q ?? ''} />}>
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
                  <AccessBadge
                    status={b.status}
                    trialEndsAt={b.trialEndsAt}
                    paidUntil={b.paidUntil}
                    fmtDate={fmtDate}
                  />
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
          <EmptyState
            icon={SearchX}
            title="No businesses match that search"
            description="Try an email address, a shop name, or clear the box to see everyone."
          />
        )}
      </Section>
    </PageBody>
  );
}

/**
 * What this business's access actually is, not what its status column says.
 *
 * ## The bug this replaces
 *
 * The badge used to read `status` alone, so anything `active` showed a green
 * "Paying" — including a shop whose paid month ran out five weeks ago. The
 * owner was being bounced to /app/billing while this screen said they were
 * fine, which is the worst possible split: the one place you go to check is
 * the one place that cannot tell you.
 *
 * ## Why `evaluateAccess` rather than a comparison here
 *
 * Because it is the same function the app guard uses. A second opinion written
 * on this page would drift from the first one, and then the admin panel would
 * be confidently wrong in a new way. One rule, read in two places.
 */
function AccessBadge({
  status,
  trialEndsAt,
  paidUntil,
  fmtDate,
}: {
  status: string;
  trialEndsAt: string | null;
  paidUntil: string | null;
  fmtDate: (iso: string | null) => string;
}) {
  const access = evaluateAccess({
    status: status as 'active' | 'trial' | 'suspended' | 'rejected' | 'pending',
    trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
    paidUntil: paidUntil ? new Date(paidUntil) : null,
  });

  if (access === 'ok' && status === 'active') {
    return (
      <>
        <Badge variant="success" dot>
          Paying
        </Badge>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {paidUntil ? `until ${fmtDate(paidUntil)}` : 'no end date'}
        </span>
      </>
    );
  }

  if (access === 'ok') {
    return (
      <>
        <Badge variant="warning" dot>
          Trial
        </Badge>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          ends {fmtDate(trialEndsAt)}
        </span>
      </>
    );
  }

  if (access === 'payment_due') {
    return (
      <>
        <Badge variant="destructive" dot>
          Payment due
        </Badge>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          ended {fmtDate(paidUntil)}
        </span>
      </>
    );
  }

  if (access === 'trial_expired') {
    return (
      <>
        <Badge variant="destructive" dot>
          Trial over
        </Badge>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          ended {fmtDate(trialEndsAt)}
        </span>
      </>
    );
  }

  if (access === 'suspended') {
    return (
      <Badge variant="destructive" dot>
        Suspended
      </Badge>
    );
  }

  return <Badge variant="outline">{access === 'rejected' ? 'Rejected' : status}</Badge>;
}

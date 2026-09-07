import { getApplicationCounts, getDashboardStats, getRecentInvoices, listApplications } from '@billwise/db';
import { APPLICATION_STATUS_LABELS } from '@billwise/shared';
import {
  Badge,
  Button,
  EmptyState,
  PageBody,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  tableLinkClass,
} from '@billwise/ui';
import {
  ArrowRight,
  BellRing,
  ClipboardList,
  IndianRupee,
  Plus,
  Receipt,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Dashboard' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * The Jan Seva Kendra home.
 *
 * A shop's dashboard answers "what did I sell and what is running out". A CSC's
 * answers something different, and the order here is the order the questions
 * come up at the counter:
 *
 *   1. what is late          — the customer who was promised Tuesday
 *   2. what is ready         — people to call in
 *   3. what money is owed    — half-paid work, which is most of it
 *   4. what came in today
 *
 * Stock, low stock and catalog views are absent because none of them exist for
 * this trade.
 */
export default async function SevaDashboard() {
  const ctx = await requireBusiness();

  const [{ businessName }, stats, work, ready, overdue, recent] = await Promise.all([
    requireMembership(),
    getDashboardStats(ctx),
    getApplicationCounts(ctx),
    listApplications(ctx, { status: 'ready', limit: 6 }),
    listApplications(ctx, { openOnly: true, limit: 60 }),
    getRecentInvoices(ctx, 6),
  ]);

  const late = overdue.filter((a) => a.isOverdue).slice(0, 6);

  return (
    <PageBody className="space-y-6">
      <section className="brand-wash relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lg shadow-primary/20 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 grid-lines [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.7rem] font-bold tracking-[0.12em] text-white/90 uppercase ring-1 ring-white/20">
              <ClipboardList className="size-3" /> Jan Seva Kendra
            </p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
              {businessName}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/80">
              Aaj ka kaam, kiska paisa baaki hai, aur kaunsa kaam taiyaar hai — sab ek jagah.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/app/seva/receipts/new">
              <Button size="lg" className="h-11 border-0 bg-white text-primary hover:bg-white/95">
                <Plus /> New receipt
              </Button>
            </Link>
            <Link href="/app/seva/work">
              <Button
                size="lg"
                variant="outline"
                className="h-11 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <ClipboardList /> Work
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Work in hand"
          value={String(work.open)}
          hint={work.open === 0 ? 'Nothing pending' : 'Applied, in process or ready'}
          icon={ClipboardList}
        />
        <StatCard
          label="Ready to collect"
          value={String(work.ready)}
          hint={work.ready === 0 ? 'Nobody to call' : 'Call the customer'}
          icon={BellRing}
          tone={work.ready > 0 ? 'success' : 'default'}
        />
        <StatCard
          label="Owed to you"
          value={inr(stats.totalOutstanding)}
          hint="Half-paid work and udhaar"
          icon={Wallet}
        />
        <StatCard
          label="Collected today"
          value={inr(stats.salesToday)}
          hint={`${stats.invoicesToday} ${stats.invoicesToday === 1 ? 'receipt' : 'receipts'} today`}
          icon={IndianRupee}
        />
      </section>

      {/* Late work first: it is the only thing on this page that is a problem
          right now, and it is the one a customer will phone about. */}
      {late.length > 0 && (
        <section className="rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-warning">
            <TriangleAlert className="size-4 shrink-0" />
            <h2 className="text-sm font-semibold">
              {work.overdue} {work.overdue === 1 ? 'job is' : 'jobs are'} past the date you promised
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {late.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-medium">{a.serviceName}</span>
                  {a.partyName && <span className="text-muted-foreground"> · {a.partyName}</span>}
                </span>
                <span className="tabular text-xs text-muted-foreground">
                  {a.expectedOn ? `due ${shortDate(a.expectedOn)}` : ''}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/app/seva/work?status=in_process"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-warning underline-offset-4 hover:underline"
          >
            See all <ArrowRight className="size-3.5" />
          </Link>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ready to collect</h2>
            <Link href="/app/seva/work?status=ready" className="text-sm text-muted-foreground hover:text-foreground">
              See all
            </Link>
          </div>
          {ready.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title="Nothing waiting"
              description="Work you mark as ready shows here, so you know who to call in."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Work</TH>
                  <TH>Customer</TH>
                  <TH numeric>Balance</TH>
                </TR>
              </THead>
              <TBody>
                {ready.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Link href={`/app/seva/work?q=${encodeURIComponent(a.serviceName)}`} className={tableLinkClass}>
                        {a.serviceName}
                      </Link>
                    </TD>
                    <TD>{a.partyName ?? '—'}</TD>
                    <TD numeric className={Number(a.balance) > 0 ? 'text-warning' : undefined}>
                      {Number(a.balance) > 0 ? inr(a.balance) : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent receipts</h2>
            <Link href="/app/seva/receipts" className="text-sm text-muted-foreground hover:text-foreground">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No receipts yet"
              description="Make your first receipt and it will show up here."
              action={
                <Link href="/app/seva/receipts/new">
                  <Button>
                    <Plus /> New receipt
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Number</TH>
                  <TH>Customer</TH>
                  <TH numeric>Total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {recent.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/app/seva/receipts/${r.id}`} className={tableLinkClass}>
                        {r.invoiceNo ?? 'Draft'}
                      </Link>
                    </TD>
                    <TD className="truncate">{r.partyName}</TD>
                    <TD numeric>{inr(r.grandTotal)}</TD>
                    <TD>
                      <Badge
                        variant={
                          r.paymentStatus === 'paid'
                            ? 'success'
                            : r.paymentStatus === 'partial'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {r.paymentStatus === 'paid'
                          ? 'Paid'
                          : r.paymentStatus === 'partial'
                            ? 'Part paid'
                            : 'Unpaid'}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        {work.deliveredThisMonth} {work.deliveredThisMonth === 1 ? 'job' : 'jobs'} delivered this
        month · {APPLICATION_STATUS_LABELS.delivered.toLowerCase()} work stays in the register for
        your records.
      </p>
    </PageBody>
  );
}

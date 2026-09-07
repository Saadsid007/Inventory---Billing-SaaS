import {
  getBusiness,
  getDashboardStats,
  getPlan,
  getRecentInvoices,
  getSettings,
} from '@billwise/db';
import { trialDaysRemaining } from '@billwise/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageBody,
  RowActions,
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
  Calendar,
  Eye,
  FileText,
  Hash,
  IndianRupee,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Store,
  TrendingUp,
  TriangleAlert,
  User,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';
import { SetupChecklist, type SetupStep } from './setup-checklist';
import { TrialReminder } from './trial-reminder';

export const metadata: Metadata = { title: 'Dashboard' };

const inr = (v: string) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/** Formats 2026-08-29 as 29 Aug — the invoice list is read by date, not by ISO. */
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * The dashboard.
 *
 * Answers, in this order, the four questions a shopkeeper opens the app with:
 * how much did I sell, how much am I owed, what is running out, and what did I
 * bill last. The primary action — make a bill — is the first thing on the page
 * and the first thing under the thumb on a phone, because that is what the
 * product is for.
 */
export default async function DashboardPage() {
  // Called again rather than trusted from the layout: a page is reachable on
  // its own during client-side navigation, and the guard is cached.
  const ctx = await requireBusiness();

  const [{ businessName, slug, status, trialEndsAt }, stats, recent, business, settings] =
    await Promise.all([
      requireMembership(),
      getDashboardStats(ctx),
      getRecentInvoices(ctx, 8),
      getBusiness(ctx),
      getSettings(ctx),
    ]);

  /**
   * What is still missing, and where to fix it.
   *
   * GSTIN is first because it is the one that changes what the product does:
   * without it there are no tax invoices at all, and finding that out halfway
   * through billing a customer is the worst moment to learn it.
   */
  const setupSteps: SetupStep[] = [
    {
      id: 'gstin',
      label: 'Add your GSTIN',
      hint: 'Needed for tax invoices. Skip it if you are not registered.',
      href: '/app/settings',
      done: Boolean(business?.gstin),
    },
    {
      id: 'address',
      label: 'Add your shop address and phone',
      hint: 'Printed on every bill and shown on your catalog.',
      href: '/app/settings',
      done: Boolean(business?.addressLine1 && business?.phone),
    },
    {
      id: 'product',
      label: 'Add your first product',
      hint: 'Billing gets much faster once your items are in.',
      href: '/app/products/new',
      done: stats.productCount > 0,
    },
    {
      id: 'invoice',
      label: 'Make your first bill',
      hint: 'Stock goes down by itself the moment you save it.',
      href: '/app/invoices/new',
      done: recent.length > 0,
    },
    {
      id: 'catalog',
      label: 'Switch on your online catalog',
      hint: 'Print the QR and put it on your counter.',
      href: '/app/settings',
      done: Boolean(settings?.catalogEnabled),
    },
  ];

  const trialDaysLeft =
    status === 'trial' && trialEndsAt ? trialDaysRemaining(trialEndsAt) : null;

  // Only while the reminder is on screen — a shop that has paid should not pay
  // for a round trip to look up a price it is not being quoted.
  const plan = trialDaysLeft !== null ? await getPlan('retail') : null;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <PageBody className="space-y-6">
      {trialDaysLeft !== null && trialEndsAt && plan && (
        <TrialReminder
          daysLeft={trialDaysLeft}
          monthlyPrice={plan.monthlyPrice}
          endsOn={trialEndsAt.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
          })}
        />
      )}

      {/* Hero — brand wash so the first viewport feels intentional, not empty. */}
      <section className="brand-wash relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lg shadow-primary/20 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 grid-lines [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-1/2 size-56 -translate-y-1/2 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-sky-300/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.7rem] font-bold tracking-[0.12em] text-white/90 uppercase backdrop-blur-sm ring-1 ring-white/20">
              <Store className="size-3" />
              {greeting}
            </p>
            <div className="space-y-1.5">
              <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
                {businessName}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-white/80">
                Your shop at a glance — sales, dues, stock, and the bills you just made.
              </p>
            </div>
            <Link
              href="/app/catalog"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/95 ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <QrCode className="size-3.5" />
              Public catalog · /store/{slug}
              <ArrowRight className="size-3.5 opacity-70" />
            </Link>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/app/invoices/new">
              <Button
                size="lg"
                className="h-11 border-0 bg-white text-primary shadow-md hover:bg-white/95 active:bg-white/90"
              >
                <Plus /> New bill
              </Button>
            </Link>
            <Link href="/app/products/new">
              <Button
                size="lg"
                variant="outline"
                className="h-11 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <PackagePlus /> Add product
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SetupChecklist steps={setupSteps} />

      <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sales today"
          value={inr(stats.salesToday)}
          hint={`${stats.invoicesToday} ${stats.invoicesToday === 1 ? 'bill' : 'bills'} made today`}
          icon={IndianRupee}
        />
        <StatCard
          label="This month"
          value={inr(stats.salesThisMonth)}
          hint={`${stats.invoicesThisMonth} ${stats.invoicesThisMonth === 1 ? 'bill' : 'bills'} so far`}
          icon={TrendingUp}
          tone="info"
        />
        <StatCard
          label="Owed to you"
          value={inr(stats.totalOutstanding)}
          hint={`Across ${stats.partyCount} ${stats.partyCount === 1 ? 'customer' : 'customers'}`}
          icon={Wallet}
          tone={Number(stats.totalOutstanding) > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Low stock"
          value={String(stats.lowStockCount)}
          hint={
            stats.lowStockCount > 0
              ? 'Needs restocking'
              : `All ${stats.productCount} products are fine`
          }
          icon={TriangleAlert}
          tone={stats.lowStockCount > 0 ? 'destructive' : 'success'}
        />
      </section>

      {stats.lowStockCount > 0 && (
        <Alert
          variant="warning"
          icon={TriangleAlert}
          title={`${stats.lowStockCount} ${stats.lowStockCount === 1 ? 'item is' : 'items are'} at or below your low-stock level`}
          action={
            <Link href="/app/products?low=1">
              <Button size="sm" variant="outline">
                See which <ArrowRight />
              </Button>
            </Link>
          }
        >
          Order these before a customer asks for something you have run out of.
        </Alert>
      )}

      {/* `min-w-0` on both columns is load-bearing. A grid item defaults to
          min-width:auto, so the invoice table's intrinsic width pushes the
          column wider than the page instead of scrolling inside it, and the
          whole dashboard spills out of the frame on a narrow screen. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0 space-y-3 rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.04] p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5 dark:ring-white/[0.04]">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-bold tracking-tight">Recent bills</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Latest invoices from your counter
              </p>
            </div>
            <Link
              href="/app/invoices"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              See all <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No bills yet"
              description="Make your first bill and it will show up here, with stock going down by itself."
              action={
                <Link href="/app/invoices/new">
                  <Button>
                    <Plus /> Make your first bill
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH icon={Hash}>Number</TH>
                  <TH icon={Calendar}>Date</TH>
                  <TH icon={User}>Customer</TH>
                  <TH icon={IndianRupee} numeric>
                    Total
                  </TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {recent.map((inv) => (
                  <TR key={inv.id}>
                    <TD>
                      <Link href={`/app/invoices/${inv.id}`} className={tableLinkClass}>
                        {inv.invoiceNo ?? 'Draft'}
                      </Link>
                    </TD>
                    <TD className="tabular whitespace-nowrap text-muted-foreground">
                      {shortDate(inv.invoiceDate)}
                    </TD>
                    <TD className="max-w-[12rem] truncate">{inv.partyName}</TD>
                    <TD numeric className="font-medium">
                      ₹{inv.grandTotal}
                    </TD>
                    <TD>
                      {inv.status === 'cancelled' ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : inv.status === 'draft' ? (
                        <Badge variant="outline">Draft</Badge>
                      ) : inv.paymentStatus === 'paid' ? (
                        <Badge variant="success" dot>
                          Paid
                        </Badge>
                      ) : inv.paymentStatus === 'partial' ? (
                        <Badge variant="warning" dot>
                          Part paid
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
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Quick actions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Jump straight into work</p>
          </div>
          <Card className="overflow-hidden divide-y divide-border/50 border-border/70 bg-gradient-to-b from-card to-muted/20 p-0 shadow-md ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
            <QuickAction
              href="/app/invoices/new"
              icon={Plus}
              label="New bill"
              hint="Sell something"
              accent="primary"
            />
            <QuickAction
              href="/app/products/new"
              icon={PackagePlus}
              label="Add a product"
              hint="Price, tax, stock"
              accent="sky"
            />
            <QuickAction
              href="/app/parties/new"
              icon={UserPlus}
              label="Add a customer"
              hint="For khata and GST bills"
              accent="emerald"
            />
            <QuickAction
              href="/app/stock"
              icon={PackagePlus}
              label="Stock in / out"
              hint="Received or damaged goods"
              accent="amber"
            />
            <QuickAction
              href="/app/catalog"
              icon={QrCode}
              label="Your QR poster"
              hint="Print it for the counter"
              accent="violet"
            />
          </Card>
        </section>
      </div>
    </PageBody>
  );
}

const accentMap = {
  primary: 'from-primary to-sky-600 text-white shadow-primary/30',
  sky: 'from-sky-500 to-cyan-600 text-white shadow-sky-500/30',
  emerald: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/30',
  amber: 'from-amber-500 to-orange-500 text-amber-950 shadow-amber-500/30',
  violet: 'from-violet-500 to-indigo-600 text-white shadow-violet-500/30',
} as const;

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  accent: keyof typeof accentMap;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-primary-subtle/50"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:rotate-2 ${accentMap[accent]}`}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

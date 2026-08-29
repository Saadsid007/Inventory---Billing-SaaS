import { getBusiness, getDashboardStats, getRecentInvoices, getSettings } from '@billwise/db';
import { MONTHLY_PRICE_INR, trialDaysRemaining } from '@billwise/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
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
import {
  ArrowRight,
  FileText,
  IndianRupee,
  PackagePlus,
  Plus,
  QrCode,
  TrendingUp,
  TriangleAlert,
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

  return (
    <PageBody>
      {trialDaysLeft !== null && trialEndsAt && (
        <TrialReminder
          daysLeft={trialDaysLeft}
          monthlyPrice={MONTHLY_PRICE_INR}
          endsOn={trialEndsAt.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
          })}
        />
      )}

      <PageHeader
        title={businessName}
        description={
          <>
            Your shop at a glance. Public catalog:{' '}
            <Link
              href="/app/catalog"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              /store/{slug}
            </Link>
          </>
        }
        actions={
          <Link href="/app/invoices/new">
            <Button size="lg">
              <Plus /> New bill
            </Button>
          </Link>
        }
      />

      <SetupChecklist steps={setupSteps} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          tone={stats.lowStockCount > 0 ? 'destructive' : 'default'}
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Section
          className="min-w-0"
          title="Recent bills"
          actions={
            <Link
              href="/app/invoices"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              See all
            </Link>
          }
        >
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
                        className="font-medium underline-offset-4 hover:text-primary hover:underline"
                      >
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
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Section>

        <Section className="min-w-0" title="Quick actions">
          <Card className="divide-y p-0">
            <QuickAction
              href="/app/invoices/new"
              icon={Plus}
              label="New bill"
              hint="Sell something"
            />
            <QuickAction
              href="/app/products/new"
              icon={PackagePlus}
              label="Add a product"
              hint="Price, tax, stock"
            />
            <QuickAction
              href="/app/parties/new"
              icon={UserPlus}
              label="Add a customer"
              hint="For khata and GST bills"
            />
            <QuickAction
              href="/app/stock"
              icon={PackagePlus}
              label="Stock in / out"
              hint="Received or damaged goods"
            />
            <QuickAction
              href="/app/catalog"
              icon={QrCode}
              label="Your QR poster"
              hint="Print it for the counter"
            />
          </Card>
        </Section>
      </div>
    </PageBody>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-primary-subtle/50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

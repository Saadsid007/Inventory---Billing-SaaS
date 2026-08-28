import { MONTHLY_PRICE_INR, trialDaysRemaining } from '@bahikhata/shared';
import { StatCard } from '@bahikhata/ui';
import type { Metadata } from 'next';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Phase 0b dashboard.
 *
 * Deliberately empty of numbers: there are no products, parties or invoices to
 * count yet, and a tile reading "₹0" would be indistinguishable from a broken
 * query. Phase 1g fills these in with today's sales, month's sales, outstanding
 * and low-stock counts.
 */
export default async function DashboardPage() {
  // Called again here rather than trusted from the layout: a page is reachable
  // on its own during client-side navigation, and the guard is cheap (cached).
  await requireBusiness();
  const { businessName, status, slug, trialEndsAt } = await requireMembership();

  const daysLeft = status === 'trial' && trialEndsAt ? trialDaysRemaining(trialEndsAt) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{businessName}</h1>
        <p className="text-sm text-muted-foreground">
          Public catalog: <code className="rounded bg-muted px-1 py-0.5 text-xs">/store/{slug}</code>
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
        <StatCard label="Sales today" value="—" hint="Phase 1" />
        <StatCard label="Sales this month" value="—" hint="Phase 1" />
        <StatCard label="Total outstanding" value="—" hint="Phase 1" />
        <StatCard label="Low stock items" value="—" hint="Phase 1" />
      </section>

      <section className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Phase 0b complete</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Auth, tenancy and trials are working. Next up: the tax engine, place of supply, and
          invoice numbering — all pure functions, no database required.
        </p>
      </section>
    </div>
  );
}

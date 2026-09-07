import { getPlan } from '@billwise/db';
import { trialDaysRemaining } from '@billwise/shared';
import { Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppFrame } from '@/components/app-frame';
import {
  isSuperAdminLive,
  requireBusiness,
  requireMembership,
  requireUser,
} from '@/lib/auth/require-business';

/**
 * Guard for everything inside the app.
 *
 * `requireBusiness()` redirects to /app/subscribe unless the business is on an
 * open trial or a paid plan. Note that /app/subscribe sits OUTSIDE this route
 * group precisely so it does not inherit this guard and redirect to itself.
 *
 * A layout guard does not protect a mutation — every server action under /app
 * must call `requireBusiness()` itself.
 */
/** Nothing behind a login should ever be indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireBusiness();

  // Cached per request, so this shares the read requireBusiness() just did.
  const [{ businessName, status, trialEndsAt, type }, user] = await Promise.all([
    requireMembership(),
    requireUser(),
  ]);

  /*
   * A Jan Seva Kendra has no business in the shop section.
   *
   * The sidebar no longer links here, but a bookmark, a stale tab or a typed
   * URL still would — and landing on Stock or Categories with a shop's sidebar
   * is exactly the "why did my app change" the seva nav was built to stop.
   * Guarding the layout closes it for every page under the group at once,
   * rather than one redirect per file that somebody will forget to add.
   */
  if (type === 'jan_seva') redirect('/app/seva');

  const daysLeft = status === 'trial' && trialEndsAt ? trialDaysRemaining(trialEndsAt) : null;

  const statusLabel =
    daysLeft === null
      ? undefined
      : daysLeft === 1
        ? 'Trial · last day'
        : `Trial · ${daysLeft} days left`;

  // Only shout in the last three days. A banner on day one of ten is nagging,
  // and a shopkeeper learns to look past it long before it matters.
  const urgent = daysLeft !== null && daysLeft <= 3;

  /*
   * Only fetched when the banner is actually going to render. This layout wraps
   * every page in the section, and a query on each one to print a price nobody
   * is being shown is a round trip for nothing.
   */
  const plan = urgent ? await getPlan(type) : null;

  return (
    <AppFrame
      businessName={businessName}
      businessType={type}
      statusLabel={statusLabel}
      statusTone={urgent ? 'warning' : 'default'}
      userName={user.name || user.email}
      userEmail={user.email}
      // Read live rather than from the token. The token only changes at login,
      // so someone promoted this morning would not see the link for a month.
      isSuperAdmin={await isSuperAdminLive(user.id)}
      banner={
        urgent && plan ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning sm:px-6">
            <Clock className="size-4 shrink-0" />
            <span className="font-medium">
              {daysLeft === 1 ? 'Your free trial ends today.' : `Free trial ends in ${daysLeft} days.`}
            </span>
            <span className="opacity-90">
              Keep everything for ₹{plan.monthlyPrice} a month. Your data stays either way.
            </span>
            <Link href="/app/billing" className="font-semibold underline underline-offset-4">
              Subscribe
            </Link>
          </div>
        ) : undefined
      }
    >
      {children}
    </AppFrame>
  );
}

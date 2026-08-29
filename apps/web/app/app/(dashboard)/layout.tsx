import { MONTHLY_PRICE_INR, trialDaysRemaining } from '@billwise/shared';
import { Clock } from 'lucide-react';
import Link from 'next/link';
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
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireBusiness();

  // Cached per request, so this shares the read requireBusiness() just did.
  const [{ businessName, status, trialEndsAt }, user] = await Promise.all([
    requireMembership(),
    requireUser(),
  ]);

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

  return (
    <AppFrame
      businessName={businessName}
      statusLabel={statusLabel}
      statusTone={urgent ? 'warning' : 'default'}
      userName={user.name || user.email}
      userEmail={user.email}
      // Read live rather than from the token. The token only changes at login,
      // so someone promoted this morning would not see the link for a month.
      isSuperAdmin={await isSuperAdminLive(user.id)}
      banner={
        urgent ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning sm:px-6">
            <Clock className="size-4 shrink-0" />
            <span className="font-medium">
              {daysLeft === 1 ? 'Your free trial ends today.' : `Free trial ends in ${daysLeft} days.`}
            </span>
            <span className="opacity-90">
              Keep everything for ₹{MONTHLY_PRICE_INR} a month — your data stays either way.
            </span>
            <Link href="/app/subscribe" className="font-semibold underline underline-offset-4">
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

import { MONTHLY_PRICE_INR, trialDaysRemaining } from '@billwise/shared';
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
 * The Jan Seva Kendra section.
 *
 * Same guard, same shell, same data as the shop side — only the navigation and
 * the screens differ. A layout guard still does not protect a mutation: every
 * server action under here calls `requireBusiness()` itself.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SevaLayout({ children }: { children: React.ReactNode }) {
  await requireBusiness();

  const [{ businessName, status, trialEndsAt, type }, user] = await Promise.all([
    requireMembership(),
    requireUser(),
  ]);

  // A shop that wanders in here would get a nav with no stock and no invoices.
  // Send it home rather than render a half-useful screen.
  if (type !== 'jan_seva') redirect('/app');

  const daysLeft = status === 'trial' && trialEndsAt ? trialDaysRemaining(trialEndsAt) : null;
  const statusLabel =
    daysLeft === null
      ? undefined
      : daysLeft === 1
        ? 'Trial · last day'
        : `Trial · ${daysLeft} days left`;
  const urgent = daysLeft !== null && daysLeft <= 3;

  return (
    <AppFrame
      businessName={businessName}
      businessType={type}
      statusLabel={statusLabel}
      statusTone={urgent ? 'warning' : 'default'}
      userName={user.name || user.email}
      userEmail={user.email}
      isSuperAdmin={await isSuperAdminLive(user.id)}
      banner={
        urgent ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning sm:px-6">
            <Clock className="size-4 shrink-0" />
            <span className="font-medium">
              {daysLeft === 1
                ? 'Your free trial ends today.'
                : `Free trial ends in ${daysLeft} days.`}
            </span>
            <span className="opacity-90">
              Keep everything for ₹{MONTHLY_PRICE_INR} a month. Your data stays either way.
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

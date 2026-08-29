import { trialDaysRemaining } from '@billwise/shared';
import type { Metadata } from 'next';
import { AppFrame } from '@/components/app-frame';
import { isSuperAdminLive, requireMembership, requireUser } from '@/lib/auth/require-business';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Billing sits outside the `(dashboard)` route group on purpose.
 *
 * That group's layout calls `requireBusiness()`, which sends anyone whose trial
 * has ended to this very page. If billing lived inside it, a shopkeeper trying
 * to pay would be redirected to the page they were already on, forever.
 *
 * So the guard here is `requireMembership()`: resolve the tenant, do not gate
 * on whether they are allowed in. It still renders the full app shell, because
 * someone who has just paid should land back in their own shop rather than on a
 * bare page that looks like a different product.
 */
export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const [{ businessName, status, trialEndsAt }, user] = await Promise.all([
    requireMembership(),
    requireUser(),
  ]);

  const daysLeft = status === 'trial' && trialEndsAt ? trialDaysRemaining(trialEndsAt) : null;

  return (
    <AppFrame
      businessName={businessName}
      statusLabel={
        daysLeft === null
          ? undefined
          : daysLeft === 1
            ? 'Trial, last day'
            : `Trial, ${daysLeft} days left`
      }
      statusTone={daysLeft !== null && daysLeft <= 3 ? 'warning' : 'default'}
      userName={user.name || user.email}
      userEmail={user.email}
      isSuperAdmin={await isSuperAdminLive(user.id)}
    >
      {children}
    </AppFrame>
  );
}

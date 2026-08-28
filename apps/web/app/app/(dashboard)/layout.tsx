import { trialDaysRemaining } from '@bahikhata/shared';
import { AppFrame } from '@/components/app-frame';
import { requireBusiness, requireMembership, requireUser } from '@/lib/auth/require-business';

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

  return (
    <AppFrame
      businessName={businessName}
      statusLabel={
        daysLeft === null
          ? undefined
          : daysLeft === 1
            ? 'Trial · last day'
            : `Trial · ${daysLeft} days left`
      }
      userName={user.name || user.email}
    >
      {children}
    </AppFrame>
  );
}

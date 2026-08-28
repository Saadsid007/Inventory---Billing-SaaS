import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@bahikhata/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ThemeToggle,
} from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMembership } from '@/lib/auth/require-business';
import { SignOutLink } from './sign-out-link';

export const metadata: Metadata = { title: 'Subscription' };

/**
 * The one page reachable when a business cannot use the app.
 *
 * Lives OUTSIDE the `(dashboard)` route group so it does not inherit
 * `requireBusiness()` and redirect to itself. It uses `requireMembership()`,
 * which resolves the tenant without gating on access.
 */
export default async function SubscribePage() {
  const { businessName, access, trialEndsAt } = await requireMembership();

  // Paid (or the trial is still open) while they sat on this page — let them
  // straight in rather than making them find the back button.
  if (access === 'ok') {
    redirect('/app');
  }

  const copy = {
    trial_expired: {
      title: `Your ${TRIAL_DAYS}-day free trial has ended`,
      body: 'All your data — products, parties and invoices — is safe. Subscribe and everything comes back exactly as you left it.',
    },
    suspended: {
      title: 'This account is suspended',
      body: 'Your data is safe. Get in touch with us to reactivate the account.',
    },
    rejected: {
      title: 'This account is not available',
      body: 'If you think this is a mistake, email us and we will take another look.',
    },
    unknown: {
      title: 'This account is not available right now',
      body: 'Something went wrong. Please get in touch with us.',
    },
    ok: { title: '', body: '' },
  }[access];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Bahikhata
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.body}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {access === 'trial_expired' && (
              <div className="rounded-lg border p-5">
                <div className="flex items-baseline gap-1">
                  <span className="tabular text-3xl font-semibold">₹{MONTHLY_PRICE_INR}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li>• Unlimited bills, products and parties</li>
                  <li>• GST and non-GST billing</li>
                  <li>• Public catalog with a QR code</li>
                  <li>• CA-ready export at year end</li>
                </ul>
              </div>
            )}

            <dl className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Business</dt>
                <dd className="truncate font-medium">{businessName}</dd>
              </div>
              {trialEndsAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Trial ended</dt>
                  <dd className="font-medium">
                    {trialEndsAt.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>

            {/*
              Payment is handled outside the product — a Razorpay link, UPI, or
              a bank transfer — and the account is switched to 'active' once it
              lands. In-app checkout is explicitly out of scope (spec §7).
              Phase 3 replaces this with Razorpay subscription automation.
            */}
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              To subscribe, message us on WhatsApp or send an email. Your account is reactivated
              the same day the payment reaches us.
            </div>

            <SignOutLink />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

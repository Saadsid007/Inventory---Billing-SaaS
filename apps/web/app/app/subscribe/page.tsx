import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@bahikhata/shared';
import { Badge, Card, CardContent, CardHeader, CardTitle, ThemeToggle } from '@bahikhata/ui';
import { Check, MessageCircle } from 'lucide-react';
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
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            B
          </span>
          <span className="text-lg font-semibold tracking-tight">Bahikhata</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:pb-20">
        <Card className="w-full max-w-lg overflow-hidden p-0 shadow-md">
          <CardHeader className="gap-2 border-b bg-muted/40">
            <Badge variant="warning" className="w-fit" dot>
              Access paused
            </Badge>
            <CardTitle className="text-xl">{copy.title}</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            {access === 'trial_expired' && (
              <div className="brand-wash rounded-xl p-6 text-white">
                <div className="flex items-baseline gap-1.5">
                  <span className="tabular text-4xl font-semibold">₹{MONTHLY_PRICE_INR}</span>
                  <span className="text-sm text-white/80">/ month</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-white/90">
                  {[
                    'Unlimited bills, products and customers',
                    'GST and non-GST billing',
                    'Public catalog with a QR code',
                    'CA-ready exports at year end',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0" />
                      {item}
                    </li>
                  ))}
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
            <div className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="leading-relaxed">
                To subscribe, message us on WhatsApp or send an email. Your account is switched
                back on the same day the payment reaches us — nothing is lost in the meantime.
              </p>
            </div>

            <SignOutLink />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

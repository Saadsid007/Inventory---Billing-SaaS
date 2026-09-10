import { listPlans } from '@billwise/db';
import { TRIAL_DAYS } from '@billwise/shared';
import { Badge, Button, Card } from '@billwise/ui';
import { ArrowRight, Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { MarketingFooter, MarketingHeader } from '@/components/marketing-chrome';

export const metadata: Metadata = {
  title: { absolute: 'Pricing · Billwise' },
  description: `One price per kind of business, everything included, after ${TRIAL_DAYS} days free. No card required to start.`,
  alternates: { canonical: '/pricing' },
};

/**
 * Prices come from the database, not from this file.
 *
 * Which means this page cannot be built once at deploy time — an admin who
 * changes a price expects the public page to say so within the minute, not at
 * the next release.
 */
export const revalidate = 60;

export default async function PricingPage() {
  const [session, plans] = await Promise.all([auth(), listPlans()]);
  const signedIn = Boolean(session?.user?.id);
  const sold = plans.filter((p) => p.isActive);

  // Cheapest first. "From ₹149" is the honest headline, and putting the small
  // counter's plan first stops it reading as an afterthought under the shop's.
  sold.sort((a, b) => Number(a.monthlyPrice) - Number(b.monthlyPrice));
  const cheapest = sold[0];

  return (
    <div className="min-h-dvh">
      <MarketingHeader />

      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center">
          <Badge variant="subtle" className="mb-4">
            No tiers, no per-bill charges
          </Badge>
          <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
            One price for your kind of business
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {TRIAL_DAYS} days free
            {cheapest ? `, then from ₹${Number(cheapest.monthlyPrice).toFixed(0)} a month` : ''}.
            No card needed to start.
          </p>
        </div>

        {/* Columns follow the number of plans, so a third vertical does not
            leave one card stranded on its own row. */}
        <div
          className={`mt-10 grid gap-6 ${
            sold.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'
          }`}
        >
          {sold.map((plan) => (
            <Card key={plan.businessType} className="flex flex-col overflow-hidden p-0 shadow-md">
              <div className="brand-wash flex flex-col gap-2 p-7 text-white sm:p-8">
                <span className="text-sm font-medium text-white/85">{plan.label}</span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="tabular text-4xl font-semibold">
                    ₹{Number(plan.monthlyPrice).toFixed(0)}
                  </span>
                  <span className="text-white/80">per month</span>
                </div>
                {plan.tagline && (
                  <p className="text-sm leading-relaxed text-white/85">{plan.tagline}</p>
                )}
              </div>

              <div className="flex flex-1 flex-col p-7 sm:p-8">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Everything included
                </p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {plan.features.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={signedIn ? '/app/billing' : '/register'} className="mt-6 block">
                  <Button className="w-full" size="lg">
                    {signedIn ? 'Go to billing' : `Start ${plan.trialDays} days free`}{' '}
                    <ArrowRight />
                  </Button>
                </Link>
                <p className="mt-3 text-xs text-muted-foreground">
                  Stop by simply not paying. Your data is never deleted.
                </p>
              </div>
            </Card>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="text-xl font-semibold">Questions people actually ask</h2>
          <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <Faq
              q="How do I know which one I am?"
              a="You pick when you sign up, and it decides which screens you get. A shop and a medical store both get stock, GST and a catalog — the medical store just calls them medicines. A Jan Seva Kendra gets a work register and receipts instead, with no stock anywhere in the app."
            />
            <Faq
              q="What happens when the free trial ends?"
              a="Your data stays exactly where it is. You will not be able to make new bills until you subscribe, and everything comes back the moment you do. Nothing is deleted."
            />
            <Faq
              q="How do I pay?"
              a="Message us and we will send a payment link or UPI details. Your account is switched on the same day the payment reaches us. There is no card stored in the app."
            />
            <Faq
              q="I am not registered for GST. Can I still use it?"
              a="Yes. Leave the GSTIN blank and the GST fields disappear entirely. You bill with cash memos instead of tax invoices, and nothing on screen asks you about tax."
            />
            <Faq
              q="Does it file my GST returns?"
              a="No. It gives you clean, correct data and exports your CA can work from. Filing stays with you and your accountant."
            />
            <Faq
              q="What if I have more than one shop?"
              a="One subscription covers one business today. Multiple branches under one login is planned; tell us if you need it and we will tell you where it is."
            />
          </div>
        </section>

        <div className="mt-16 rounded-xl border bg-muted/30 p-8 text-center">
          <h2 className="text-lg font-semibold">Still deciding?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            The trial is the whole product, not a limited demo. Bill a real day with it and see.
          </p>
          <Link href={signedIn ? '/app/billing' : '/register'}>
            <Button className="mt-5">
              {signedIn ? 'Go to billing' : 'Create an account'} <ArrowRight />
            </Button>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="font-medium">{q}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </div>
  );
}

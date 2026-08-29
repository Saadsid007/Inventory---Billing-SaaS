import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Badge, Button, Card } from '@billwise/ui';
import { ArrowRight, Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { MarketingFooter, MarketingHeader } from '@/components/marketing-chrome';

export const metadata: Metadata = {
  title: { absolute: `Pricing: ₹${MONTHLY_PRICE_INR} a month · Billwise` },
  description: `One plan, everything included: ₹${MONTHLY_PRICE_INR} per month after ${TRIAL_DAYS} days free. No card required to start.`,
  alternates: { canonical: '/pricing' },
};

const INCLUDED = [
  'Unlimited bills, products and customers',
  'GST and non-GST billing',
  'Tax invoice, bill of supply, cash memo, estimate, delivery challan',
  'A4 and 80mm thermal printing',
  'Automatic stock tracking with low-stock alerts',
  'Customer khata with running balance',
  'Public product catalog with a QR code',
  'Sales, tax, stock and outstanding reports',
  'CSV exports for your accountant',
  'Works on phone, tablet and laptop',
];

export default async function PricingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <div className="min-h-dvh">
      <MarketingHeader />

      <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center">
          <Badge variant="subtle" className="mb-4">
            One plan
          </Badge>
          <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
            No tiers to work out
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {TRIAL_DAYS} days free, then ₹{MONTHLY_PRICE_INR} a month.
          </p>
        </div>

        <Card className="mt-10 overflow-hidden p-0 shadow-md">
          <div className="grid md:grid-cols-[1fr_1.15fr]">
            <div className="brand-wash flex flex-col justify-center gap-3 p-8 text-white sm:p-10">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="tabular text-5xl font-semibold">₹{MONTHLY_PRICE_INR}</span>
                <span className="text-white/80">per month</span>
              </div>
              <p className="text-sm leading-relaxed text-white/85">
                Free for your first {TRIAL_DAYS} days. No card needed to start, and no approval to
                wait for.
              </p>
              <Link href={signedIn ? '/app/billing' : '/register'} className="mt-3">
                <Button
                  size="lg"
                  className="w-full bg-white text-primary shadow-sm hover:bg-white/90 active:bg-white/90"
                >
                  {signedIn ? 'Subscribe now' : `Start ${TRIAL_DAYS} days free`} <ArrowRight />
                </Button>
              </Link>
              <p className="text-xs text-white/70">
                Stop by simply not paying. Your data is never deleted.
              </p>
            </div>

            <div className="p-8 sm:p-10">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Everything included
              </p>
              <ul className="mt-4 space-y-2.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <section className="mt-16">
          <h2 className="text-xl font-semibold">Questions people actually ask</h2>
          <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
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
              q="Can my customers see my stock levels?"
              a="They see whether something is in stock, low, or out, never the exact number. Your competitors read your catalog too."
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

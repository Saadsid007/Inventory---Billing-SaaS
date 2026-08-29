import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@bahikhata/shared';
import { ThemeToggle } from '@bahikhata/ui';
import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { absolute: `Pricing — ₹${MONTHLY_PRICE_INR} a month · Bahikhata` },
  description: `One plan, everything included: ₹${MONTHLY_PRICE_INR} per month after ${TRIAL_DAYS} days free. No card required to start.`,
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

export default function PricingPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Bahikhata
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm hover:underline">
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            One plan. No tiers to work out.
          </h1>
          <p className="mt-3 text-muted-foreground">
            {TRIAL_DAYS} days free, then ₹{MONTHLY_PRICE_INR} a month.
          </p>
        </div>

        <div className="mt-10 rounded-xl border p-8">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="tabular text-4xl font-semibold">₹{MONTHLY_PRICE_INR}</span>
            <span className="text-muted-foreground">per month</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Free for your first {TRIAL_DAYS} days. No card needed to start, and no approval to
            wait for.
          </p>

          <ul className="mt-7 space-y-2.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start {TRIAL_DAYS} days free
          </Link>
        </div>

        <section className="mt-12 space-y-6">
          <h2 className="text-lg font-medium">Questions people actually ask</h2>

          <Faq
            q="What happens when the free trial ends?"
            a={`Your data stays exactly where it is. You will not be able to make new bills until you subscribe, and everything comes back the moment you do. Nothing is deleted.`}
          />
          <Faq
            q="How do I pay?"
            a="Message us and we will send a payment link or UPI details. Your account is switched on the same day the payment reaches us. There is no card stored in the app."
          />
          <Faq
            q="I am not registered for GST. Can I still use it?"
            a="Yes. Leave the GSTIN blank and the GST fields disappear entirely — you bill with cash memos instead of tax invoices, and nothing on screen asks you about tax."
          />
          <Faq
            q="Does it file my GST returns?"
            a="No. It gives you clean, correct data and exports your CA can work from. Filing stays with you and your accountant."
          />
          <Faq
            q="Can my customers see my stock levels?"
            a="They see whether something is in stock, low, or out — never the exact number. Your competitors read your catalog too."
          />
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{q}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{a}</p>
    </div>
  );
}

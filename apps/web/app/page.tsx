import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@bahikhata/shared';
import { ThemeToggle } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { absolute: 'Bahikhata — Billing, stock and khata for Indian shops' },
  description: `Make GST and non-GST bills, track stock, see who owes you money, and put your products online with a QR code. ${TRIAL_DAYS} days free, then ₹${MONTHLY_PRICE_INR} a month.`,
};

/**
 * Marketing home. Build spec Phase 1g and §10.
 *
 * §10: "launch messaging must target one niche". The copy leans on kirana and
 * general stores — the vertical to win first — while the product itself stays
 * general purpose. Broadening the marketing later costs a page edit; building
 * per-vertical code would cost a rewrite.
 */
export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-lg font-semibold tracking-tight">Bahikhata</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm hover:underline">
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start free
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Billing, stock and khata for your shop
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Make a bill in seconds, watch your stock go down by itself, and know exactly who
            owes you money — without a register or a spreadsheet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start {TRIAL_DAYS} days free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center rounded-md border px-6 text-sm font-medium hover:bg-accent"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No card needed. No waiting for approval — you are billing in a minute.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              title="Bills that print properly"
              body="GST and non-GST. A4 for your file, 80mm for the thermal printer on your counter. Tax invoice, bill of supply, cash memo, estimate, delivery challan."
            />
            <Feature
              title="Stock that keeps itself"
              body="Every bill takes stock down automatically. Cancel a bill and it goes back. Get told when something is running low."
            />
            <Feature
              title="Khata without the register"
              body="See what every customer owes at a glance, with a running balance you can show them."
            />
            <Feature
              title="Your shop, online"
              body="A public page with your products, kept in sync by itself. Print the QR code, stick it on your counter, and customers can browse and message you on WhatsApp."
              highlight
            />
            <Feature
              title="Ready for your CA"
              body="Sales, tax by rate, stock value and outstanding — all exportable as CSV at year end."
            />
            <Feature
              title="Works on your phone"
              body="No installation. Open it on the shop counter, on your phone, or on a laptop at home."
            />
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              ₹{MONTHLY_PRICE_INR} a month. That is the whole price.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything included. {TRIAL_DAYS} days free first, so you can decide with your
              own bills rather than a demo.
            </p>
            <Link
              href="/register"
              className="mt-7 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted-foreground">
          <span>Bahikhata</span>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  title,
  body,
  highlight,
}: {
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-lg border border-primary/40 bg-primary/5 p-5'
          : 'rounded-lg border p-5'
      }
    >
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Badge, Button, Card } from '@billwise/ui';
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Package,
  QrCode,
  Smartphone,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { MarketingFooter, MarketingHeader } from '@/components/marketing-chrome';

export const metadata: Metadata = {
  title: { absolute: 'Billwise: billing, stock and khata for Indian shops' },
  description: `Make GST and non-GST bills, track stock, see who owes you money, and put your products online with a QR code. ${TRIAL_DAYS} days free, then ₹${MONTHLY_PRICE_INR} a month.`,
  alternates: { canonical: '/' },
};

/**
 * Structured data.
 *
 * `SoftwareApplication` with an `offers` block is what lets a search result
 * show the price next to the link. For a product whose entire pitch is "one
 * plan, ₹299", having that visible before the click is worth more than any
 * amount of copy on the page.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Billwise',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: `Billing, stock and khata software for Indian shops. ${TRIAL_DAYS} days free, then ₹${MONTHLY_PRICE_INR} a month.`,
  offers: {
    '@type': 'Offer',
    price: MONTHLY_PRICE_INR,
    priceCurrency: 'INR',
    category: 'subscription',
  },
  featureList: [
    'GST and non-GST invoicing',
    'Automatic stock tracking',
    'Customer khata with running balance',
    'Public product catalog with QR code',
    'Sales, tax and stock reports',
  ],
};

/**
 * Marketing home. Build spec Phase 1g and §10.
 *
 * §10: "launch messaging must target one niche". The copy leans on kirana and
 * general stores — the vertical to win first — while the product itself stays
 * general purpose. Broadening the marketing later costs a page edit; building
 * per-vertical code would cost a rewrite.
 *
 * Everything above the fold is written for someone standing behind a counter,
 * not for a procurement committee: no "platform", no "solution", no "seamless".
 */

const FEATURES = [
  {
    icon: FileText,
    title: 'Bills that print properly',
    body: 'GST and non-GST. A4 for your file, 80mm for the thermal printer on your counter. Tax invoice, bill of supply, cash memo, estimate, delivery challan.',
  },
  {
    icon: Package,
    title: 'Stock that keeps itself',
    body: 'Every bill takes stock down automatically. Cancel a bill and it comes straight back. You get told when something is running low.',
  },
  {
    icon: Users,
    title: 'Khata without the register',
    body: 'See what every customer owes at a glance, with a running balance you can turn the screen around and show them.',
  },
  {
    icon: QrCode,
    title: 'Your shop, online',
    body: 'A public page with your products, kept in sync by itself. Print the QR, stick it on the counter, and customers browse and message you on WhatsApp.',
    highlight: true,
  },
  {
    icon: BarChart3,
    title: 'Ready for your CA',
    body: 'Sales, tax by rate, stock value and outstanding, all exportable as CSV at year end in a form an accountant can actually use.',
  },
  {
    icon: Smartphone,
    title: 'Works on your phone',
    body: 'Nothing to install. Open it on the shop counter, on your phone between customers, or on a laptop at home after closing.',
  },
];

const STEPS = [
  {
    title: 'Add what you sell',
    body: 'Name, price, and tax rate if you are registered. Add the rest later. You can start with five things.',
  },
  {
    title: 'Make a bill',
    body: 'Pick the customer, pick the items, print or share. Stock goes down on its own the moment you save.',
  },
  {
    title: 'See where you stand',
    body: 'Sales today, money owed to you, what is running out. All of it on one screen, without a spreadsheet.',
  },
];

export default async function HomePage() {
  // Someone who is already logged in should never be offered "start free" as
  // the main action on their own product's home page.
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
            <Badge variant="subtle" className="mb-5">
              {TRIAL_DAYS} days free · no card needed
            </Badge>
            <h1 className="text-4xl font-semibold text-balance sm:text-5xl md:text-[3.4rem] md:leading-[1.05]">
              Billing, stock and khata for your shop
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-balance text-muted-foreground">
              Make a bill in seconds, watch your stock go down by itself, and know exactly who owes
              you money, without a register or a spreadsheet.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href={signedIn ? '/app' : '/register'}>
                <Button size="lg">
                  {signedIn ? 'Go to your dashboard' : `Start ${TRIAL_DAYS} days free`}
                  <ArrowRight />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  See pricing
                </Button>
              </Link>
            </div>
            {!signedIn && (
              <p className="mt-5 text-sm text-muted-foreground">
                Nothing to approve, nothing to install. You can bill in a minute.
              </p>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, highlight }) => (
              <Card
                key={title}
                className={
                  highlight
                    ? 'border-primary/30 bg-primary-subtle/40 p-6'
                    : 'p-6 transition-shadow hover:shadow-md'
                }
              >
                <span
                  className={`mb-4 grid size-10 place-items-center rounded-lg ${
                    highlight
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary-subtle text-primary-subtle-foreground'
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Three steps, and you are running
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                There is no setup project and no training. Most shops make their first real bill
                the same afternoon they sign up.
              </p>
            </div>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="tabular grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-xs">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Price */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="brand-wash overflow-hidden rounded-2xl px-6 py-14 text-center text-white sm:px-12">
            <h2 className="text-2xl font-semibold text-balance sm:text-3xl">
              ₹{MONTHLY_PRICE_INR} a month. That is the whole price.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-balance text-white/85">
              Everything included, no tiers to work out. {TRIAL_DAYS} days free first, so you can
              decide with your own bills rather than a demo.
            </p>
            <ul className="mx-auto mt-7 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/90">
              {[
                'Unlimited bills',
                'Unlimited products',
                'GST and non-GST',
                'Your catalog and QR',
                'CSV exports',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-4" /> {item}
                </li>
              ))}
            </ul>
            <Link href={signedIn ? '/app' : '/register'}>
              <Button
                size="lg"
                className="mt-9 bg-white text-primary shadow-sm hover:bg-white/90 active:bg-white/90"
              >
                {signedIn ? 'Go to your dashboard' : 'Start free'} <ArrowRight />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

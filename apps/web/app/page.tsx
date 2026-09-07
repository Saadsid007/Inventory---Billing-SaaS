import { FROM_PRICE_INR, MONTHLY_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Badge, Button, Card } from '@billwise/ui';
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  FileText,
  IndianRupee,
  Package,
  Printer,
  QrCode,
  ShieldCheck,
  Smartphone,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { MarketingFooter, MarketingHeader } from '@/components/marketing-chrome';

export const metadata: Metadata = {
  title: { absolute: 'Billwise: GST billing, stock and khata software for Indian shops' },
  description: `Billing software for kirana, general, hardware and retail shops. Make GST and non-GST bills in seconds, track stock automatically, keep a customer khata, and put your products online with a QR code. ${TRIAL_DAYS} days free, then from ₹${FROM_PRICE_INR} a month.`,
  alternates: { canonical: '/' },
};

/**
 * Marketing home. Build spec Phase 1g and §10.
 *
 * §10: "launch messaging must target one niche". The copy leans on kirana and
 * general stores, the vertical to win first, while the product itself stays
 * general purpose. Broadening the marketing later costs a page edit; building
 * per-vertical code would cost a rewrite.
 *
 * The page is long on purpose. A shopkeeper deciding whether to trust software
 * with their books reads more than a headline, and the same detail is what a
 * search engine has to work with. Every section answers a question somebody
 * actually types.
 */

const FEATURES = [
  {
    icon: FileText,
    title: 'Bills that print properly',
    body: 'Tax invoice, bill of supply, cash memo, estimate and delivery challan. CGST and SGST inside your state, IGST outside it, worked out per line and rounded the way the law expects.',
  },
  {
    icon: Package,
    title: 'Stock that keeps itself',
    body: 'Every bill takes stock down the moment you save it. Cancel a bill and it comes straight back. Record breakage or a delivery in seconds, and get told before something runs out.',
  },
  {
    icon: Users,
    title: 'Khata without the register',
    body: 'A running balance for every customer, with each bill and payment listed in order. Turn the screen around and show them, instead of arguing over a diary.',
  },
  {
    icon: QrCode,
    title: 'Your shop, online',
    body: 'A public page with your products, kept in sync by itself. Print the QR, stick it on the counter, and customers browse and message you on WhatsApp.',
    highlight: true,
  },
  {
    icon: Undo2,
    title: 'Returns handled honestly',
    body: 'Record what came back, and stock goes up while the customer owes less. The original bill stays exactly as printed, so your paper and your records never disagree.',
  },
  {
    icon: BarChart3,
    title: 'Ready for your CA',
    body: 'Sales and returns exported line by line with HSN, rate and the tax split, so net taxable sales works out without a single manual sum.',
  },
];

const STEPS = [
  {
    title: 'Add what you sell',
    body: 'Name and price is enough to start. Add HSN and GST rate if you are registered, and it fills in on every bill from then on.',
  },
  {
    title: 'Make a bill',
    body: 'Pick the customer, pick the items, print or share. Tax, stock and the customer khata all update themselves as you save.',
  },
  {
    title: 'See where you stand',
    body: 'Sales today, money owed to you, what is running low. One screen, no spreadsheet, correct at the moment you look at it.',
  },
];

const AUDIENCES = [
  'Kirana and general stores',
  'Hardware and building material',
  'Mobile and electronics shops',
  'Clothing and footwear',
  'Stationery and book shops',
  'Wholesale and distribution',
  'Pharmacies and medical stores',
  'Anyone billing by hand today',
];

const FAQ = [
  {
    q: 'Is this GST billing software?',
    a: 'Yes. It produces tax invoices with HSN codes, per-line GST, and CGST/SGST or IGST decided by the place of supply. It also handles bills of supply and plain cash memos, so an unregistered shop can use it without ever seeing a tax field.',
  },
  {
    q: 'Do I need GST registration to use it?',
    a: 'No. Leave the GSTIN blank and every GST field disappears. You bill with cash memos, stock and khata work exactly the same, and you can add a GSTIN later without redoing anything.',
  },
  {
    q: 'Does it file my GST returns?',
    a: 'No, and it does not claim to. It gives you clean, correct data and CA-ready exports with HSN, rate and tax split per line. Filing stays with you and your accountant.',
  },
  {
    q: 'Will it work on my phone?',
    a: 'Yes. There is nothing to install: open it in any browser on a phone, tablet or laptop. The billing screen is built for one-handed use at a counter with a customer waiting.',
  },
  {
    q: 'Can I print on a thermal printer?',
    a: 'Yes. Every bill prints as A4 for your file or 80mm for the thermal roll on your counter, and it remembers which one your shop uses.',
  },
  {
    q: 'What happens to my data if I stop paying?',
    a: 'Nothing is deleted. You cannot make new bills until you pay again, and everything comes back exactly as you left it the day you do.',
  },
  {
    q: 'Can my customers see how much stock I have?',
    a: 'They see in stock, low stock, or out of stock, never the number. Your competitors read your catalog too, and an exact count tells them your volume and your turnover.',
  },
  {
    q: 'How much does it cost?',
    a: `₹${MONTHLY_PRICE_INR} a month for a shop, ₹${FROM_PRICE_INR} for a Jan Seva Kendra — everything included. ${TRIAL_DAYS} days free first, with no card needed to start. One plan, no tiers, no per-invoice charge.`,
  },
];

export default async function HomePage() {
  // Somebody already logged in should never be offered "start free" as the main
  // action on their own product's home page.
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  /**
   * FAQPage structured data.
   *
   * These are the questions people type verbatim into a search box, and marking
   * them up is what lets an answer show under the result instead of a bare
   * link. Same text as the page below, which is the only version Google trusts.
   */
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Billwise',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: `GST billing, inventory and khata software for Indian shops. ${TRIAL_DAYS} days free, then from ₹${FROM_PRICE_INR} a month.`,
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
        'Sales returns',
        'Public product catalog with QR code',
        'A4 and 80mm thermal printing',
        'Sales, tax and stock reports with CSV export',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ];

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
          <div
            className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl px-5 pt-14 pb-12 text-center sm:px-8 sm:pt-24 sm:pb-20">
            <Badge variant="subtle" className="mb-5">
              {TRIAL_DAYS} days free · no card needed
            </Badge>
            <h1 className="text-[2.1rem] leading-[1.1] font-semibold text-balance sm:text-5xl md:text-[3.4rem]">
              Billing, stock and khata for your shop
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
              Make a GST bill in seconds, watch your stock go down by itself, and know exactly who
              owes you money. Built for Indian shops, not for accountants.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={signedIn ? '/app' : '/register'}>
                <Button size="lg" className="w-full sm:w-auto">
                  {signedIn ? 'Go to your dashboard' : `Start ${TRIAL_DAYS} days free`}
                  <ArrowRight />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  See pricing
                </Button>
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {['No card to start', 'Nothing to install', 'Works on any phone'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-4 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto max-w-3xl px-5 pb-16 sm:px-8 sm:pb-24">
            <BillPreview />
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-balance sm:text-3xl">
              Everything a counter needs, and nothing it does not
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Six things you will use every day. No modules to configure, no training, no
              consultant.
            </p>
          </div>

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
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Three steps, and you are running
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                There is no setup project and no training. Most shops make their first real bill
                the same afternoon they sign up.
              </p>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
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

        {/* The detail. Long-form on purpose: this is what a search engine reads
            and what a careful buyer scrolls for. */}
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <Detail
              icon={IndianRupee}
              title="GST done correctly, or hidden completely"
              paras={[
                'Tax is worked out per line and rounded per line, then added up, which is how a customer checks a bill and how a return is filed. CGST and SGST are always exact halves of the tax on the line, so an invoice never fails to add up by a paisa.',
                'Place of supply decides interstate against intrastate, so IGST appears when it should and never when it should not. If you are not registered for GST, leave the GSTIN blank and none of this appears anywhere.',
              ]}
            />
            <Detail
              icon={Package}
              title="Stock you can trust at the end of the month"
              paras={[
                'Nothing writes a stock number directly. Every change is a movement with a reason: sold, returned, received, damaged, corrected. The current figure is the sum of that history, so it can always be explained.',
                'Cancel a bill and the exact movements it made are reversed, never deleted. Record a return and only what came back goes on the shelf, with damaged goods left off.',
              ]}
            />
            <Detail
              icon={Wallet}
              title="Money owed, without the argument"
              paras={[
                'Each customer has a ledger: every bill, every payment, a running balance. Part payments are normal, so a bill can sit at part paid until the rest arrives.',
                'The dashboard totals what you are owed across every customer, and the outstanding report breaks it down by name so you know who to call first.',
              ]}
            />
            <Detail
              icon={Printer}
              title="Paper that looks like a real business"
              paras={[
                'A4 for your file and 80mm for the thermal roll, both laid out properly, with your logo and your signature or stamp printed on the bill.',
                'The print view keeps its own margins, so a bill looks the same whatever settings the browser dialog is left on.',
              ]}
            />
          </div>
        </section>

        {/* Who it is for. Keyword-honest: these are the shops it actually fits. */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <h2 className="text-2xl font-semibold sm:text-3xl">Built for shops like yours</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              If you sell things over a counter and write bills, it fits. It is being used the way
              a register and a calculator are used, not the way an ERP is.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-lg border bg-card p-3.5 text-sm shadow-xs"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-5 sm:grid-cols-3">
            <Trust
              icon={ShieldCheck}
              title="Your books stay yours"
              body="Every shop's data is separate at the database level. Even we see only counts and dates in the admin panel, never your invoices, customers or amounts."
            />
            <Trust
              icon={Clock}
              title="Nothing renews on its own"
              body={`No card is stored. Each payment buys one month, and you decide whether to buy another. Stop, and you lose access to new bills, nothing else.`}
            />
            <Trust
              icon={Smartphone}
              title="Nothing to install"
              body="It opens in a browser and works on a phone, tablet or laptop. No downloads, no updates, and it works from home as well as from the shop."
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="text-2xl font-semibold sm:text-3xl">Questions people actually ask</h2>
            <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium">{item.q}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Price and final CTA */}
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="brand-wash overflow-hidden rounded-2xl px-6 py-14 text-center text-white sm:px-12">
            <h2 className="text-2xl font-semibold text-balance sm:text-3xl">
              ₹{MONTHLY_PRICE_INR} a month for a shop. That is the whole price.
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
                'CA-ready exports',
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

      {!signedIn && (
        <div className="sticky bottom-0 z-40 border-t bg-background/90 px-4 py-3 backdrop-blur-md sm:hidden">
          <Link href="/register">
            <Button size="lg" className="w-full">
              Start {TRIAL_DAYS} days free <ArrowRight />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * A bill, drawn in the page.
 *
 * Not a screenshot: a real one would go stale the first time the UI changed,
 * and a PNG of an interface is heavy and blurry on a phone. This is the same
 * design tokens the product uses, so it cannot drift from what the shopkeeper
 * will actually see.
 */
function BillPreview() {
  const lines = [
    { name: 'Tata Salt 1kg', qty: '10 PCS', amount: '280.00' },
    { name: 'Fortune Oil 1L', qty: '5 LTR', amount: '844.50' },
    { name: 'Aashirvaad Atta 5kg', qty: '2 PCS', amount: '520.00' },
  ];

  return (
    <div className="relative">
      <div
        className="absolute -inset-x-6 -top-6 bottom-0 rounded-[2rem] bg-primary/5 blur-2xl"
        aria-hidden
      />
      <Card className="relative overflow-hidden p-0 shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
              S
            </span>
            <div className="text-left">
              <p className="text-sm font-medium">Sharma General Store</p>
              <p className="text-[0.7rem] text-muted-foreground">Tax Invoice · 001</p>
            </div>
          </div>
          <Badge variant="success" dot>
            Paid
          </Badge>
        </div>

        <div className="divide-y text-left">
          {lines.map((line) => (
            <div key={line.name} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className="min-w-0 flex-1 truncate text-sm">{line.name}</span>
              <span className="tabular hidden text-xs text-muted-foreground sm:block">
                {line.qty}
              </span>
              <span className="tabular text-sm font-medium">₹{line.amount}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 border-t bg-muted/30 px-4 py-3 text-left sm:px-5">
          <Row label="Taxable value" value="1,644.50" />
          <Row label="CGST + SGST @ 5%" value="82.23" />
          <div className="flex items-center justify-between pt-1 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular">₹1,726.73</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-[0.7rem] text-muted-foreground sm:px-5">
          <span className="flex items-center gap-1.5">
            <Package className="size-3.5" /> Stock updated
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" /> Khata updated
          </span>
          <span className="flex items-center gap-1.5">
            <Printer className="size-3.5" /> A4 and 80mm
          </span>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="tabular">₹{value}</span>
    </div>
  );
}

function Detail({
  icon: Icon,
  title,
  paras,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  paras: readonly string[];
}) {
  return (
    <div>
      <span className="mb-4 grid size-10 place-items-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {paras.map((para) => (
        <p key={para} className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {para}
        </p>
      ))}
    </div>
  );
}

function Trust({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card className="p-6">
      <Icon className="size-5 text-primary" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </Card>
  );
}

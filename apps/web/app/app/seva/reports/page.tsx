import {
  getApplicationCounts,
  getSalesSummary,
  getSevaEarnings,
  getSevaTopServices,
  listPartyBalances,
} from '@billwise/db';
import {
  EmptyState,
  PageBody,
  PageHeader,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { BarChart3, ClipboardList, IndianRupee, Landmark, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { RangeTabs } from './range-tabs';

export const metadata: Metadata = { title: 'Reports' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Today in IST, as the database reckons it. */
function istToday(): Date {
  return new Date(Date.now() + 5.5 * 3_600_000);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function rangeFor(key: string): { from: string; to: string; label: string } {
  const today = istToday();
  const to = iso(today);

  if (key === 'today') return { from: to, to, label: 'Aaj' };
  if (key === 'week') {
    return { from: iso(new Date(today.getTime() - 6 * 86_400_000)), to, label: 'Pichhle 7 din' };
  }
  if (key === 'last_month') {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    return { from: iso(first), to: iso(last), label: 'Pichhla mahina' };
  }
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { from: iso(first), to, label: 'Is mahine' };
}

/**
 * Reports, for a one-room shop.
 *
 * The shop's version runs to five tables including a GST rate breakdown and a
 * returns reconciliation — right for a business with a CA, wrong for somebody
 * who wants to know what they made this month. So this is four numbers, a day
 * list and a top-services list, and nothing that needs explaining.
 *
 * The one figure worth the space is "aapki kamai": billed money minus the
 * government fees that were only ever passing through. A CSC that took
 * ₹1,00,000 may have handed ₹22,000 straight to UIDAI and the portals, and a
 * turnover number that hides that is the number an owner is most likely to
 * believe and most likely to be wrong about.
 */
export default async function SevaReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requireBusiness();
  const { range: rangeKey } = await searchParams;
  const range = rangeFor(rangeKey ?? 'month');

  const [earnings, byDay, top, work, balances] = await Promise.all([
    getSevaEarnings(ctx, range),
    getSalesSummary(ctx, range),
    getSevaTopServices(ctx, range, 8),
    getApplicationCounts(ctx),
    listPartyBalances(ctx),
  ]);

  const outstanding = balances.reduce((sum, b) => sum + Math.max(0, Number(b.outstanding)), 0);

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Reports"
        description="Kitna kamaya, kaunsa kaam sabse zyada chala, aur kitna paisa baaki hai."
      />

      <RangeTabs active={rangeKey ?? 'month'} />

      <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Aapki kamai"
          value={inr(earnings.earned)}
          hint={`${range.label} · sarkari fees nikaal kar`}
          icon={IndianRupee}
          tone="success"
        />
        <StatCard
          label="Kul bill"
          value={inr(earnings.billed)}
          hint={`${earnings.receipts} ${earnings.receipts === 1 ? 'receipt' : 'receipts'}`}
          icon={BarChart3}
        />
        <StatCard
          label="Sarkari fees"
          value={inr(earnings.govtFees)}
          hint="Ye aapka nahi tha — aage jama hua"
          icon={Landmark}
        />
        <StatCard
          label="Paisa baaki"
          value={inr(outstanding.toFixed(2))}
          hint="Aaj tak ka, poora"
          icon={Wallet}
          tone={outstanding > 0 ? 'warning' : 'default'}
        />
      </section>

      <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Kaam:</span> {work.open} chal rahe hain,{' '}
        {work.ready} taiyaar hain, {work.overdue} late hain, aur {work.deliveredThisMonth} is
        mahine de diye.{' '}
        <Link href="/app/seva/work" className="font-medium text-primary underline-offset-4 hover:underline">
          Register dekhein
        </Link>
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold">Din ka hisaab</h2>
          {byDay.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Is range me kuch nahi"
              description="Doosri date range chun kar dekhiye."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH numeric>Receipts</TH>
                  <TH numeric>Kul</TH>
                </TR>
              </THead>
              <TBody>
                {byDay.slice(0, 31).map((d) => (
                  <TR key={d.date}>
                    <TD className="tabular">{shortDate(d.date)}</TD>
                    <TD numeric className="text-muted-foreground">{d.invoiceCount}</TD>
                    <TD numeric>{inr(d.grandTotal)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold">Sabse zyada kya chala</h2>
          {top.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Abhi kuch nahi"
              description="Receipt banne par yahan dikhega ki kaunsa kaam sabse zyada aata hai."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Kaam</TH>
                  <TH numeric>Kitni baar</TH>
                  <TH numeric>Kul</TH>
                </TR>
              </THead>
              <TBody>
                {top.map((t) => (
                  <TR key={t.name}>
                    <TD className="truncate">{t.name}</TD>
                    <TD numeric className="text-muted-foreground">{t.count}</TD>
                    <TD numeric>{inr(t.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      </div>
    </PageBody>
  );
}

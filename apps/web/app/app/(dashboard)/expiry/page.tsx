import { getExpiryCounts, listExpiringBatches } from '@billwise/db';
import { EXPIRY_WARNING_DAYS } from '@billwise/shared';
import { PageBody, PageHeader, StatCard } from '@billwise/ui';
import { CalendarClock, IndianRupee, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';
import { ExpiryView } from './expiry-view';

export const metadata: Metadata = { title: 'Expiry' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/**
 * What is about to die, and what already has.
 *
 * ## Why this is its own screen and not a filter on the stock report
 *
 * Because it is a different job. The stock report answers "what do I have";
 * this answers "what am I about to lose", and the second one has actions
 * attached — return it to the distributor while they will still take it, or
 * write it off. A tab on a report nobody opens daily is where that job goes to
 * be forgotten.
 *
 * ## Why a 404 and not a redirect
 *
 * A shop that does not track batches has no expiry screen, and saying so
 * plainly is better than bouncing them somewhere with no explanation. The guard
 * is here rather than only in the nav because a URL is guessable.
 */
export default async function ExpiryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [ctx, { profile }] = await Promise.all([requireBusiness(), requireMembership()]);
  if (!profile.features.batchTracking) notFound();

  const { view } = await searchParams;
  const [counts, expiring, expired] = await Promise.all([
    getExpiryCounts(ctx),
    listExpiringBatches(ctx, { limit: 300 }),
    listExpiringBatches(ctx, { expired: true, limit: 300 }),
  ]);

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Expiry"
        description={`Batches expiring within ${EXPIRY_WARNING_DAYS} days, and stock that has already gone past its date.`}
      />

      <section className="grid gap-3.5 sm:grid-cols-3">
        <StatCard
          label="Expiring soon"
          value={String(counts.expiringSoon)}
          hint={
            counts.expiringSoon === 0
              ? 'Nothing in the next three months'
              : 'Shift these, or return them'
          }
          icon={CalendarClock}
          tone={counts.expiringSoon > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Already expired"
          value={String(counts.expired)}
          hint={counts.expired === 0 ? 'Nothing on the shelf is out of date' : 'Take these off sale'}
          icon={TriangleAlert}
          tone={counts.expired > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          label="Value of expired stock"
          value={inr(counts.expiredValue)}
          hint="At what those lots cost you"
          icon={IndianRupee}
          tone={Number(counts.expiredValue) > 0 ? 'destructive' : 'default'}
        />
      </section>

      <ExpiryView
        expiring={expiring}
        expired={expired}
        initialView={view === 'expired' ? 'expired' : 'soon'}
      />
    </PageBody>
  );
}

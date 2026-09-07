import { listApplications, listParties, listProducts } from '@billwise/db';
import type { ApplicationStatus } from '@billwise/shared';
import { PageBody, PageHeader } from '@billwise/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { WorkView } from './work-view';

export const metadata: Metadata = { title: 'Work' };

/**
 * The work register: everything applied for and not yet handed over.
 *
 * Loaded server-side and filtered in the browser. A CSC has a few hundred open
 * jobs at most, so shipping the list once and filtering instantly beats a round
 * trip on every keystroke — the counter is the point, and the counter is busy.
 */
export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const ctx = await requireBusiness();
  const { status, q } = await searchParams;

  const [rows, parties, services] = await Promise.all([
    listApplications(ctx, { limit: 500 }),
    listParties(ctx, { type: 'customer', limit: 500 }),
    // The service master, so adding work can pick a name instead of typing it
    // — and so the row can point back at what was charged.
    listProducts(ctx, { limit: 500 }),
  ]);

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Work"
        description="Every job you have taken on — whose it is, how far along it is, and what is still owed."
      />
      <WorkView
        rows={rows}
        initialStatus={(status ?? '') as ApplicationStatus | ''}
        initialQuery={q ?? ''}
        parties={parties.map((p) => ({ id: p.id, name: p.name, phone: p.phone }))}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
      />
    </PageBody>
  );
}

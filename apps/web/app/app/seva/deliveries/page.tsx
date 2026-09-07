import { listApplications } from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { DeliveriesView } from './deliveries-view';

export const metadata: Metadata = { title: 'Deliveries' };

/**
 * The handover desk.
 *
 * ## Why this is not the work register
 *
 * The register is the diary — everything taken on, in every state, with a form
 * to add more. This is the one job that happens over and over on a busy
 * morning: a batch of cards has arrived, and for each one you find the person,
 * tell them, take the money they still owe, and hand it over.
 *
 * Doing that on the register meant a status dropdown, then hunting the same row
 * again for the WhatsApp button, then leaving to collect the balance on the
 * receipt page. Three screens for one physical act. Here it is one row and
 * three buttons, in the order the act actually happens.
 *
 * Only open work is loaded. Something already handed over is history, and
 * history belongs in the register.
 *
 * ## Why two queries and not one
 *
 * One `openOnly` read with a limit meant the ready pile and the waiting pile
 * competed for the same rows — the dashboard said 116 were ready and this
 * screen showed 83, because the other 33 fell off the end of a list sorted by
 * date. A truncated list on the screen you use to decide who to ring is worse
 * than no screen: the people missing from it are invisible rather than late.
 */
export default async function SevaDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const ctx = await requireBusiness();
  const { q, view } = await searchParams;

  const [ready, applied, inProcess] = await Promise.all([
    listApplications(ctx, { status: 'ready', limit: 500 }),
    listApplications(ctx, { status: 'applied', limit: 500 }),
    listApplications(ctx, { status: 'in_process', limit: 500 }),
  ]);

  // Late first, then oldest-promised — the order you would work through them.
  const waiting = [...applied, ...inProcess].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return (a.expectedOn ?? '9999').localeCompare(b.expectedOn ?? '9999');
  });

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Deliveries"
        description="Work that has come back. Tell the customer, take what is owed, hand it over."
      />
      <DeliveriesView
        ready={ready}
        waiting={waiting}
        initialQuery={q ?? ''}
        initialView={view === 'waiting' || view === 'ready' ? view : 'ready'}
      />
    </PageBody>
  );
}

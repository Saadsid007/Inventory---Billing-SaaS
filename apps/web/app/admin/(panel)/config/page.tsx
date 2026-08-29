import { EmptyState } from '@bahikhata/ui';
import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Site settings' };

/**
 * Placeholder module for site-wide changes.
 *
 * Intentionally empty. This is the reserved home for things that should be
 * changeable without a deploy — an announcement banner, a feature flag, an
 * extra field on a form, a price change on the pricing page.
 *
 * It renders nothing rather than fake controls on purpose: a toggle that does
 * not toggle anything is worse than no toggle, because someone will flip it and
 * believe it worked. When the first real setting exists, it lands here, backed
 * by a `site_settings` table read through a repository like everything else.
 */
export default async function AdminConfigPage() {
  await requireSuperAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Site settings</h1>
        <p className="text-sm text-muted-foreground">
          Changes that apply to the whole of Bahikhata, not to one business.
        </p>
      </header>

      <EmptyState
        title="Nothing to change yet"
        description="This is where site-wide settings will live — an announcement banner, a new field on a form, turning a feature on or off. It is empty until the first one exists, so that nothing here is a switch that does not actually do anything."
      />

      <section className="space-y-3">
        <h2 className="text-base font-medium">Planned</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="rounded-md border p-3">
            <span className="font-medium text-foreground">Announcement banner</span> — a line of
            text shown at the top of every shop&apos;s dashboard. For maintenance windows and price
            changes.
          </li>
          <li className="rounded-md border p-3">
            <span className="font-medium text-foreground">Feature switches</span> — turn a new
            feature on for everyone, or for one business while it is being tried out.
          </li>
          <li className="rounded-md border p-3">
            <span className="font-medium text-foreground">Extra fields</span> — add a field to the
            product or invoice form without a code change.
          </li>
          <li className="rounded-md border p-3">
            <span className="font-medium text-foreground">Plan and pricing</span> — change the
            monthly price and trial length, which are constants in the code today.
          </li>
        </ul>
      </section>
    </div>
  );
}

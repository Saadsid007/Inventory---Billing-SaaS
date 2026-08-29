import { Card, EmptyState, PageBody, PageHeader, Section } from '@billwise/ui';
import { Megaphone, Plus, SlidersHorizontal, Tag, Wrench } from 'lucide-react';
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
 * It renders nothing operable rather than fake controls on purpose: a toggle
 * that does not toggle anything is worse than no toggle, because someone will
 * flip it and believe it worked. When the first real setting exists, it lands
 * here, backed by a `site_settings` table read through a repository like every
 * other piece of data in the system.
 */
const PLANNED = [
  {
    icon: Megaphone,
    title: 'Announcement banner',
    body: "A line of text shown at the top of every shop's dashboard. For maintenance windows and price changes.",
  },
  {
    icon: SlidersHorizontal,
    title: 'Feature switches',
    body: 'Turn a new feature on for everyone, or for one business while it is being tried out.',
  },
  {
    icon: Plus,
    title: 'Extra fields',
    body: 'Add a field to the product or invoice form without a code change.',
  },
  {
    icon: Tag,
    title: 'Plan and pricing',
    body: 'Change the monthly price and the trial length, which are constants in the code today.',
  },
];

export default async function AdminConfigPage() {
  await requireSuperAdmin();

  return (
    <PageBody className="mx-auto max-w-4xl p-6 sm:p-8">
      <PageHeader
        title="Site settings"
        description="Changes that apply to the whole of Billwise, not to one business."
      />

      <EmptyState
        icon={Wrench}
        title="Nothing to change yet"
        description="This is where site-wide settings will live — an announcement banner, a new field on a form, turning a feature on or off. It is empty until the first one exists, so that nothing here is a switch that does not actually do anything."
      />

      <Section title="Planned" description="What this page is reserved for.">
        <div className="grid gap-4 sm:grid-cols-2">
          {PLANNED.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5">
              <span className="mb-3 grid size-9 place-items-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
                <Icon className="size-4" />
              </span>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </Section>
    </PageBody>
  );
}

import { Card } from '@billwise/ui';
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

/**
 * First-run checklist.
 *
 * A shopkeeper's first hour decides whether they come back, and the things that
 * make the product work properly are scattered across four screens. Rather than
 * letting them discover each one by hitting a warning later, the dashboard says
 * what is left and links straight to the page that fixes it.
 *
 * It disappears completely once everything is done. A permanent checklist with
 * five ticks is clutter, and nobody needs congratulating twice.
 */
export type SetupStep = {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

export function SetupChecklist({ steps }: { steps: readonly SetupStep[] }) {
  const remaining = steps.filter((s) => !s.done);
  if (remaining.length === 0) return null;

  const done = steps.length - remaining.length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Finish setting up your shop</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done} of {steps.length} done. Each one takes under a minute.
          </p>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden>
          {steps.map((step) => (
            <span
              key={step.id}
              className={`h-1.5 w-7 rounded-full ${step.done ? 'bg-success' : 'bg-border'}`}
            />
          ))}
        </div>
      </div>

      <ul className="divide-y">
        {steps.map((step) => (
          <li key={step.id}>
            {step.done ? (
              <div className="flex items-center gap-3 px-4 py-3 opacity-60">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                  <Check className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-sm line-through">{step.label}</span>
              </div>
            ) : (
              <Link
                href={step.href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary-subtle/50"
              >
                <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-border" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{step.label}</span>
                  <span className="block text-xs text-muted-foreground">{step.hint}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

import { Card } from '@billwise/ui';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
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
  const pct = Math.round((done / steps.length) * 100);

  return (
    <Card className="overflow-hidden border-primary/20 p-0 shadow-md ring-1 ring-primary/10">
      <div className="relative overflow-hidden border-b border-primary/15 bg-gradient-to-r from-primary/[0.12] via-sky-500/[0.08] to-emerald-500/[0.06] px-4 py-4 sm:px-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 size-32 rounded-full bg-primary/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">Finish setting up your shop</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {done} of {steps.length} done · each one takes under a minute
              </p>
            </div>
          </div>
          <div className="flex min-w-[8rem] flex-1 flex-col gap-1.5 sm:max-w-[12rem]">
            <div className="flex items-center justify-between text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">
              <span>Progress</span>
              <span className="tabular text-primary">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-sky-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-border/60">
        {steps.map((step) => (
          <li key={step.id}>
            {step.done ? (
              <div className="flex items-center gap-3 px-4 py-3.5 opacity-55 sm:px-5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-sm line-through">{step.label}</span>
              </div>
            ) : (
              <Link
                href={step.href}
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-primary-subtle/55 sm:px-5"
              >
                <span className="size-8 shrink-0 rounded-full border-2 border-dashed border-primary/35 bg-primary/[0.03] transition-colors group-hover:border-primary group-hover:bg-primary/10" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{step.label}</span>
                  <span className="block text-xs text-muted-foreground">{step.hint}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

'use client';

import type { Plan } from '@billwise/db';
import type { BusinessType } from '@billwise/shared';
import {
  Button,
  Card,
  Field,
  FormError,
  FormSuccess,
  Input,
  Switch,
  Textarea,
} from '@billwise/ui';
import { Loader2, Save } from 'lucide-react';
import * as React from 'react';
import { savePlanAction } from './actions';

/**
 * One plan's form.
 *
 * ## Why the bullets are a textarea and not a repeater
 *
 * A row-per-bullet editor with add and remove buttons is more code, more state
 * and slower to use than typing seven lines. One line, one bullet. Blank lines
 * are dropped on the server, so a stray Enter is not an error to fix.
 *
 * ## Why nothing saves until Save is pressed
 *
 * Autosave on a price field means a half-typed "1" is briefly the live price of
 * the product. The button is the commit.
 */
export function PlanEditor({ plan }: { plan: Plan }) {
  const [label, setLabel] = React.useState(plan.label);
  const [tagline, setTagline] = React.useState(plan.tagline ?? '');
  const [price, setPrice] = React.useState(plan.monthlyPrice);
  const [trialDays, setTrialDays] = React.useState(String(plan.trialDays));
  const [features, setFeatures] = React.useState(plan.features.join('\n'));
  const [isActive, setIsActive] = React.useState(plan.isActive);

  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const id = plan.businessType;

  // Compared against what came from the server, so "Saved" turns back into
  // "unsaved changes" the moment anything is touched again.
  const dirty =
    label !== plan.label ||
    tagline !== (plan.tagline ?? '') ||
    price !== plan.monthlyPrice ||
    trialDays !== String(plan.trialDays) ||
    features !== plan.features.join('\n') ||
    isActive !== plan.isActive;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await savePlanAction(plan.businessType as BusinessType, {
        label,
        tagline,
        monthlyPrice: price,
        trialDays,
        features: features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        isActive,
      });

      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{plan.label}</h2>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{plan.businessType}</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Sold" />
            <span className={isActive ? '' : 'text-muted-foreground'}>
              {isActive ? 'On sale' : 'Hidden from pricing page'}
            </span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan name" htmlFor={`${id}-label`} required>
            <Input
              id={`${id}-label`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
            />
          </Field>

          <Field
            label="Price per month"
            htmlFor={`${id}-price`}
            required
            hint="Rupees. Takes effect on the next payment anybody starts."
          >
            <Input
              id={`${id}-price`}
              value={price}
              inputMode="decimal"
              onChange={(e) => setPrice(e.target.value)}
              className="tabular"
            />
          </Field>

          <Field
            label="Free trial"
            htmlFor={`${id}-trial`}
            required
            hint="Days of full access on signup. Existing trials are not changed."
          >
            <Input
              id={`${id}-trial`}
              value={trialDays}
              inputMode="numeric"
              onChange={(e) => setTrialDays(e.target.value)}
              className="tabular"
            />
          </Field>

          <Field label="One-line description" htmlFor={`${id}-tagline`}>
            <Input
              id={`${id}-tagline`}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={140}
            />
          </Field>
        </div>

        <Field
          label="What you get"
          htmlFor={`${id}-features`}
          hint="One per line. Shown on the pricing page and on this trade's billing screen."
        >
          <Textarea
            id={`${id}-features`}
            rows={8}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
          />
        </Field>

        {error && <FormError>{error}</FormError>}
        {saved && !dirty && <FormSuccess>Saved. Live everywhere now.</FormSuccess>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {pending ? 'Saving…' : 'Save plan'}
          </Button>
          {dirty && !pending && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          {plan.updatedAt && !dirty && (
            <span className="text-xs text-muted-foreground">
              Last changed {new Date(plan.updatedAt).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

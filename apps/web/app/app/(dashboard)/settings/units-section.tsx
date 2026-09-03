'use client';

import { isStandardUqc } from '@billwise/shared';
import { Badge, Button, Card, FormError, Input } from '@billwise/ui';
import { AlertCircle, Plus, Scale, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { addUnitAction, removeUnitAction } from './actions';

export function UnitsSection({
  units,
}: {
  units: readonly { id: string; name: string; shortName: string }[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [shortName, setShortName] = React.useState('');
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
  }>({});
  const [pending, startTransition] = React.useTransition();

  function add(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim() || !shortName.trim()) return;

    setState({});
    startTransition(async () => {
      const result = await addUnitAction({ name: name.trim(), shortName: shortName.trim().toUpperCase() });
      if (result.ok) {
        setName('');
        setShortName('');
        router.refresh();
      } else {
        setState({
          ...(result.formError !== undefined && { formError: result.formError }),
          ...(result.fieldErrors !== undefined && { fieldErrors: result.fieldErrors }),
        });
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeUnitAction(id);
      router.refresh();
    });
  }

  const nonStandard = units.filter((u) => !isStandardUqc(u.shortName));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border border-border/80 bg-card shadow-xs">
        <div className="border-b border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Scale className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Units of Measurement (UQC)</h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Define measurement units for your catalog (e.g. PCS, KGS, BOX, LTR, MTR). Short
                codes map directly to the official GST Portal Unique Quantity Codes (UQC).
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <FormError>{state.formError}</FormError>

          {/* Active Units */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Configured Units ({units.length})
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {units.map((u) => {
                const isStd = isStandardUqc(u.shortName);
                return (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-muted/20 py-1.5 pr-1.5 pl-3 text-xs font-semibold shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <span>{u.name}</span>
                    <Badge
                      className={`font-mono text-[10px] font-bold ${
                        isStd
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30'
                      }`}
                    >
                      {u.shortName}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => remove(u.id)}
                      disabled={pending}
                      aria-label={`Remove ${u.name}`}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors disabled:opacity-50"
                      title="Remove unit"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                );
              })}
            </div>

            {nonStandard.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p>
                  <strong>{nonStandard.map((u) => u.shortName).join(', ')}</strong> is not an official
                  GST UQC. Valid for local bills, but could require mapping during GSTR-1 filing.
                </p>
              </div>
            )}
          </div>

          {/* Add New Unit Form */}
          <form onSubmit={add} className="border-t border-border/60 pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Add New Measurement Unit
            </h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-48">
                <Input
                  placeholder="Unit name (e.g. Kilograms)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="w-28">
                <Input
                  placeholder="UQC (KGS)"
                  className="h-9 uppercase font-mono text-xs font-bold"
                  maxLength={6}
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={pending || !name.trim() || !shortName.trim()}
                className="h-9 bg-primary text-primary-foreground font-bold shadow-xs text-xs px-4 gap-1.5"
              >
                <Plus className="size-3.5" />
                Add Unit
              </Button>
            </div>

            {(state.fieldErrors?.['name'] || state.fieldErrors?.['shortName']) && (
              <p className="text-xs font-medium text-destructive">
                {state.fieldErrors['name'] ?? state.fieldErrors['shortName']}
              </p>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}

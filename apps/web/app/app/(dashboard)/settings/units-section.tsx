'use client';

import { isStandardUqc } from '@bahikhata/shared';
import { Badge, Button, Card, FormError, Input } from '@bahikhata/ui';
import { Trash2 } from 'lucide-react';
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

  function add() {
    setState({});
    startTransition(async () => {
      const result = await addUnitAction({ name, shortName });
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

  // A non-standard code is allowed but flagged: it will be rejected by the GST
  // portal's HSN summary in Phase 2, and finding that out now is cheaper.
  const nonStandard = units.filter((u) => !isStandardUqc(u.shortName));

  return (
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Units</h2>
        <p className="text-sm text-muted-foreground">
          How you measure what you sell. Short codes should be official GST UQCs.
        </p>
      </div>

      <FormError>{state.formError}</FormError>

      <div className="flex flex-wrap gap-2">
        {units.map((u) => (
          <span
            key={u.id}
            className="inline-flex items-center gap-2 rounded-md border py-1 pr-1 pl-2.5 text-sm"
          >
            {u.name}
            <Badge variant={isStandardUqc(u.shortName) ? 'secondary' : 'warning'}>
              {u.shortName}
            </Badge>
            <button
              type="button"
              onClick={() => remove(u.id)}
              disabled={pending}
              aria-label={`Remove ${u.name}`}
              className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          </span>
        ))}
      </div>

      {nonStandard.length > 0 && (
        <p className="text-xs text-warning">
          {nonStandard.map((u) => u.shortName).join(', ')}{' '}
          {nonStandard.length === 1 ? 'is not an' : 'are not'} official GST unit code
          {nonStandard.length === 1 ? '' : 's'}. Fine for your own paperwork, but the GST portal
          may reject it in an HSN summary.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <Input
            placeholder="Unit name"
            aria-label="Unit name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.['name'])}
          />
        </div>
        <div className="w-28">
          <Input
            placeholder="Code"
            aria-label="Short code"
            className="uppercase"
            maxLength={6}
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.['shortName'])}
          />
        </div>
        <Button variant="outline" onClick={add} disabled={pending || !name || !shortName}>
          Add unit
        </Button>
      </div>

      {(state.fieldErrors?.['name'] || state.fieldErrors?.['shortName']) && (
        <p className="text-xs text-destructive">
          {state.fieldErrors['name'] ?? state.fieldErrors['shortName']}
        </p>
      )}
    </Card>
  );
}

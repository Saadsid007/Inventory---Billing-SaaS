'use client';

import { Badge, Button, Card, Checkbox, Field, FormError, Input, Select } from '@billwise/ui';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { addCustomFieldAction, removeCustomFieldAction } from './actions';

type FieldView = { id: string; label: string; type: string };

const TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Choice list' },
  { value: 'checkbox', label: 'Yes / No' },
] as const;

export function CustomFieldsSection({
  productFields,
  partyFields,
}: {
  productFields: readonly FieldView[];
  partyFields: readonly FieldView[];
}) {
  const router = useRouter();
  const [entity, setEntity] = React.useState<'product' | 'party'>('product');
  const [label, setLabel] = React.useState('');
  const [type, setType] = React.useState<(typeof TYPES)[number]['value']>('text');
  const [optionsText, setOptionsText] = React.useState('');
  const [required, setRequired] = React.useState(false);
  const [showInCatalog, setShowInCatalog] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  function add() {
    setError(undefined);
    startTransition(async () => {
      const options =
        type === 'select'
          ? optionsText
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined;

      const result = await addCustomFieldAction({
        entity,
        label,
        type,
        options,
        required,
        showInCatalog,
      });

      if (result.ok) {
        setLabel('');
        setOptionsText('');
        setRequired(false);
        setShowInCatalog(false);
        router.refresh();
      } else {
        setError(result.fieldErrors?.['label'] ?? result.formError);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeCustomFieldAction(id);
      router.refresh();
    });
  }

  const list = entity === 'product' ? productFields : partyFields;

  return (
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Your own fields</h2>
        <p className="text-sm text-muted-foreground">
          Extra fields on products and parties — brand, warranty, delivery route, whatever your
          trade needs. Deliberately not available on invoices: an invoice is a legal document
          whose shape has to stay predictable for printing and for GST returns.
        </p>
      </div>

      <FormError>{error}</FormError>

      <div className="inline-flex rounded-md border p-0.5">
        {(['product', 'party'] as const).map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEntity(e)}
            className={
              entity === e
                ? 'rounded-sm bg-accent px-3 py-1 text-sm font-medium'
                : 'rounded-sm px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {e === 'product' ? 'Products' : 'Parties'}
          </button>
        ))}
      </div>

      {list.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {list.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-2 rounded-md border py-1 pr-1 pl-2.5 text-sm"
            >
              {f.label}
              <Badge variant="secondary">{f.type}</Badge>
              <button
                type="button"
                onClick={() => remove(f.id)}
                disabled={pending}
                aria-label={`Remove ${f.label}`}
                className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No custom fields on {entity === 'product' ? 'products' : 'parties'} yet.
        </p>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Field name" htmlFor="cf-label">
            <Input
              id="cf-label"
              placeholder="e.g. Brand"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </Field>
          <Field label="Type" htmlFor="cf-type">
            <Select
              id="cf-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {type === 'select' && (
          <Field label="Choices" htmlFor="cf-options" hint="Separate with commas.">
            <Input
              id="cf-options"
              placeholder="Small, Medium, Large"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
            />
          </Field>
        )}

        <Checkbox label="Required" checked={required} onCheckedChange={setRequired} />
        {entity === 'product' && (
          <Checkbox
            label="Show on public catalog"
            checked={showInCatalog}
            onCheckedChange={setShowInCatalog}
          />
        )}

        <Button variant="outline" onClick={add} disabled={pending || !label}>
          Add field
        </Button>
      </div>
    </Card>
  );
}

'use client';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  type DropdownOption,
  Field,
  FormError,
  Input,
} from '@billwise/ui';
import {
  Calendar,
  CheckSquare,
  Hash,
  ListOrdered,
  Package,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { addCustomFieldAction, removeCustomFieldAction } from './actions';

type FieldView = { id: string; label: string; type: string };

type FieldTypeKey = 'text' | 'number' | 'date' | 'select' | 'checkbox';

const TYPE_OPTIONS: readonly DropdownOption<FieldTypeKey>[] = [
  { value: 'text', label: 'Text (Single Line)', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'select', label: 'Choice List (Dropdown)', icon: ListOrdered },
  { value: 'checkbox', label: 'Yes / No (Checkbox)', icon: CheckSquare },
];

const TYPE_BADGE_STYLES: Record<string, string> = {
  text: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300/40',
  number: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300/40',
  date: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40',
  select: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40',
  checkbox: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40',
};

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
  const [type, setType] = React.useState<FieldTypeKey>('text');
  const [optionsText, setOptionsText] = React.useState('');
  const [required, setRequired] = React.useState(false);
  const [showInCatalog, setShowInCatalog] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  function add(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!label.trim()) return;

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
        label: label.trim(),
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
    <div className="space-y-6">
      {/* Header Executive Card */}
      <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-xs sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <SlidersHorizontal className="size-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Custom Master Fields
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Add personalized attributes for inventory items (Brand, Shelf Life, Warranty)
                and contacts (Route, Customer Tier, Department). These fields display directly in
                forms and tables throughout your workspace.
              </p>
            </div>
          </div>
        </div>

        {/* Entity Switcher Buttons */}
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-slate-200/80 p-1.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setEntity('product')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              entity === 'product'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Package className="size-3.5" />
            <span>Products</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                entity === 'product'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-300/90 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {productFields.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEntity('party')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              entity === 'party'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Users className="size-3.5" />
            <span>Contacts & Parties</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                entity === 'party'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-300/90 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {partyFields.length}
            </span>
          </button>
        </div>
      </Card>

      {/* Existing Fields List */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Configured {entity === 'product' ? 'Product' : 'Party'} Fields
            </h3>
            <p className="text-xs text-muted-foreground">
              {list.length} active custom {list.length === 1 ? 'field' : 'fields'}
            </p>
          </div>
        </div>

        {list.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((f) => (
              <div
                key={f.id}
                className="group flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3 transition-all hover:border-primary/40 hover:bg-muted/40 shadow-2xs"
              >
                <div className="space-y-1 truncate pr-2">
                  <p className="text-xs font-bold text-foreground truncate">{f.label}</p>
                  <Badge
                    className={`border text-[10px] font-semibold uppercase tracking-wider capitalize ${
                      TYPE_BADGE_STYLES[f.type] ?? ''
                    }`}
                  >
                    {f.type === 'select' ? 'choice list' : f.type}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  disabled={pending}
                  aria-label={`Remove ${f.label}`}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors disabled:opacity-50 shrink-0"
                  title="Remove this field"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-6 text-center">
            <Sparkles className="mx-auto size-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-semibold text-foreground">
              No custom fields configured for {entity === 'product' ? 'products' : 'parties'} yet
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Use the form below to add attributes like Brand, Shelf Life, or Delivery Route.
            </p>
          </div>
        )}
      </Card>

      {/* Add New Field Card */}
      <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Add New {entity === 'product' ? 'Product' : 'Party'} Field
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure field parameters and where it appears.
          </p>
        </div>

        <FormError>{error}</FormError>

        <form onSubmit={add} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Field Label / Name" htmlFor="cf-label" required>
              <Input
                id="cf-label"
                placeholder="e.g. Brand / Manufacturer / Shelf Life"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9.5 text-xs font-medium"
              />
            </Field>

            <Field label="Field Type" htmlFor="cf-type" required>
              <Dropdown
                id="cf-type"
                value={type}
                onChange={(v) => setType(v)}
                options={TYPE_OPTIONS}
              />
            </Field>
          </div>

          {type === 'select' && (
            <Field
              label="Choices / Dropdown Options"
              htmlFor="cf-options"
              hint="Enter options separated by commas (e.g. Small, Medium, Large, Extra Large)"
              required
            >
              <Input
                id="cf-options"
                placeholder="Option 1, Option 2, Option 3"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                className="h-9.5 text-xs font-medium"
              />
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border/70 bg-muted/20 p-3">
            <Checkbox
              id="cf-req"
              label="Required field (must be filled before saving)"
              checked={required}
              onCheckedChange={setRequired}
            />

            {entity === 'product' && (
              <Checkbox
                id="cf-cat"
                label="Show on public customer catalog / storefront"
                checked={showInCatalog}
                onCheckedChange={setShowInCatalog}
              />
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={pending || !label.trim()}
              className="h-9 bg-primary text-primary-foreground font-bold shadow-xs text-xs px-4 gap-1.5"
            >
              <Plus className="size-3.5" />
              {pending ? 'Adding…' : 'Add Custom Field'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

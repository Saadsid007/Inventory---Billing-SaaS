'use client';

import type { SevaService } from '@billwise/db';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FormError,
  Input,
  Switch,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { Pencil, Plus, Search, Wrench } from 'lucide-react';
import * as React from 'react';
import { saveServiceAction, setServiceActiveAction } from './actions';

const inr = (v: string | number) => `₹${Number(v).toFixed(2)}`;

const EMPTY = { name: '', sku: '', price: '', govtFee: '', tracked: false, days: '7' };
type Form = typeof EMPTY;

/**
 * The rate list.
 *
 * Four things per row, and no more: what the work is, what the customer pays,
 * what the government takes, and what the shop is left with. The last column is
 * the one an owner actually wants — a ₹150 Aadhaar update where ₹50 goes to
 * UIDAI earns ₹100, and a rate list that only shows ₹150 is quietly lying about
 * the day's takings.
 *
 * There is no HSN, no barcode, no unit and no stock, because a Jan Seva Kendra
 * has none of them. That is the entire reason this screen exists instead of
 * pointing the sidebar at the shop's product form.
 */
export function ServicesView({ services }: { services: SevaService[] }) {
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<string | 'new' | null>(null);
  const [form, setForm] = React.useState<Form>(EMPTY);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.sku ?? '').toLowerCase().includes(q),
    );
  }, [services, query]);

  const earns =
    form.price && form.govtFee
      ? Math.max(0, Number(form.price || 0) - Number(form.govtFee || 0))
      : Number(form.price || 0);

  function openNew() {
    setForm(EMPTY);
    setError(undefined);
    setEditing('new');
  }

  function openEdit(s: SevaService) {
    setForm({
      name: s.name,
      sku: s.sku ?? '',
      price: s.price,
      govtFee: Number(s.govtFee) > 0 ? s.govtFee : '',
      tracked: s.tracked,
      days: String(s.days),
    });
    setError(undefined);
    setEditing(s.id);
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveServiceAction(
        { ...form, days: form.days || '0' },
        editing === 'new' ? undefined : (editing ?? undefined),
      );
      if (result.ok) setEditing(null);
      else setError(result.error);
    });
  }

  function toggleActive(s: SevaService) {
    startTransition(async () => {
      const result = await setServiceActiveAction(s.id, !s.isActive);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search work…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search services"
          />
        </div>
        <Button className="ml-auto" onClick={openNew}>
          <Plus /> Add work
        </Button>
      </div>

      {editing && (
        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">{editing === 'new' ? 'Add work' : 'Edit work'}</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="What is the work?" htmlFor="s-name" required className="sm:col-span-2">
              <Input
                id="s-name"
                autoFocus
                placeholder="Aadhaar — mobile number update"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>

            <Field
              label="Customer pays"
              htmlFor="s-price"
              hint="Total, including the government fee."
              required
            >
              <Input
                id="s-price"
                inputMode="decimal"
                placeholder="150"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </Field>

            <Field
              label="Government fee"
              htmlFor="s-govt"
              hint="Leave blank if there is none."
            >
              <Input
                id="s-govt"
                inputMode="decimal"
                placeholder="50"
                value={form.govtFee}
                onChange={(e) => setForm((f) => ({ ...f, govtFee: e.target.value }))}
              />
            </Field>
          </div>

          {/* Shown live, because this is the number the rate is really set by. */}
          {form.price !== '' && (
            <p className="text-sm">
              You keep <span className="font-semibold text-success">{inr(earns)}</span>
              {Number(form.govtFee) > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  — {inr(form.price)} minus {inr(form.govtFee)} government fee
                </span>
              )}
            </p>
          )}

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
              <Switch
                id="s-tracked"
                className="mt-0.5"
                checked={form.tracked}
                onCheckedChange={(v) => setForm((f) => ({ ...f, tracked: v }))}
                aria-labelledby="s-tracked-label"
              />
              <label htmlFor="s-tracked" className="min-w-0 cursor-pointer">
                <span id="s-tracked-label" className="block text-sm font-medium">
                  This work takes days to finish
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  Aadhaar, PAN, certificates — anything that goes to a government portal and comes
                  back later. Photocopy, recharge and printouts do not need this.
                </span>
              </label>
            </div>
            {form.tracked && (
              <Field
                label="Usually ready in (days)"
                htmlFor="s-days"
                hint="Used to suggest the date you promise a customer."
                className="sm:max-w-48"
              >
                <Input
                  id="s-days"
                  inputMode="numeric"
                  value={form.days}
                  onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
                />
              </Field>
            )}
          </div>

          <FormError>{error}</FormError>

          <div className="flex gap-2">
            <Button disabled={pending} onClick={submit}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!editing && <FormError>{error}</FormError>}

      {visible.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={services.length === 0 ? 'No work listed yet' : 'Nothing matches'}
          description={
            services.length === 0
              ? 'Add the work you do and what you charge. Making a receipt then takes two taps.'
              : 'Try a different search.'
          }
          action={
            services.length === 0 ? (
              <Button onClick={openNew}>
                <Plus /> Add work
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Work</TH>
              <TH numeric>Customer pays</TH>
              <TH numeric>Govt. fee</TH>
              <TH numeric>You keep</TH>
              <TH>Takes days?</TH>
              <TH> </TH>
            </TR>
          </THead>
          <TBody>
            {visible.map((s) => (
              <TR key={s.id} className={s.isActive ? undefined : 'opacity-55'}>
                <TD>
                  <span className="font-medium">{s.name}</span>
                  {!s.isActive && (
                    <Badge variant="secondary" className="ml-2">
                      Hidden
                    </Badge>
                  )}
                </TD>
                <TD numeric>{inr(s.price)}</TD>
                <TD numeric className="text-muted-foreground">
                  {Number(s.govtFee) > 0 ? inr(s.govtFee) : '—'}
                </TD>
                <TD numeric className="font-medium text-success">
                  {inr(s.earns)}
                </TD>
                <TD>
                  {s.tracked ? (
                    <Badge variant="info">~{s.days} days</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Same day</span>
                  )}
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      aria-label={`Edit ${s.name}`}
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      disabled={pending}
                      onClick={() => toggleActive(s)}
                    >
                      {s.isActive ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

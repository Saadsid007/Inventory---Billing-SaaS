'use client';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  whatsappShareUrl,
} from '@billwise/shared';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FormError,
  Input,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { ClipboardList, MessageCircle, Plus, Search, Trash2 } from 'lucide-react';
import * as React from 'react';
import {
  addWorkAction,
  deleteWorkAction,
  readyMessageAction,
  setWorkStatusAction,
} from './actions';

type Row = {
  id: string;
  serviceName: string;
  partyName: string | null;
  partyPhone: string | null;
  invoiceNo: string | null;
  invoiceId: string | null;
  status: ApplicationStatus;
  referenceNo: string | null;
  appliedOn: string;
  expectedOn: string | null;
  documentsHeld: string | null;
  balance: string;
  isOverdue: boolean;
};

const shortDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

const STATUS_TONE: Record<ApplicationStatus, 'secondary' | 'info' | 'success' | 'warning' | 'destructive'> = {
  applied: 'secondary',
  in_process: 'info',
  ready: 'success',
  delivered: 'secondary',
  rejected: 'destructive',
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The work register.
 *
 * ## Why the status is a dropdown in the row
 *
 * Moving a job along is the single most repeated action here — a dozen times a
 * morning as the government portal updates. Making that a click into a detail
 * page and back would be the whole feature's undoing. So the status changes in
 * place, and the list re-sorts on the next load rather than jumping under the
 * hand that is still on it.
 *
 * ## Why "Ready" gets a WhatsApp button
 *
 * The moment a card arrives, someone has to be told. The message carries the
 * balance too, because that is the other half of the conversation when they
 * come to collect.
 */
export function WorkView({
  rows,
  initialStatus,
  initialQuery,
  parties,
  services,
}: {
  rows: Row[];
  initialStatus: ApplicationStatus | '';
  initialQuery: string;
  parties: { id: string; name: string; phone: string | null }[];
  services: { id: string; name: string }[];
}) {
  const [status, setStatus] = React.useState<ApplicationStatus | '' | 'open'>(
    initialStatus || 'open',
  );
  const [query, setQuery] = React.useState(initialQuery);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const [form, setForm] = React.useState({
    serviceName: '',
    serviceId: '',
    partyId: '',
    partyName: '',
    partyPhone: '',
    referenceNo: '',
    appliedOn: today(),
    expectedOn: '',
    documentsHeld: '',
    note: '',
  });

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === 'open') {
        if (r.status === 'delivered' || r.status === 'rejected') return false;
      } else if (status && r.status !== status) return false;

      if (!q) return true;
      return (
        r.serviceName.toLowerCase().includes(q) ||
        (r.partyName ?? '').toLowerCase().includes(q) ||
        (r.referenceNo ?? '').toLowerCase().includes(q) ||
        (r.partyPhone ?? '').includes(q)
      );
    });
  }, [rows, status, query]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? 'Something went wrong.');
    });
  }

  function submitNew() {
    if (!form.serviceName.trim()) {
      setError('Which work is this?');
      return;
    }
    const party = parties.find((p) => p.id === form.partyId);
    run(async () => {
      const result = await addWorkAction({
        ...form,
        partyName: party?.name ?? form.partyName,
        partyPhone: party?.phone ?? form.partyPhone,
        expectedOn: form.expectedOn || undefined,
      });
      if (result.ok) {
        setForm((f) => ({
          ...f,
          serviceName: '',
          serviceId: '',
          partyId: '',
          partyName: '',
          partyPhone: '',
          referenceNo: '',
          expectedOn: '',
          documentsHeld: '',
          note: '',
        }));
        setAdding(false);
      }
      return result;
    });
  }

  function tellReady(id: string) {
    startTransition(async () => {
      const result = await readyMessageAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const url = whatsappShareUrl(result.phone, result.message);
      if (url) {
        window.open(url, 'billwise-share');
        return;
      }
      try {
        await navigator.clipboard.writeText(result.message);
        setError('No phone number saved — message copied instead.');
      } catch {
        setError('No phone number saved for this customer.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, work or reference no."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search work"
          />
        </div>
        <Select
          className="sm:w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Filter by status"
        >
          <option value="open">Still open</option>
          <option value="">All work</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button onClick={() => setAdding((v) => !v)} className="ml-auto">
          <Plus /> Add work
        </Button>
      </div>

      <FormError>{error}</FormError>

      {adding && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Work" htmlFor="w-name" required>
              <Input
                id="w-name"
                list="seva-services"
                autoFocus
                placeholder="Aadhaar update"
                value={form.serviceName}
                onChange={(e) => {
                  const name = e.target.value;
                  const match = services.find((s) => s.name === name);
                  setForm((f) => ({ ...f, serviceName: name, serviceId: match?.id ?? '' }));
                }}
              />
              {/* A datalist, not a select: most work is on the rate list, but a
                  CSC is asked for something new every week and typing it must
                  not require adding a service first. */}
              <datalist id="seva-services">
                {services.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </Field>

            <Field label="Customer" htmlFor="w-party">
              <Select
                id="w-party"
                value={form.partyId}
                onChange={(e) => setForm((f) => ({ ...f, partyId: e.target.value }))}
              >
                <option value="">Walk-in / not saved</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            {!form.partyId && (
              <>
                <Field label="Name" htmlFor="w-pname" hint="For a walk-in you have not saved.">
                  <Input
                    id="w-pname"
                    value={form.partyName}
                    onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
                  />
                </Field>
                <Field label="Mobile" htmlFor="w-pphone" hint="Needed to send the ready message.">
                  <Input
                    id="w-pphone"
                    inputMode="tel"
                    value={form.partyPhone}
                    onChange={(e) => setForm((f) => ({ ...f, partyPhone: e.target.value }))}
                  />
                </Field>
              </>
            )}

            <Field
              label="Reference no."
              htmlFor="w-ref"
              hint="Government acknowledgement / URN. Not the Aadhaar number."
            >
              <Input
                id="w-ref"
                value={form.referenceNo}
                onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))}
              />
            </Field>

            <Field label="Applied on" htmlFor="w-applied" required>
              <Input
                id="w-applied"
                type="date"
                value={form.appliedOn}
                onChange={(e) => setForm((f) => ({ ...f, appliedOn: e.target.value }))}
              />
            </Field>

            <Field label="Promised by" htmlFor="w-expected" hint="What you told the customer.">
              <Input
                id="w-expected"
                type="date"
                value={form.expectedOn}
                onChange={(e) => setForm((f) => ({ ...f, expectedOn: e.target.value }))}
              />
            </Field>

            <Field
              label="Documents held"
              htmlFor="w-docs"
              hint="What paper is with you. Never store an Aadhaar number here."
              className="sm:col-span-2"
            >
              <Input
                id="w-docs"
                placeholder="Aadhaar copy, 2 photos"
                value={form.documentsHeld}
                onChange={(e) => setForm((f) => ({ ...f, documentsHeld: e.target.value }))}
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <Button disabled={pending} onClick={submitNew}>
              {pending ? 'Saving…' : 'Add work'}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={rows.length === 0 ? 'Nothing on the register yet' : 'Nothing matches'}
          description={
            rows.length === 0
              ? 'Add the work you have taken on, and this becomes the list you check when someone asks about their card.'
              : 'Try another status or clear the search.'
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Work</TH>
              <TH>Customer</TH>
              <TH>Reference</TH>
              <TH>Dates</TH>
              <TH numeric>Balance</TH>
              <TH>Status</TH>
              <TH> </TH>
            </TR>
          </THead>
          <TBody>
            {visible.map((r) => (
              <TR key={r.id} className={r.isOverdue ? 'bg-warning/5' : undefined}>
                <TD>
                  <span className="font-medium">{r.serviceName}</span>
                  {r.documentsHeld && (
                    <span className="block text-xs text-muted-foreground">{r.documentsHeld}</span>
                  )}
                </TD>
                <TD>
                  {r.partyName ?? '—'}
                  {r.partyPhone && (
                    <span className="block text-xs text-muted-foreground tabular">
                      {r.partyPhone}
                    </span>
                  )}
                </TD>
                <TD className="tabular text-xs">{r.referenceNo ?? '—'}</TD>
                <TD className="text-xs">
                  <span className="block">Applied {shortDate(r.appliedOn)}</span>
                  {r.expectedOn && (
                    <span className={r.isOverdue ? 'block font-medium text-warning' : 'block text-muted-foreground'}>
                      {r.isOverdue ? 'Late — due ' : 'Due '}
                      {shortDate(r.expectedOn)}
                    </span>
                  )}
                </TD>
                <TD numeric className={Number(r.balance) > 0 ? 'text-warning' : undefined}>
                  {Number(r.balance) > 0 ? `₹${Number(r.balance).toFixed(2)}` : '—'}
                </TD>
                <TD>
                  <Select
                    className="h-8 min-w-32 text-xs"
                    value={r.status}
                    disabled={pending}
                    aria-label={`Status for ${r.serviceName}`}
                    onChange={(e) =>
                      run(() => setWorkStatusAction([r.id], e.target.value as ApplicationStatus))
                    }
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {APPLICATION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <Badge variant={STATUS_TONE[r.status]} className="mt-1 hidden">
                    {APPLICATION_STATUS_LABELS[r.status]}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    {r.status === 'ready' && (
                      <Button
                        variant="ghost"
                        className="h-8 px-2"
                        title="Tell the customer it is ready"
                        aria-label={`Tell ${r.partyName ?? 'the customer'} it is ready`}
                        disabled={pending}
                        onClick={() => tellReady(r.id)}
                      >
                        <MessageCircle className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground"
                      title="Remove from the register"
                      aria-label={`Remove ${r.serviceName}`}
                      disabled={pending}
                      onClick={() => run(() => deleteWorkAction(r.id))}
                    >
                      <Trash2 className="size-4" />
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

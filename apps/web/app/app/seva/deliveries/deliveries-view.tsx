'use client';

import type { ApplicationRow } from '@billwise/db';
import { whatsappShareUrl } from '@billwise/shared';
import { Button, EmptyState, FormError, Input, cn } from '@billwise/ui';
import {
  CheckCheck,
  Inbox,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  Undo2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { CollectDialog } from '../receipts/collect-dialog';
import { readyMessageAction, setWorkStatusAction } from '../work/actions';

const shortDate = (iso: string | null) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';

type View = 'waiting' | 'ready';

/**
 * The handover desk, one card per person.
 *
 * ## Why cards and not a table
 *
 * A table row is for scanning a column. This screen is used one person at a
 * time, with that person standing in front of you, and what you need is their
 * name, their number, what they are here for and what they owe — together, big
 * enough to read without leaning in. On a phone at a counter, a seven-column
 * table is a horizontal scroll.
 *
 * ## Why "Arrived" and "Handed over" are separate
 *
 * They happen days apart. The card arrives on Tuesday and you message everyone;
 * they turn up across the rest of the week. Collapsing the two would lose the
 * only list that answers "who has been told and has not come yet" — which is
 * exactly the list you work through on a slow afternoon.
 */
export function DeliveriesView({
  ready,
  waiting,
  initialQuery,
  initialView,
}: {
  /** Work that has come back and is sitting in the drawer. */
  ready: ApplicationRow[];
  /** Still with the portal. */
  waiting: ApplicationRow[];
  initialQuery: string;
  initialView: View;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>(initialView);
  const [query, setQuery] = React.useState(initialQuery);
  const [error, setError] = React.useState<string | undefined>();
  const [note, setNote] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const visible = React.useMemo(() => {
    const list = view === 'ready' ? ready : waiting;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.serviceName.toLowerCase().includes(q) ||
        (r.partyName ?? '').toLowerCase().includes(q) ||
        (r.referenceNo ?? '').toLowerCase().includes(q) ||
        (r.invoiceNo ?? '').toLowerCase().includes(q) ||
        (r.partyPhone ?? '').includes(q),
    );
  }, [view, ready, waiting, query]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(undefined);
    setNote(undefined);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? 'Something went wrong.');
      else router.refresh();
    });
  }

  function tell(row: ApplicationRow) {
    setError(undefined);
    setNote(undefined);
    startTransition(async () => {
      const result = await readyMessageAction(row.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const url = whatsappShareUrl(result.phone, result.message);
      if (url) {
        window.open(url, 'billwise-share');
        return;
      }
      // No number on file. Copying is better than a dead end — the owner
      // usually has the number in their own phone.
      try {
        await navigator.clipboard.writeText(result.message);
        setNote('No mobile number saved for this customer. The message is on your clipboard.');
      } catch {
        setError('No mobile number saved for this customer.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border bg-card p-0.5">
          <TabButton active={view === 'ready'} onClick={() => setView('ready')} count={ready.length}>
            Ready to collect
          </TabButton>
          <TabButton
            active={view === 'waiting'}
            onClick={() => setView('waiting')}
            count={waiting.length}
          >
            Still waiting
          </TabButton>
        </div>

        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, mobile, work or reference no."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search deliveries"
          />
        </div>
      </div>

      <FormError>{error}</FormError>
      {note && (
        <p className="rounded-lg border border-info/30 bg-info/5 px-3.5 py-2.5 text-sm text-info">
          {note}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            query
              ? 'Nothing matches that'
              : view === 'ready'
                ? 'Nothing waiting to be collected'
                : 'Nothing still with the portal'
          }
          description={
            query
              ? 'Try a name, a mobile number or a reference number.'
              : view === 'ready'
                ? 'When a document comes back, mark it arrived from the "Still waiting" tab and it will appear here.'
                : 'Everything you have taken on has come back.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((row) => {
            const balance = Number(row.balance);
            return (
              <li
                key={row.id}
                className={cn(
                  'rounded-xl border bg-card p-4 shadow-xs',
                  row.isOverdue && 'border-warning/40 bg-warning/5',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {row.partyName ?? 'Walk-in customer'}
                    </p>
                    {row.partyPhone ? (
                      <a
                        href={`tel:${row.partyPhone}`}
                        className="tabular mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        <Phone className="size-3" /> {row.partyPhone}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">No mobile number</p>
                    )}
                  </div>
                  {balance > 0 && (
                    <span className="tabular shrink-0 rounded-lg bg-warning/10 px-2 py-1 text-xs font-bold text-warning">
                      ₹{balance.toFixed(2)} due
                    </span>
                  )}
                </div>

                <p className="mt-2.5 text-sm">{row.serviceName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.referenceNo ? (
                    <span className="tabular">Ref {row.referenceNo}</span>
                  ) : (
                    'No reference number'
                  )}
                  {row.expectedOn && (
                    <span className={row.isOverdue ? 'font-medium text-warning' : ''}>
                      {' · '}
                      {row.isOverdue ? 'Late, promised ' : 'Promised '}
                      {shortDate(row.expectedOn)}
                    </span>
                  )}
                  {row.invoiceNo && <span className="tabular">{` · ${row.invoiceNo}`}</span>}
                </p>

                <div className="mt-3.5 flex flex-wrap gap-2">
                  {view === 'waiting' ? (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => setWorkStatusAction([row.id], 'ready'))}
                    >
                      <PackageCheck /> Document arrived
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" disabled={pending} onClick={() => tell(row)}>
                        <MessageCircle /> Tell them
                      </Button>
                      {/* `balance` is zero for unbilled work, so this is
                          already implied — spelled out anyway so a future
                          change to that default cannot produce a dialog
                          pointing at no receipt. */}
                      {balance > 0 && row.invoiceId && (
                        <CollectDialog
                          invoiceId={row.invoiceId}
                          balance={balance.toFixed(2)}
                          receiptNo={row.invoiceNo ?? undefined}
                          partyName={row.partyName ?? undefined}
                          trigger="icon"
                        />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => run(() => setWorkStatusAction([row.id], 'delivered'))}
                      >
                        <CheckCheck /> Handed over
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Put it back in the waiting list"
                        disabled={pending}
                        onClick={() => run(() => setWorkStatusAction([row.id], 'in_process'))}
                      >
                        <Undo2 />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-[0.6rem] px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      <span
        className={cn(
          'tabular ml-1.5 rounded-full px-1.5 py-px text-[0.65rem] font-bold',
          active ? 'bg-primary-foreground/20' : 'bg-muted',
        )}
      >
        {count}
      </span>
    </button>
  );
}

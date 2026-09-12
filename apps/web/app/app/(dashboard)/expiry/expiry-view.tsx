'use client';

import type { BatchRow } from '@billwise/db';
import {
  Badge,
  Button,
  EmptyState,
  FormError,
  Input,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  cn,
  tableLinkClass,
} from '@billwise/ui';
import { CalendarCheck, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { writeOffBatchAction } from '../products/[id]/batch-actions';

const inr = (v: string | null) => (v ? `₹${Number(v).toFixed(2)}` : '—');

const expiryLabel = (iso: string | null) => {
  if (!iso) return '—';
  const [y, m] = iso.slice(0, 10).split('-');
  return `${m}/${y}`;
};

type View = 'soon' | 'expired';

/**
 * Two lists, because they call for two different actions.
 *
 * Expiring soon is a selling problem — discount it, push it, or send it back
 * while the distributor will still take it. Already expired is a disposal
 * problem. Merging them into one table sorted by date reads fine and hides the
 * fact that half the rows need a completely different decision.
 */
export function ExpiryView({
  expiring,
  expired,
  initialView,
}: {
  expiring: BatchRow[];
  expired: BatchRow[];
  initialView: View;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>(initialView);
  const [query, setQuery] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const rows = view === 'soon' ? expiring : expired;

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (b) =>
        b.productName.toLowerCase().includes(q) || b.batchNo.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const totalValue = visible.reduce(
    (sum, b) => sum + Number(b.quantity) * Number(b.purchasePrice ?? 0),
    0,
  );

  function writeOff(batch: BatchRow) {
    setError(undefined);
    startTransition(async () => {
      const result = await writeOffBatchAction(batch.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border bg-card p-0.5">
          <Tab active={view === 'soon'} count={expiring.length} onClick={() => setView('soon')}>
            Expiring soon
          </Tab>
          <Tab
            active={view === 'expired'}
            count={expired.length}
            onClick={() => setView('expired')}
          >
            Already expired
          </Tab>
        </div>

        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Medicine or batch number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search batches"
          />
        </div>
      </div>

      <FormError>{error}</FormError>

      {visible.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={
            query
              ? 'Nothing matches that'
              : view === 'soon'
                ? 'Nothing expiring soon'
                : 'Nothing has expired'
          }
          description={
            query
              ? 'Try a medicine name or a batch number.'
              : view === 'soon'
                ? 'No batch on the shelf is within three months of its date.'
                : 'Every batch you are holding is still in date.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? 'batch' : 'batches'}
            {totalValue > 0 && (
              <>
                {' · '}
                <span
                  className={cn(
                    'tabular font-semibold',
                    view === 'expired' ? 'text-destructive' : 'text-warning',
                  )}
                >
                  ₹{totalValue.toFixed(2)}
                </span>{' '}
                at cost
              </>
            )}
          </p>

          <Table>
            <THead>
              <TR>
                <TH>Medicine</TH>
                <TH>Batch</TH>
                <TH>Expiry</TH>
                <TH numeric>In stock</TH>
                <TH numeric>Cost value</TH>
                <TH> </TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((batch) => {
                const days = batch.daysToExpiry ?? 0;
                const value = Number(batch.quantity) * Number(batch.purchasePrice ?? 0);
                return (
                  <TR key={batch.id}>
                    <TD>
                      <Link href={`/app/products/${batch.productId}`} className={tableLinkClass}>
                        {batch.productName}
                      </Link>
                    </TD>
                    <TD className="tabular text-xs">{batch.batchNo}</TD>
                    <TD>
                      <span className="tabular">{expiryLabel(batch.expiryDate)}</span>
                      <Badge
                        variant={view === 'expired' ? 'destructive' : 'warning'}
                        className="ml-2"
                      >
                        {view === 'expired'
                          ? `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`
                          : `${days} ${days === 1 ? 'day' : 'days'} left`}
                      </Badge>
                    </TD>
                    <TD numeric>{Number(batch.quantity)}</TD>
                    <TD numeric className="text-muted-foreground">
                      {value > 0 ? inr(value.toFixed(2)) : '—'}
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        {view === 'expired' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={pending}
                            onClick={() => writeOff(batch)}
                          >
                            <Trash2 /> Write off
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {view === 'expired' && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Writing off removes the stock and records why, so the loss shows up in your reports
              instead of vanishing. It cannot be undone from here — if you write one off by
              mistake, add the quantity back with a stock adjustment.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Tab({
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
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground',
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

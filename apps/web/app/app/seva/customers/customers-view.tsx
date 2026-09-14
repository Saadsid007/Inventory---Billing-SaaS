'use client';

import {
  Button,
  EmptyState,
  Input,
  RowActions,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  tableLinkClass,
} from '@billwise/ui';
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  MessageCircle,
  Receipt,
  Search,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { CustomerDialog } from './customer-dialog';

export type CustomerRow = {
  partyId: string;
  name: string;
  phone: string | null;
  invoicedTotal: string;
  paidIn: string;
  outstanding: string;
};

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function CustomersView({ rows }: { rows: CustomerRow[] }) {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'owing' | 'settled'>('all');

  const owingCount = React.useMemo(
    () => rows.filter((r) => Number(r.outstanding) > 0).length,
    [rows],
  );
  const settledCount = rows.length - owingCount;
  const totalOutstanding = React.useMemo(
    () => rows.reduce((sum, r) => sum + Math.max(0, Number(r.outstanding)), 0),
    [rows],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const isOwing = Number(r.outstanding) > 0;
      if (filter === 'owing' && !isOwing) return false;
      if (filter === 'settled' && isOwing) return false;

      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.phone ?? '').includes(q) ||
        r.outstanding.includes(q)
      );
    });
  }, [rows, query, filter]);

  return (
    <div className="space-y-5">
      {/* Top summary cards */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <StatCard
          label="Total outstanding"
          value={inr(totalOutstanding.toFixed(2))}
          hint={`Across ${owingCount} ${owingCount === 1 ? 'customer' : 'customers'} with unpaid balances`}
          icon={Wallet}
          tone={totalOutstanding > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Total Customers"
          value={String(rows.length)}
          hint={`${settledCount} settled · ${owingCount} owing`}
          icon={Users}
        />
      </div>

      {/* Filter and Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative min-w-56 max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search customer by name, phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search customers"
            />
          </div>

          {/* Quick filter chips */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('owing')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === 'owing'
                  ? 'bg-background text-warning shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Owing ({owingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('settled')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === 'settled'
                  ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Settled ({settledCount})
            </button>
          </div>
        </div>

        {/* Create Customer trigger button */}
        <div className="shrink-0">
          <CustomerDialog trigger="button" />
        </div>
      </div>

      {/* Table / Empty state */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Register your first customer or add one while generating a work receipt."
          action={<CustomerDialog trigger="empty" />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching customers"
          description="Try changing the search keyword or filter condition."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(''); setFilter('all'); }}>
              Clear search
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Customer</TH>
              <TH>Mobile</TH>
              <TH numeric>Billed</TH>
              <TH numeric>Received</TH>
              <TH numeric>Outstanding</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((row) => {
              const due = Number(row.outstanding);
              const isOwing = due > 0;
              const cleanPhone = row.phone ? row.phone.replace(/\D/g, '') : '';
              const waLink =
                cleanPhone.length >= 10
                  ? `https://wa.me/91${cleanPhone.slice(-10)}`
                  : null;

              return (
                <TR key={row.partyId} className={isOwing ? 'bg-warning/5' : undefined}>
                  {/* Name and avatar */}
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase">
                        {row.name.charAt(0) || <User className="size-4" />}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/app/seva/customers/${row.partyId}`}
                          className={tableLinkClass}
                          title="View customer profile and history"
                        >
                          {row.name}
                        </Link>
                      </div>
                    </div>
                  </TD>

                  {/* Phone */}
                  <TD className="tabular text-muted-foreground">
                    {row.phone ? (
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={`tel:${row.phone}`}
                          className="hover:text-foreground hover:underline transition-colors"
                          title="Call customer"
                        >
                          {row.phone}
                        </a>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            title="Message on WhatsApp"
                            aria-label={`WhatsApp ${row.name}`}
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TD>

                  {/* Billed */}
                  <TD numeric>{inr(row.invoicedTotal)}</TD>

                  {/* Received */}
                  <TD numeric className="text-muted-foreground">
                    {inr(row.paidIn)}
                  </TD>

                  {/* Outstanding */}
                  <TD
                    numeric
                    className={
                      isOwing ? 'font-semibold text-warning tabular' : 'text-muted-foreground'
                    }
                  >
                    {isOwing ? (
                      inr(row.outstanding)
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="size-3" /> Settled
                      </span>
                    )}
                  </TD>

                  {/* Explicit Action Buttons */}
                  <TD>
                    <RowActions>
                      {/* Explicit Detail page button */}
                      <Link href={`/app/seva/customers/${row.partyId}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 shadow-2xs"
                          title={`View details for ${row.name}`}
                          aria-label={`View details for ${row.name}`}
                        >
                          <Eye className="size-3.5" />
                          <span>Details</span>
                          <ChevronRight className="size-3 opacity-60" />
                        </Button>
                      </Link>

                      {/* Quick Receipt shortcut */}
                      <Link href={`/app/seva/receipts/new?partyId=${row.partyId}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
                          title="Create new receipt for this customer"
                          aria-label={`New receipt for ${row.name}`}
                        >
                          <Receipt className="size-3.5" />
                          <span className="hidden xl:inline">+ Receipt</span>
                        </Button>
                      </Link>
                    </RowActions>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}

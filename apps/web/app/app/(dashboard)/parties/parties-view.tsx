'use client';

import type { PartyBalance } from '@billwise/db';
import {
  Badge,
  Button,
  FilterBar,
  Input,
  Pagination,
  RowActions,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  tableLinkClass,
} from '@billwise/ui';
import { Eye, Pencil, Phone, Search, Users, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

export function PartiesView({ balances }: { balances: PartyBalance[] }) {
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return balances;
    return balances.filter(
      (b) =>
        b.name.toLowerCase().includes(s) ||
        (b.phone && b.phone.toLowerCase().includes(s)),
    );
  }, [balances, q]);

  React.useEffect(() => {
    setPage(1);
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-4">
      <FilterBar>
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contact name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
          />
        </div>

        {q && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8.5 rounded-lg text-xs px-2.5"
            onClick={() => setQ('')}
          >
            <X className="size-3" /> Clear
          </Button>
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No contacts match &ldquo;{q}&rdquo;.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <Table className="rounded-none border-none shadow-none">
            <THead>
              <TR>
                <TH icon={Users}>Name</TH>
                <TH icon={Phone}>Phone</TH>
                <TH icon={Wallet} numeric>
                  Invoiced
                </TH>
                <TH icon={Wallet} numeric>
                  Received
                </TH>
                <TH icon={Wallet} numeric>
                  Outstanding
                </TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {paginated.map((b) => {
                const outstanding = Number(b.outstanding);
                return (
                  <TR key={b.partyId}>
                    <TD>
                      <Link href={`/app/parties/${b.partyId}`} className={tableLinkClass}>
                        {b.name}
                      </Link>
                    </TD>
                    <TD className="tabular text-muted-foreground">{b.phone ?? '-'}</TD>
                    <TD numeric className="text-muted-foreground">
                      ₹{b.invoicedTotal}
                    </TD>
                    <TD numeric className="text-muted-foreground">
                      ₹{b.paidIn}
                    </TD>
                    <TD numeric>
                      {outstanding > 0 ? (
                        <span className="font-semibold text-warning">₹{b.outstanding}</span>
                      ) : outstanding < 0 ? (
                        /* Negative means the business owes them — an advance. */
                        <Badge variant="secondary">₹{b.outstanding} advance</Badge>
                      ) : (
                        <span className="text-muted-foreground">Settled</span>
                      )}
                    </TD>
                    <TD>
                      <RowActions>
                        <Link href={`/app/parties/${b.partyId}`}>
                          <Button variant="success" size="table">
                            <Eye className="size-3" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/app/parties/${b.partyId}#details`}>
                          <Button variant="outline" size="table">
                            <Pencil className="size-3" />
                            Edit
                          </Button>
                        </Link>
                      </RowActions>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}

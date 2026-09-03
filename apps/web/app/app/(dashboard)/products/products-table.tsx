'use client';

import type { listProducts } from '@billwise/db';
import {
  Badge,
  Button,
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
import { Eye, Hash, Layers, Package, Pencil, Tag, Wallet } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

type ProductRow = Awaited<ReturnType<typeof listProducts>>[number];

function stockState(p: ProductRow): 'untracked' | 'out_of_stock' | 'low_stock' | 'in_stock' {
  if (!p.trackInventory) return 'untracked';
  const stock = Number(p.currentStock ?? 0);
  if (stock <= 0) return 'out_of_stock';
  const min = Number(p.lowStockAlert ?? 0);
  if (min > 0 && stock <= min) return 'low_stock';
  return 'in_stock';
}

export function ProductsTable({ products }: { products: readonly ProductRow[] }) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, page, pageSize]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <Table className="rounded-none border-none shadow-none">
        <THead>
          <TR>
            <TH icon={Package}>Name</TH>
            <TH icon={Layers}>Category</TH>
            <TH icon={Hash}>HSN</TH>
            <TH icon={Wallet} numeric>
              Sale price
            </TH>
            <TH icon={Package} numeric>
              Stock
            </TH>
            <TH icon={Tag}>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {paginated.map((p) => {
            const state = stockState(p);
            return (
              <TR key={p.id}>
                <TD>
                  <Link href={`/app/products/${p.id}`} className={tableLinkClass}>
                    {p.name}
                  </Link>
                  {p.sku && <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>}
                </TD>
                <TD className="text-muted-foreground">{p.categoryName ?? '-'}</TD>
                <TD className="tabular text-muted-foreground font-mono">{p.hsnCode ?? '-'}</TD>
                <TD numeric className="font-semibold tabular">
                  ₹{p.salePrice}
                </TD>
                <TD numeric>
                  {state === 'untracked' ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    <>
                      <span className="tabular font-medium">{p.currentStock}</span>
                      {p.unitShortName && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {p.unitShortName}
                        </span>
                      )}
                    </>
                  )}
                </TD>
                <TD>
                  {state === 'untracked' ? (
                    <Badge variant="outline">Service</Badge>
                  ) : state === 'out_of_stock' ? (
                    <Badge variant="destructive" dot>
                      Out of stock
                    </Badge>
                  ) : state === 'low_stock' ? (
                    <Badge variant="warning" dot>
                      Low stock
                    </Badge>
                  ) : (
                    <Badge variant="success" dot>
                      In stock
                    </Badge>
                  )}
                </TD>
                <TD>
                  <RowActions>
                    <Link href={`/app/products/${p.id}`}>
                      <Button variant="success" size="table">
                        <Eye className="size-3" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/app/products/${p.id}`}>
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
        totalItems={products.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[15, 30, 50]}
      />
    </div>
  );
}

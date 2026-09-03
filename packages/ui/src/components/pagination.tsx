'use client';

import { Button } from './button';
import { cn } from '../lib/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

export interface PaginationProps extends React.ComponentProps<'div'> {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
  ...props
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('…');
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground sm:px-5',
        className,
      )}
      {...props}
    >
      {/* Items count summary */}
      <div className="flex items-center gap-3">
        <span className="tabular font-medium text-foreground">
          Showing <span className="font-bold text-foreground">{start}</span>–
          <span className="font-bold text-foreground">{end}</span> of{' '}
          <span className="font-bold text-foreground">{totalItems}</span>
        </span>

        {onPageSizeChange && totalItems > 10 && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <span>·</span>
            <span>Rows:</span>
            <div className="flex items-center rounded-md border border-border/70 bg-card p-0.5 shadow-2xs">
              {pageSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onPageSizeChange(size)}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors',
                    pageSize === size
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Page navigation controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="table"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="size-3.5" />
          </Button>

          <div className="flex items-center gap-1">
            {getPages().map((p, idx) =>
              typeof p === 'string' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={currentPage === p ? 'default' : 'ghost'}
                  size="table"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'h-7 min-w-7 px-2 text-xs font-semibold',
                    currentPage === p ? 'shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p}
                </Button>
              ),
            )}
          </div>

          <Button
            variant="outline"
            size="table"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

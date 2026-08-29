'use client';

import { buttonVariants, cn } from '@bahikhata/ui';
import { Download } from 'lucide-react';

const EXPORTS = [
  { kind: 'products', label: 'Products' },
  { kind: 'stock', label: 'Stock' },
  { kind: 'parties', label: 'Outstanding' },
  { kind: 'invoices', label: 'Invoices' },
] as const;

/**
 * CSV downloads.
 *
 * Plain anchors to a route handler that sets `Content-Disposition`, rather than
 * building a Blob in the browser: the file is generated server-side from the
 * same scoped repositories the pages use, so an export can never contain a row
 * the user could not otherwise see.
 *
 * Styled with `buttonVariants` rather than rendered as a <Button>, because a
 * download has to be a real anchor — a button with an onClick cannot be
 * middle-clicked, opened in a new tab, or used without JavaScript.
 */
export function ExportButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      {EXPORTS.map(({ kind, label }) => (
        <a
          key={kind}
          href={`/app/reports/export/${kind}`}
          download
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Download className="size-4" />
          {label}
        </a>
      ))}
    </div>
  );
}

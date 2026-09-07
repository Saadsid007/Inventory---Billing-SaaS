'use client';

import { Button } from '@billwise/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';

const STORAGE_KEY = 'billwise-seva-print-format';

/**
 * Format switcher. Screen only — `.no-print` keeps it off the paper.
 *
 * A4 is the default here, which is the opposite of the shop side. A Jan Seva
 * Kendra prints government forms all day, so it certainly owns an A4 printer
 * and may well own no thermal one at all. The slip only fills the top of the
 * sheet so the rest can be torn off and used again.
 *
 * The choice is remembered under its own key: a shop and a CSC on the same
 * machine would otherwise fight over one setting.
 */
export function PrintToolbar({
  invoiceId,
  format,
}: {
  invoiceId: string;
  format: 'a4' | 'thermal';
}) {
  const router = useRouter();

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, format);
  }, [format]);

  function choose(next: 'a4' | 'thermal') {
    localStorage.setItem(STORAGE_KEY, next);
    router.replace(`/app/receipts/${invoiceId}/print?format=${next}`);
  }

  return (
    <div className="no-print">
      <Button
        variant={format === 'a4' ? 'default' : 'outline'}
        size="sm"
        onClick={() => choose('a4')}
      >
        A4
      </Button>
      <Button
        variant={format === 'thermal' ? 'default' : 'outline'}
        size="sm"
        onClick={() => choose('thermal')}
      >
        80mm thermal
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        Print
      </Button>
      <Button variant="ghost" size="sm" onClick={() => router.push(`/app/seva/receipts/${invoiceId}`)}>
        Back
      </Button>
    </div>
  );
}

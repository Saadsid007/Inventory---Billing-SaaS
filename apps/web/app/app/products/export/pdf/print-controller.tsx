'use client';

import * as React from 'react';

export function PrintController({ autoPrint }: { autoPrint?: boolean }) {
  React.useEffect(() => {
    // Attach listener to trigger button
    const btn = document.getElementById('trigger-print-btn');
    const handlePrint = () => window.print();

    if (btn) btn.addEventListener('click', handlePrint);

    // Auto-trigger print dialog if requested
    if (autoPrint) {
      const timer = setTimeout(() => window.print(), 350);
      return () => {
        clearTimeout(timer);
        if (btn) btn.removeEventListener('click', handlePrint);
      };
    }

    return () => {
      if (btn) btn.removeEventListener('click', handlePrint);
    };
  }, [autoPrint]);

  return null;
}

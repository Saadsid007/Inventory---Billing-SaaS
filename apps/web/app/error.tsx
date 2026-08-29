'use client';

import { Button } from '@billwise/ui';
import { RotateCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

/**
 * Unhandled error boundary.
 *
 * Deliberately says nothing about what went wrong beyond the digest. A stack
 * trace on screen helps nobody standing at a counter, and the message that
 * matters to a shopkeeper is the one about their data — a failed render never
 * loses a saved bill, and they should be told that rather than left guessing.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('unhandled error', error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-destructive/12 text-destructive">
          <TriangleAlert className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This screen failed to load. Nothing you had already saved is affected. Bills, products
          and payments are all still there.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RotateCw /> Try again
          </Button>
          <Link href="/app">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>
        {error.digest && (
          <p className="tabular mt-6 text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

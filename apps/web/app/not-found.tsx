import { Button } from '@bahikhata/ui';
import { ArrowLeft, SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found' };

/**
 * 404.
 *
 * Also what a customer sees when they scan a QR for a shop whose catalog is
 * switched off, so it must not assume the reader has an account — no "go to
 * your dashboard" as the only way out.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-primary-subtle text-primary-subtle-foreground">
          <SearchX className="size-7" />
        </span>
        <p className="tabular text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-1 text-2xl font-semibold">This page does not exist</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The link may be old, or the shop you are looking for may have switched its catalog off.
          Nothing has been lost.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft /> Back to home
            </Button>
          </Link>
          <Link href="/app">
            <Button>Go to my business</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

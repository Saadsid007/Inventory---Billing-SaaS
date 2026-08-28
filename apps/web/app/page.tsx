import { money, percentOf } from '@bahikhata/core';
import { GST_STATES, INVOICE_KIND_LABELS, SEED_TAX_RATES } from '@bahikhata/shared';
import { Button, ThemeToggle } from '@bahikhata/ui';
import Link from 'next/link';

/**
 * Scaffold status page.
 *
 * Deliberately temporary: it proves the workspace is wired — that apps/web
 * really can resolve @bahikhata/core, @bahikhata/shared and @bahikhata/ui, and
 * that Tailwind picks up design tokens from a package outside this app.
 * Phase 1g replaces it with the real marketing home page.
 */
export default function ScaffoldCheckPage() {
  const wiring = [
    {
      pkg: '@bahikhata/core',
      proof: `percentOf('1000', '18') → ${percentOf('1000', '18')}`,
      note: 'decimal.js money math, half-up',
    },
    {
      pkg: '@bahikhata/shared',
      proof: `${GST_STATES.length} GST states, ${SEED_TAX_RATES.length} seed tax rates`,
      note: 'Zod schemas, enums, constants',
    },
    {
      pkg: '@bahikhata/ui',
      proof: `${Object.keys(INVOICE_KIND_LABELS).length} invoice kinds rendered below`,
      note: 'Tailwind tokens loaded from outside apps/web',
    },
    {
      pkg: '@bahikhata/db',
      proof: 'linked, schema empty until build-order step 3',
      note: 'client not exported — repositories only',
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">Phase 0b · foundation</p>
          <ThemeToggle />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">Bahikhata</h1>
        <p className="text-balance text-muted-foreground">
          Inventory and billing for Indian small businesses. Auth, tenancy and trials are working
          — next up is the tax engine and invoice numbering.
        </p>
        <div className="flex gap-2 pt-1">
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start free trial
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Login
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Package wiring</h2>
        <ul className="divide-y rounded-lg border">
          {wiring.map((row) => (
            <li key={row.pkg} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline">
              <code className="w-56 shrink-0 text-sm font-medium">{row.pkg}</code>
              <div className="min-w-0">
                <p className="tabular text-sm">{row.proof}</p>
                <p className="text-xs text-muted-foreground">{row.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Document types (spec §4)</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(INVOICE_KIND_LABELS).map(([kind, label]) => (
            <span
              key={kind}
              className="rounded-md border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-between border-t pt-6">
        <p className="tabular text-sm text-muted-foreground">
          Sample line total: ₹{money('1180')}
        </p>
        <Button variant="outline" size="sm" disabled>
          Phase 0b pending
        </Button>
      </footer>
    </main>
  );
}

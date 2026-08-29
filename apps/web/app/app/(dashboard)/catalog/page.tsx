import { getBusiness, getSettings, listProducts } from '@bahikhata/db';
import { catalogUrl } from '@bahikhata/shared';
import { Badge } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';
import { CatalogQr } from './catalog-qr';

export const metadata: Metadata = { title: 'Catalog' };

export default async function CatalogSettingsPage() {
  const ctx = await requireBusiness();
  const [business, settings, membership, products] = await Promise.all([
    getBusiness(ctx),
    getSettings(ctx),
    requireMembership(),
    listProducts(ctx, { limit: 500 }),
  ]);

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  const url = catalogUrl(appUrl, business?.slug ?? membership.slug);

  const published = products.filter((p) => p.showInCatalog).length;
  const withPhotos = products.filter(
    (p) => p.showInCatalog && Array.isArray(p.imageUrls) && p.imageUrls.length > 0,
  ).length;

  const live = settings?.catalogEnabled ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Your catalog</h1>
          {live ? <Badge variant="success">Live</Badge> : <Badge variant="outline">Off</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          A public page showing what you sell, kept in sync with your products automatically.
        </p>
      </header>

      {!live && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span className="font-medium">Your catalog is switched off.</span>{' '}
          <span className="text-muted-foreground">
            The page returns 404 until you turn it on in{' '}
            <Link href="/app/settings" className="underline">
              Settings
            </Link>
            .
          </span>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Published products" value={String(published)} />
        <Stat
          label="With a photo"
          value={String(withPhotos)}
          hint={
            published > 0 && withPhotos < published
              ? `${published - withPhotos} without`
              : undefined
          }
        />
        <Stat label="Not published" value={String(products.length - published)} />
      </section>

      {published > 0 && withPhotos < published && (
        <p className="text-sm text-muted-foreground">
          Products without a photo still appear, but they get far fewer enquiries. Adding one
          takes a few seconds from your phone.
        </p>
      )}

      <CatalogQr url={url} businessName={business?.name ?? membership.businessName} live={live} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

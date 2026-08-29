import { getBusiness, getSettings, listProducts } from '@billwise/db';
import { catalogUrl } from '@billwise/shared';
import { Alert, Badge, PageBody, PageHeader, StatCard } from '@billwise/ui';
import { Camera, EyeOff, Image as ImageIcon, TriangleAlert } from 'lucide-react';
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
    <PageBody className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            Your catalog
            {live ? (
              <Badge variant="success" dot>
                Live
              </Badge>
            ) : (
              <Badge variant="outline">Off</Badge>
            )}
          </span>
        }
        description="A public page showing what you sell, kept in sync with your products automatically. Print the QR and put it on your counter."
      />

      {!live && (
        <Alert variant="warning" icon={TriangleAlert} title="Your catalog is switched off">
          The page returns 404 until you turn it on in{' '}
          <Link href="/app/settings" className="font-medium underline underline-offset-4">
            Settings
          </Link>
          .
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Published" value={String(published)} icon={ImageIcon} />
        <StatCard
          label="With a photo"
          value={String(withPhotos)}
          hint={
            published > 0 && withPhotos < published
              ? `${published - withPhotos} still without one`
              : 'Every published product has one'
          }
          icon={Camera}
          tone={published > 0 && withPhotos < published ? 'warning' : 'success'}
        />
        <StatCard
          label="Not published"
          value={String(products.length - published)}
          hint="Hidden from customers"
          icon={EyeOff}
        />
      </section>

      {published > 0 && withPhotos < published && (
        <p className="text-sm text-muted-foreground">
          Products without a photo still appear, but they get far fewer enquiries. Adding one
          takes a few seconds from your phone.
        </p>
      )}

      <CatalogQr url={url} businessName={business?.name ?? membership.businessName} live={live} />
    </PageBody>
  );
}

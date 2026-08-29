import 'server-only';
import { requireStorageEnv } from '@billwise/shared/env';

/**
 * Supabase Storage. Build spec §2 storage rules.
 *
 *   Product images → PUBLIC bucket, {business_id}/products/{product_id}/{uuid}.webp
 *   Business logo  → PUBLIC bucket
 *   Invoice PDFs   → PRIVATE bucket, signed URLs only (Phase 2)
 *
 * Talks to the REST API directly rather than pulling in `@supabase/supabase-js`.
 * The surface we need is three calls, and the service-role key must never reach
 * a bundle — keeping this file `server-only` and dependency-free makes that
 * easy to see at a glance.
 */

/**
 * Build an object path from ids only.
 *
 * Spec §2: "Never build a storage path from unsanitised user input." Nothing
 * here comes from a form — `businessId` is from the session, `productId` is a
 * database uuid, and the filename is generated. A user-supplied filename could
 * contain `../` and walk out of the tenant's folder.
 */
export function productImagePath(businessId: string, productId: string): string {
  assertUuid(businessId);
  assertUuid(productId);
  return `${businessId}/products/${productId}/${crypto.randomUUID()}.webp`;
}

export function businessLogoPath(businessId: string): string {
  assertUuid(businessId);
  return `${businessId}/logo/${crypto.randomUUID()}.webp`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string): void {
  if (!UUID.test(value)) {
    throw new Error('Refusing to build a storage path from a non-uuid segment.');
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/** Public URL of an object in the public bucket. No key, no expiry. */
export function publicUrl(path: string): string {
  const env = requireStorageEnv();
  const base = env.url.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${env.publicBucket}/${path}`;
}

/** The object path inside a public URL, or undefined if it is not one of ours. */
export function pathFromPublicUrl(url: string): string | undefined {
  const env = requireStorageEnv();
  const base = env.url.replace(/\/$/, '');
  const prefix = `${base}/storage/v1/object/public/${env.publicBucket}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : undefined;
}

export async function uploadPublicObject(
  path: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const env = requireStorageEnv();
  const base = env.url.replace(/\/$/, '');

  const response = await fetch(
    `${base}/storage/v1/object/${env.publicBucket}/${encodeURI(path)}`,
    {
      method: 'POST',
      headers: {
        apikey: env.serviceRoleKey,
        Authorization: `Bearer ${env.serviceRoleKey}`,
        'Content-Type': contentType,
        // Product images are immutable — each upload gets a fresh uuid — so a
        // long cache is safe and keeps the catalog fast for repeat visitors.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body,
    },
  );

  if (!response.ok) {
    throw new StorageError(
      `Upload failed (${response.status}): ${(await response.text()).slice(0, 200)}`,
    );
  }

  return publicUrl(path);
}

/**
 * Delete an object. Never throws.
 *
 * A failed delete leaves an orphaned file, which costs a fraction of a paisa.
 * A thrown error here would roll back the user's actual edit, which costs them
 * their work. The cheap failure is the right one.
 */
export async function deletePublicObject(path: string): Promise<void> {
  try {
    const env = requireStorageEnv();
    const base = env.url.replace(/\/$/, '');
    await fetch(`${base}/storage/v1/object/${env.publicBucket}/${encodeURI(path)}`, {
      method: 'DELETE',
      headers: { apikey: env.serviceRoleKey, Authorization: `Bearer ${env.serviceRoleKey}` },
    });
  } catch (error) {
    console.warn('Could not delete storage object; leaving it orphaned.', path, error);
  }
}

export function isStorageConfigured(): boolean {
  try {
    requireStorageEnv();
    return true;
  } catch {
    return false;
  }
}

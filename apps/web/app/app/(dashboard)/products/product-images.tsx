'use client';

import {
  MAX_IMAGES_PER_PRODUCT,
  MAX_IMAGE_EDGE,
  WEBP_QUALITY,
} from '@billwise/shared';
import { Button, FormError } from '@billwise/ui';
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import {
  removeProductImageAction,
  reorderProductImagesAction,
  uploadProductImageAction,
} from './image-actions';

/**
 * Product images. Build spec Phase 1b: public bucket, webp, max 5.
 *
 * Conversion happens HERE, in the browser, not on the server. A phone photo is
 * 3–5MB of JPEG; resized to 1200px and re-encoded as webp it leaves as roughly
 * 150KB. For a shopkeeper on a slow connection that is the difference between
 * the upload working and the upload timing out — and it costs the server
 * nothing.
 */

/** Draw onto a canvas at a bounded size and re-encode as webp. */
async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  );
  if (!blob) throw new Error('This browser could not produce a webp image.');
  return blob;
}

export function ProductImages({
  productId,
  initialUrls,
}: {
  productId: string;
  initialUrls: readonly string[];
}) {
  const [urls, setUrls] = React.useState<string[]>([...initialUrls]);
  const [error, setError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const full = urls.length >= MAX_IMAGES_PER_PRODUCT;

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(undefined);
    setBusy(true);

    try {
      // Sequential, not parallel: a shop uploading five photos over a weak
      // connection gets a much better outcome from one at a time than from
      // five racing each other into a timeout.
      for (const file of Array.from(files)) {
        if (urls.length >= MAX_IMAGES_PER_PRODUCT) break;

        let webp: Blob;
        try {
          webp = await toWebp(file);
        } catch {
          setError(`Could not read "${file.name}". Is it an image?`);
          continue;
        }

        const body = new FormData();
        body.append('file', new File([webp], 'image.webp', { type: 'image/webp' }));

        const result = await uploadProductImageAction(productId, body);
        if (result.ok) {
          setUrls(result.imageUrls);
        } else {
          setError(result.error);
          break;
        }
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(url: string) {
    setError(undefined);
    setBusy(true);
    const result = await removeProductImageAction(productId, url);
    if (result.ok) setUrls(result.imageUrls);
    else setError(result.error);
    setBusy(false);
  }

  async function move(index: number, delta: number) {
    const next = [...urls];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];

    setUrls(next); // optimistic — reordering should feel instant
    setBusy(true);
    const result = await reorderProductImagesAction(productId, next);
    if (!result.ok) {
      setUrls(urls); // put it back
      setError(result.error);
    }
    setBusy(false);
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">Photos</h2>
        <p className="text-xs text-muted-foreground">
          Up to {MAX_IMAGES_PER_PRODUCT}. The first one is what shows on your catalog.
          Photos are shrunk and converted on your phone before uploading.
        </p>
      </div>

      <FormError>{error}</FormError>

      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {urls.map((url, i) => (
            <li key={url} className="w-28 space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                <Image
                  src={url}
                  alt={`Product photo ${i + 1}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  aria-label={`Move photo ${i + 1} earlier`}
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  disabled={busy}
                  onClick={() => remove(url)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move photo ${i + 1} later`}
                  disabled={busy || i === urls.length - 1}
                  onClick={() => move(i, 1)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void addFiles(e.target.files)}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy || full}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="size-4" />
        {busy ? 'Uploading…' : full ? `Limit of ${MAX_IMAGES_PER_PRODUCT} reached` : 'Add photos'}
      </Button>
    </section>
  );
}

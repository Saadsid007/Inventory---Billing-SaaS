'use client';

import { MAX_IMAGE_EDGE, WEBP_QUALITY } from '@billwise/shared';
import { Button, Card, FormError } from '@billwise/ui';
import { ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import {
  type ImageSlot,
  removeBusinessImageAction,
  uploadBusinessImageAction,
} from './logo-actions';

/** Both images are small on paper; no point shipping a 1200px one. */
const IMAGE_EDGE = 512;

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = Math.min(IMAGE_EDGE, MAX_IMAGE_EDGE);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', WEBP_QUALITY));
  if (!blob) throw new Error('This browser could not produce a webp image.');
  return blob;
}

/**
 * One component for the logo and the signature.
 *
 * They differ only in wording and in the preview's shape: a logo is roughly
 * square, a signature is a wide strip, and previewing a signature in a square
 * box makes a perfectly good scan look wrong.
 */
export function BusinessImageSection({
  slot,
  title,
  description,
  hint,
  initialUrl,
  wide = false,
}: {
  slot: ImageSlot;
  title: string;
  description: string;
  hint?: string;
  initialUrl: string | null;
  wide?: boolean;
}) {
  const [url, setUrl] = React.useState(initialUrl);
  const [error, setError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(undefined);
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', new File([await toWebp(file)], `${slot}.webp`, { type: 'image/webp' }));
      const result = await uploadBusinessImageAction(slot, body);
      if (result.ok) setUrl(result.url);
      else setError(result.error);
    } catch {
      setError('Could not read that file. Is it an image?');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    const result = await removeBusinessImageAction(slot);
    if (result.ok) setUrl(null);
    else setError(result.error);
    setBusy(false);
  }

  return (
    <Card className="space-y-3 p-6">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <FormError>{error}</FormError>

      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`relative shrink-0 overflow-hidden rounded-md border bg-white ${
            wide ? 'h-20 w-44' : 'size-20'
          }`}
        >
          {url ? (
            <Image
              src={url}
              alt={title}
              fill
              sizes={wide ? '176px' : '80px'}
              className="object-contain p-1.5"
              unoptimized
            />
          ) : (
            <div className="grid h-full place-items-center px-2 text-center text-xs text-muted-foreground">
              Nothing yet
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" />
            {busy ? 'Uploading…' : url ? 'Replace' : `Upload ${title.toLowerCase()}`}
          </Button>
          {url && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </Card>
  );
}

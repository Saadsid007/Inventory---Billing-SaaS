'use client';

import { MAX_IMAGE_EDGE, WEBP_QUALITY } from '@bahikhata/shared';
import { Button, Card, FormError } from '@bahikhata/ui';
import { ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { removeLogoAction, uploadLogoAction } from './logo-actions';

/** A logo is small on paper; no point shipping a 1200px one. */
const LOGO_EDGE = 512;

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = Math.min(LOGO_EDGE, MAX_IMAGE_EDGE);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, 'image/webp', WEBP_QUALITY),
  );
  if (!blob) throw new Error('This browser could not produce a webp image.');
  return blob;
}

export function LogoSection({ initialUrl }: { initialUrl: string | null }) {
  const [logoUrl, setLogoUrl] = React.useState(initialUrl);
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
      body.append('file', new File([await toWebp(file)], 'logo.webp', { type: 'image/webp' }));
      const result = await uploadLogoAction(body);
      if (result.ok) setLogoUrl(result.logoUrl);
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
    const result = await removeLogoAction();
    if (result.ok) setLogoUrl(null);
    else setError(result.error);
    setBusy(false);
  }

  return (
    <Card className="space-y-3 p-6">
      <div>
        <h2 className="text-base font-semibold">Logo</h2>
        <p className="text-sm text-muted-foreground">
          Printed on your invoices and shown at the top of your public catalog.
        </p>
      </div>

      <FormError>{error}</FormError>

      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
          {logoUrl ? (
            <Image src={logoUrl} alt="Business logo" fill sizes="80px" className="object-contain" unoptimized />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              No logo
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
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            {busy ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload logo'}
          </Button>
          {logoUrl && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

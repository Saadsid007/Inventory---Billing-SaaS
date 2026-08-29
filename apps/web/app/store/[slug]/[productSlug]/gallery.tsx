'use client';

import { cn } from '@billwise/ui';
import Image from 'next/image';
import * as React from 'react';

/** Product photos, with thumbnails when there is more than one. */
export function ProductGallery({
  images,
  name,
}: {
  images: readonly string[];
  name: string;
}) {
  const [active, setActive] = React.useState(0);
  const current = images[active];

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-lg border bg-muted text-sm text-muted-foreground">
        No photo
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
        <Image
          src={current!}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={cn(
                'relative size-16 overflow-hidden rounded-md border bg-muted transition-colors',
                i === active ? 'border-foreground' : 'hover:border-foreground/40',
              )}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

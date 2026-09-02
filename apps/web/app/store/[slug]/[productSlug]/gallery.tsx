'use client';

import { cn } from '@billwise/ui';
import { ImageOff, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

/** Product photo showcase, with thumbnails and zoom affordance. */
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
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border bg-gradient-to-br from-muted/30 to-muted/80 p-8 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground/60 mb-3">
          <ImageOff className="size-8" />
        </div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground mt-1">Official brand product photo coming soon</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="group relative aspect-square w-full overflow-hidden rounded-3xl border bg-card shadow-xs transition-shadow hover:shadow-md">
        <Image
          src={current!}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-105"
          unoptimized
          priority
        />

        {/* Quality Badge Overlay */}
        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs backdrop-blur-xs border">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>100% Genuine</span>
          </span>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={cn(
                'relative size-20 shrink-0 overflow-hidden rounded-2xl border bg-card p-1.5 transition-all shadow-2xs',
                i === active
                  ? 'border-primary ring-2 ring-primary/30 scale-102'
                  : 'hover:border-foreground/40 opacity-70 hover:opacity-100',
              )}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="80px"
                className="object-contain"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

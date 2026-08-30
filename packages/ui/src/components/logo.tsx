import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * The logo.
 *
 * ## Why this is one component and not two image files
 *
 * A light logo and a dark logo shipped as two PNGs means picking between them
 * in JavaScript, which cannot happen until hydration: the wrong one paints
 * first and swaps a moment later. Every theme toggle would flash.
 *
 * So the mark is inline SVG whose colours come from CSS variables, and the
 * wordmark is text in `currentColor`. Switching themes is then a CSS repaint
 * in the same frame as everything else, with nothing to load and nothing to
 * flash. The two "logos" are one drawing that reads correctly on either
 * surface.
 *
 * The mark is a receipt: a torn-off slip with two lines of text on it. It has
 * to survive being 16 pixels wide in a browser tab, so it is a silhouette with
 * one idea in it rather than a monogram nobody can read at that size.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Billwise"
      className={cn('size-8', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bw-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" />
          {/* A second stop a shade deeper, so the tile has some life on a flat
              white header without needing a shadow. */}
          <stop offset="100%" stopColor="var(--color-primary-hover)" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#bw-mark)" />

      {/* The slip, with a torn bottom edge. */}
      <path
        d="M10 7.5h12a1 1 0 0 1 1 1v15.8l-2.4-1.5-2.3 1.5-2.3-1.5-2.3 1.5-2.4-1.5V8.5a1 1 0 0 1 1-1Z"
        fill="white"
      />
      {/* Two lines of writing. The lower one is short, which is what makes it
          read as a bill rather than as a plain page. */}
      <rect x="12.6" y="11.6" width="6.8" height="1.9" rx="0.95" fill="url(#bw-mark)" />
      <rect x="12.6" y="15.6" width="4.4" height="1.9" rx="0.95" fill="url(#bw-mark)" />
    </svg>
  );
}

/**
 * Mark plus wordmark.
 *
 * The word is `currentColor`, so it inherits from wherever it sits: near-black
 * on the marketing header, white inside the blue auth panel, near-white in dark
 * mode. One component, correct everywhere.
 */
export function Logo({
  className,
  markClassName,
  showWord = true,
}: {
  className?: string;
  markClassName?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      {showWord && (
        <span className="text-lg font-semibold tracking-tight text-current">Billwise</span>
      )}
    </span>
  );
}

export type LogoProps = React.ComponentProps<typeof Logo>;

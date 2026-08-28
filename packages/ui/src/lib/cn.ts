import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes so a caller's `className` actually wins over the
 * component's defaults — `px-2` passed into something declaring `px-4` should
 * override it, not fight it in the cascade.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

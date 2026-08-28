import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('lets a caller className override a component default', () => {
    expect(cn('px-4 text-sm', 'px-2')).toBe('text-sm px-2');
  });

  it('drops falsy values', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
  });

  it('handles conditional objects and arrays', () => {
    expect(cn(['flex', { hidden: false, 'gap-2': true }])).toBe('flex gap-2');
  });
});

import { describe, expect, it } from 'vitest';
import { isWebp } from './image-format';

const bytes = (...parts: (string | number[])[]): Uint8Array => {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === 'string') out.push(...[...part].map((c) => c.charCodeAt(0)));
    else out.push(...part);
  }
  return new Uint8Array(out);
};

/** RIFF | 4-byte little-endian size | WEBP | payload */
const webp = bytes('RIFF', [0x1a, 0x00, 0x00, 0x00], 'WEBP', 'VP8 ');

describe('isWebp', () => {
  it('accepts a real WebP header', () => {
    expect(isWebp(webp)).toBe(true);
  });

  it('rejects the formats a phone actually produces', () => {
    // JPEG
    expect(isWebp(bytes([0xff, 0xd8, 0xff, 0xe0], 'JFIF', [0, 0, 0, 0]))).toBe(false);
    // PNG
    expect(isWebp(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe(false);
    // GIF
    expect(isWebp(bytes('GIF89a', [0, 0, 0, 0, 0, 0]))).toBe(false);
  });

  it('rejects a RIFF container that is not WebP', () => {
    // A WAV file is also RIFF. Checking only the first four bytes would let it
    // through, which is the whole reason the form type is checked too.
    expect(isWebp(bytes('RIFF', [0x24, 0x08, 0x00, 0x00], 'WAVE'))).toBe(false);
    expect(isWebp(bytes('RIFF', [0, 0, 0, 0], 'AVI '))).toBe(false);
  });

  it('rejects an executable that claims to be an image', () => {
    // The case this control exists for: file.type said image/webp.
    expect(isWebp(bytes('MZ', [0x90, 0, 0x03, 0, 0, 0, 0x04, 0, 0, 0]))).toBe(false);
    expect(isWebp(bytes([0x7f], 'ELF', [2, 1, 1, 0, 0, 0, 0, 0]))).toBe(false);
  });

  it('rejects input too short to contain a header', () => {
    expect(isWebp(new Uint8Array())).toBe(false);
    expect(isWebp(bytes('RIFF'))).toBe(false);
    expect(isWebp(bytes('RIFF', [0, 0, 0, 0], 'WEB'))).toBe(false);
  });

  it('rejects a file that merely contains the word WEBP later on', () => {
    expect(isWebp(bytes('MZ..', [0, 0, 0, 0], 'junkWEBP'))).toBe(false);
  });
});

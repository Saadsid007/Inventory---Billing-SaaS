/**
 * File-format sniffing for uploads.
 *
 * Lives here rather than inside the `'use server'` action so it can be unit
 * tested — an untested security control is one that quietly stops working.
 *
 * The point is to read the actual bytes. `file.type` is whatever the client
 * decided to claim, so a renamed executable arrives declaring `image/webp`
 * quite happily.
 */

/** A WebP file is a RIFF container whose form type is "WEBP". */
export function isWebp(bytes: Uint8Array): boolean {
  return matchesAscii(bytes, 0, 'RIFF') && matchesAscii(bytes, 8, 'WEBP');
}

function matchesAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

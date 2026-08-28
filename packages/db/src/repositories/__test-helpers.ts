/**
 * A local copy of core's number formatter, for integration tests only.
 *
 * `packages/db` may not depend on `@bahikhata/core` (spec §2.5), and production
 * code injects `formatInvoiceNumber` as a callback. Tests need the same shape
 * without reaching across the boundary — the real formatter's own behaviour is
 * covered by `packages/core/src/numbering/numbering.test.ts`.
 */
export function formatNumberForTest(
  shape: { prefix: string; padding: number },
  n: number,
): string {
  return `${shape.prefix}${String(n).padStart(shape.padding, '0')}`;
}

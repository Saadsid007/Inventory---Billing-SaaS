/**
 * CSV generation. Build spec Phase 1g.
 *
 * Small and local rather than a dependency: the whole job is quoting, and the
 * two things that actually matter about a CSV opened in Indian Excel are the
 * BOM and the formula guard, neither of which a generic library gets right by
 * default.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

/**
 * Escape one cell.
 *
 * The leading apostrophe on `= + - @` is a CSV-injection guard: Excel treats a
 * cell starting with those as a formula, so a product named `=cmd|...` becomes
 * executable the moment a shopkeeper opens their own export. Prefixing makes it
 * plain text and costs nothing.
 */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/["\n\r,]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => cell(c.value(row))).join(','));
  }
  // CRLF: Excel is still the target, and it is the format it expects.
  return lines.join('\r\n');
}

/**
 * A downloadable CSV response.
 *
 * The UTF-8 BOM is not optional. Without it Excel on Windows reads the file as
 * the system codepage, and every ₹ sign and every Devanagari shop name turns
 * into mojibake — which looks like the export being broken.
 */
export function csvResponse(filename: string, csv: string): Response {
  const safe = filename.replace(/[^a-z0-9._-]+/gi, '-');
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** `products-2026-08-29.csv` */
export function datedFilename(prefix: string): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return `${prefix}-${ist.toISOString().slice(0, 10)}.csv`;
}

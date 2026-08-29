import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

type Row = { name: string; qty: number; note: string | null };
const cols = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Qty', value: (r: Row) => r.qty },
  { header: 'Note', value: (r: Row) => r.note },
];

describe('toCsv', () => {
  it('writes a header row and CRLF line endings', () => {
    const csv = toCsv([{ name: 'Salt', qty: 2, note: null }], cols);
    expect(csv).toBe('Name,Qty,Note\r\nSalt,2,');
  });

  it('quotes cells containing commas, quotes or newlines', () => {
    const csv = toCsv(
      [{ name: 'Salt, 1kg', qty: 1, note: 'He said "fine"\nnext line' }],
      cols,
    );
    expect(csv).toContain('"Salt, 1kg"');
    expect(csv).toContain('"He said ""fine""\nnext line"');
  });

  it('neutralises formula injection', () => {
    // A product named =cmd|... would otherwise execute when the shopkeeper
    // opens their own export in Excel.
    for (const dangerous of ['=1+1', '+1', '-1', '@SUM(A1)', '=cmd|" /c calc"!A0']) {
      const csv = toCsv([{ name: dangerous, qty: 1, note: null }], cols);
      const firstCell = csv.split('\r\n')[1]!;
      expect(firstCell.startsWith("'") || firstCell.startsWith('"\'')).toBe(true);
    }
  });

  it('treats empty and null as blank, not as the strings', () => {
    const csv = toCsv([{ name: '', qty: 0, note: null }], cols);
    expect(csv).toBe('Name,Qty,Note\r\n,0,');
  });

  it('produces only a header for an empty list', () => {
    expect(toCsv([], cols)).toBe('Name,Qty,Note');
  });
});

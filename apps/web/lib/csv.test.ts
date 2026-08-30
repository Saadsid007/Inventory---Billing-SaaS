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

describe('text columns', () => {
  type T = { v: string | null };
  const textCols = [{ header: 'V', value: (r: T) => r.v, text: true }];
  const body = (v: string | null) => toCsv([{ v }], textCols).split('\r\n')[1]!;

  it('writes ="value" WITHOUT surrounding CSV quotes', () => {
    // The regression this file exists for. Excel only evaluates ="0713" as a
    // formula when the field is unquoted; wrapped as "=""0713""" it imports
    // the field verbatim and the cell literally reads ="0713". Every date,
    // HSN and invoice number in the reports export looked like that.
    expect(body('0713')).toBe('="0713"');
    expect(body('30-08-2026')).toBe('="30-08-2026"');
    expect(body('SKS-0717')).toBe('="SKS-0717"');
    expect(body('09')).toBe('="09"');
  });

  it('never wraps the formula form in quotes', () => {
    expect(body('2026-27').startsWith('"')).toBe(false);
  });

  it('keeps blanks blank rather than writing =""', () => {
    expect(body(null)).toBe('');
    expect(body('')).toBe('');
  });

  it('falls back to an ordinary cell when the value cannot be written unquoted', () => {
    // A comma would split the row and a quote would end the field early —
    // neither is escapable inside an unquoted field. Correctness of the value
    // beats keeping it out of Excel's autoformatter.
    expect(body('a,b')).toBe('"a,b"');
    expect(body('say "hi"')).toBe('"say ""hi"""');
  });

  it('cannot be used to smuggle in an expression', () => {
    // Anything with a quote takes the fallback path, so a value can never
    // close the formula's string literal and continue as an expression.
    const out = body('" & cmd|" /c calc"!A0 & "');
    expect(out.startsWith('="')).toBe(false);
  });
});

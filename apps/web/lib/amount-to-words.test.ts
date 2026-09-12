import { describe, expect, it } from 'vitest';
import { amountInWords } from './amount-to-words';

describe('amountInWords', () => {
  it('handles zero or invalid numbers', () => {
    expect(amountInWords(0)).toBe('Zero Rupees Only');
    expect(amountInWords('0.00')).toBe('Zero Rupees Only');
    expect(amountInWords(-10)).toBe('Zero Rupees Only');
    expect(amountInWords('invalid')).toBe('Zero Rupees Only');
  });

  it('converts single digit and teen numbers', () => {
    expect(amountInWords(5)).toBe('Five Rupees Only');
    expect(amountInWords('17.00')).toBe('Seventeen Rupees Only');
  });

  it('converts hundreds and thousands', () => {
    expect(amountInWords(450)).toBe('Four Hundred Fifty Rupees Only');
    expect(amountInWords(1500)).toBe('One Thousand Five Hundred Rupees Only');
    expect(amountInWords('25430.00')).toBe('Twenty Five Thousand Four Hundred Thirty Rupees Only');
  });

  it('converts lakhs and crores', () => {
    expect(amountInWords(100000)).toBe('One Lakh Rupees Only');
    expect(amountInWords(1250000)).toBe('Twelve Lakh Fifty Thousand Rupees Only');
    expect(amountInWords(25000000)).toBe('Two Crore Fifty Lakh Rupees Only');
  });

  it('converts rupees and paise accurately', () => {
    expect(amountInWords('150.50')).toBe('One Hundred Fifty Rupees and Fifty Paise Only');
    expect(amountInWords('0.75')).toBe('Seventy Five Paise Only');
    expect(amountInWords('12450.25')).toBe(
      'Twelve Thousand Four Hundred Fifty Rupees and Twenty Five Paise Only',
    );
  });
});

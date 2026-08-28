import { describe, expect, it } from 'vitest';
import {
  compareMoney,
  dec,
  money,
  percentOf,
  qty,
  roundToRupee,
  subtractMoney,
  sumMoney,
} from './money';

describe('money', () => {
  it('formats to two decimal places', () => {
    expect(money('1200')).toBe('1200.00');
    expect(money('0.1')).toBe('0.10');
  });

  it('rounds half-up, not half-even', () => {
    // Banker's rounding would give 2.02 here. Indian invoices round half up.
    expect(money('2.025')).toBe('2.03');
    expect(money('2.035')).toBe('2.04');
  });

  it('does not accumulate float error', () => {
    // 0.1 + 0.2 as floats is 0.30000000000000004.
    expect(sumMoney(['0.1', '0.2'])).toBe('0.30');
  });

  it('stays exact across many small lines', () => {
    const lines = Array.from({ length: 1000 }, () => '0.07');
    expect(sumMoney(lines)).toBe('70.00');
  });

  it('rejects garbage instead of producing NaN', () => {
    expect(() => dec('abc')).toThrow(TypeError);
    expect(() => dec(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe('qty', () => {
  it('keeps three decimals for kg and litre selling', () => {
    expect(qty('2.5')).toBe('2.500');
    expect(qty('0.125')).toBe('0.125');
  });
});

describe('roundToRupee', () => {
  it('rounds to the nearest whole rupee', () => {
    expect(roundToRupee('1180.49')).toBe('1180.00');
    expect(roundToRupee('1180.50')).toBe('1181.00');
  });

  it('handles negatives away from zero, half-up', () => {
    expect(roundToRupee('-1180.50')).toBe('-1181.00');
  });
});

describe('percentOf', () => {
  it('computes GST slabs exactly', () => {
    expect(percentOf('1000', '18')).toBe('180.00');
    expect(percentOf('1000', '0.25')).toBe('2.50');
    expect(percentOf('999.99', '5')).toBe('50.00');
  });
});

describe('comparisons and subtraction', () => {
  it('subtracts at money scale', () => {
    expect(subtractMoney('100', '33.333')).toBe('66.67');
  });

  it('compares without float conversion', () => {
    expect(compareMoney('10.00', '10.000')).toBe(0);
    expect(compareMoney('10.01', '10.00')).toBe(1);
    expect(compareMoney('9.99', '10.00')).toBe(-1);
  });
});

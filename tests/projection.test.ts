import { describe, it, expect } from 'vitest';
import { computeDailyRecommended, selectSingleCardIndex } from '../utils/date';

describe('projections logic', () => {
  it('computeDailyRecommended returns balance divided by days', () => {
    const res = computeDailyRecommended(3100, 2026, 0);
    expect(res.error).toBe(false);
    expect(res.value).toBeCloseTo(100, 6);
  });

  it('computeDailyRecommended signals error for zero or negative balance', () => {
    const zero = computeDailyRecommended(0, 2026, 0);
    const negative = computeDailyRecommended(-50, 2026, 0);
    expect(zero).toEqual({ value: 0, error: true });
    expect(negative).toEqual({ value: 0, error: true });
  });

  it('selectSingleCardIndex maps timeframe to index within bounds', () => {
    expect(selectSingleCardIndex('6meses', 3)).toBe(0);
    expect(selectSingleCardIndex('1ano', 3)).toBe(1);
    expect(selectSingleCardIndex('5anos', 3)).toBe(2);
    expect(selectSingleCardIndex('5anos', 2)).toBe(1);
    expect(selectSingleCardIndex('6meses', 0)).toBe(-1);
  });
});

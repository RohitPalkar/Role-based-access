import { it, expect, describe } from 'vitest';

import { calculateTotalBatches } from './calculate-total-batches';

describe('calculateTotalBatches', () => {
  it('divides and rounds up', () => {
    expect(calculateTotalBatches(100, 30)).toBe(4);
    expect(calculateTotalBatches(100, 50)).toBe(2);
  });

  it('handles zero or negative records per batch', () => {
    expect(calculateTotalBatches(100, 0)).toBe(0);
    expect(calculateTotalBatches(100, -1)).toBe(0);
  });

  it('returns 0 for 0 records', () => {
    expect(calculateTotalBatches(0, 10)).toBe(0);
  });
});

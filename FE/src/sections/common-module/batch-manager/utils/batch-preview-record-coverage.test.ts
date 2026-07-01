import { it, expect, describe } from 'vitest';

import {
  inclusiveScheduleDayCount,
  sumPreviewAllocatedRecords,
  BATCH_MANAGER_MAX_PLANNING_DAYS,
} from './batch-preview-record-coverage';

describe('sumPreviewAllocatedRecords', () => {
  it('sums floor of positive capacity', () => {
    expect(sumPreviewAllocatedRecords([{ capacity: 10 }, { capacity: 15.9 }])).toBe(25);
  });

  it('ignores non-finite or sub-1 values', () => {
    expect(sumPreviewAllocatedRecords([{ capacity: 0 }, { capacity: -1 }, { capacity: 5 }])).toBe(5);
  });
});

describe('inclusiveScheduleDayCount', () => {
  it('returns inclusive calendar days', () => {
    expect(inclusiveScheduleDayCount('2026-01-01', '2026-01-03')).toBe(3);
    expect(inclusiveScheduleDayCount('2026-01-01', '2026-01-01')).toBe(1);
  });

  it('returns null when end is before start', () => {
    expect(inclusiveScheduleDayCount('2026-01-05', '2026-01-01')).toBeNull();
  });

  it('matches max planning rule constant for a 3-day span', () => {
    const n = inclusiveScheduleDayCount('2026-04-01', '2026-04-03');
    expect(n).toBe(BATCH_MANAGER_MAX_PLANNING_DAYS);
  });
});

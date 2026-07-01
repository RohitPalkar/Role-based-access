import { it, expect, describe } from 'vitest';

import { calculateBatchRequirements } from './batchCalculation';

describe('calculateBatchRequirements', () => {
  it('calculates requirements correctly for standard input', () => {
    const params = {
      totalRecords: 100,
      alreadyBatched: 20,
      recordPerBatch: 10,
      durationMinutes: 60,
      startTimeHours: 9,
      endTimeHours: 18,
    };
    const result = calculateBatchRequirements(params);
    expect(result.remainingRecords).toBe(80);
    expect(result.batchesRequired).toBe(8);
    expect(result.slotsPerDay).toBe(9);
    expect(result.exceedsCapacity).toBe(false);
  });

  it('detects capacity excess', () => {
    const params = {
      totalRecords: 200,
      alreadyBatched: 0,
      recordPerBatch: 10,
      durationMinutes: 60,
      startTimeHours: 9,
      endTimeHours: 11, // only 2 hours = 2 slots
    };
    const result = calculateBatchRequirements(params);
    expect(result.batchesRequired).toBe(20);
    expect(result.slotsPerDay).toBe(2);
    expect(result.exceedsCapacity).toBe(true);
  });

  it('handles edge cases like zero records or duration', () => {
    expect(calculateBatchRequirements({
      totalRecords: 0,
      alreadyBatched: 0,
      recordPerBatch: 10,
      durationMinutes: 60,
      startTimeHours: 9,
      endTimeHours: 18,
    }).batchesRequired).toBe(0);

    expect(calculateBatchRequirements({
      totalRecords: 100,
      alreadyBatched: 0,
      recordPerBatch: 10,
      durationMinutes: 0,
      startTimeHours: 9,
      endTimeHours: 18,
    }).slotsPerDay).toBe(0);
  });
});

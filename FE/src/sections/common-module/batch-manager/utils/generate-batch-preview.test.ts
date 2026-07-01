import { it, expect, describe } from 'vitest';

import { generateBatchPreview } from './generate-batch-preview';

describe('generateBatchPreview', () => {
  const d = (iso: string) => new Date(`${iso}T12:00:00`);

  it('returns [] when totalRecords or recordsPerBatch is not positive', () => {
    expect(generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '09:00', '18:00', 60, 10, 0)).toEqual([]);
    expect(generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '09:00', '18:00', 60, 0, 100)).toEqual([]);
  });

  it('returns [] when end date is before start date', () => {
    expect(generateBatchPreview(d('2026-05-05'), d('2026-05-04'), '09:00', '18:00', 60, 10, 50)).toEqual([]);
  });

  it('returns [] for invalid dates or non-finite numeric inputs', () => {
    expect(generateBatchPreview(new Date('invalid'), d('2026-05-04'), '09:00', '18:00', 60, 10, 10)).toEqual([]);
    expect(generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '09:00', '18:00', Number.NaN, 10, 10)).toEqual([]);
    expect(generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '09:00', '18:00', 60, Number.NaN, 10)).toEqual([]);
  });

  it('assigns partial last batch and uses contiguous global batch numbers on one day', () => {
    const out = generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '09:00', '18:00', 60, 10, 25);
    expect(out).toEqual([
      {
        date: '2026-05-04',
        batches: [
          { startTime: '09:00', endTime: '10:00', capacity: 10, batchNumber: 1 },
          { startTime: '10:00', endTime: '11:00', capacity: 10, batchNumber: 2 },
          { startTime: '11:00', endTime: '12:00', capacity: 5, batchNumber: 3 },
        ],
      },
    ]);
  });

  it('stops when capacity are exhausted and continues on the next day', () => {
    const out = generateBatchPreview(d('2026-05-04'), d('2026-05-05'), '09:00', '18:00', 60, 10, 95);
    expect(out).toHaveLength(2);
    expect(out[0]?.date).toBe('2026-05-04');
    expect(out[0]?.batches).toHaveLength(9);
    expect(out[0]?.batches?.every((b) => b.capacity === 10)).toBe(true);
    expect(out[1]?.date).toBe('2026-05-05');
    expect(out[1]?.batches).toEqual([
      { startTime: '09:00', endTime: '10:00', capacity: 5, batchNumber: 10 },
    ]);
  });

  it('does not emit later days or slots after all capacity are assigned', () => {
    const out = generateBatchPreview(d('2026-05-04'), d('2026-05-06'), '09:00', '18:00', 60, 25, 20);
    expect(out).toEqual([
      {
        date: '2026-05-04',
        batches: [{ startTime: '09:00', endTime: '10:00', capacity: 20, batchNumber: 1 }],
      },
    ]);
  });

  it('floors numeric inputs for capacity per batch and total capacity', () => {
    const out = generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '09:00', '12:00', 60, 10.9, 15.9);
    expect(out[0]?.batches).toEqual([
      { startTime: '09:00', endTime: '10:00', capacity: 10, batchNumber: 1 },
      { startTime: '10:00', endTime: '11:00', capacity: 5, batchNumber: 2 },
    ]);
  });

  it('treats same start/end time as a 24-hour window (overnight)', () => {
    const out = generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '09:00', '09:00', 60, 10, 20);
    expect(out[0].batches).toHaveLength(2); // 2 batches of 10 for 20 records
  });

  it('handles missing startTime/endTime by defaulting to 09:00-18:00', () => {
    const out = generateBatchPreview(d('2026-05-04'), d('2026-05-04'), '', '', 60, 10, 10);
    expect(out[0].batches[0].startTime).toBe('09:00');
    expect(out[0].batches[0].endTime).toBe('10:00');
  });
});

import { it, expect, describe } from 'vitest';

import {
  parseScheduleHm,
  scheduleDayWindow,
  mapApiResultToRows,
  estimateBatchSlotCount,
  normalizeScheduleTimeToHm,
  type BatchSlotEstimateFormSlice,
} from './batch-preview-build-rows';

describe('parseScheduleHm', () => {
  it('parses 12h PM to 24h wall clock on reference day', () => {
    expect(parseScheduleHm('10:00 PM').format('HH:mm')).toBe('22:00');
  });

  it('parses 24h input', () => {
    expect(parseScheduleHm('09:30').format('HH:mm')).toBe('09:30');
  });

  it('handles invalid or empty strings by returning default 09:00', () => {
    expect(parseScheduleHm('').format('HH:mm')).toBe('09:00');
    expect(parseScheduleHm('invalid').format('HH:mm')).toBe('09:00');
  });

  it('parses weirdly formatted but numeric strings', () => {
    expect(parseScheduleHm('14:05:extra').format('HH:mm')).toBe('14:05');
  });
});

describe('normalizeScheduleTimeToHm', () => {
  it('returns HH:mm', () => {
    expect(normalizeScheduleTimeToHm('6:05 PM')).toBe('18:05');
  });
});

describe('scheduleDayWindow', () => {
  it('extends end to next day when end clock is before start', () => {
    const { windowStart, windowEnd } = scheduleDayWindow({
      date: '2026-01-01',
      startTime: '18:00',
      endTime: '01:00',
    });
    expect(windowEnd.diff(windowStart, 'hour')).toBe(7);
  });
});

describe('estimateBatchSlotCount', () => {
  const base = (): BatchSlotEstimateFormSlice => ({
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    sharedStartTime: '09:00',
    sharedEndTime: '18:00',
    schedule: [{ date: '2026-01-01', startTime: '09:00', endTime: '18:00' }],
    durationMinutes: '60',
    recordsPerBatch: '10',
    idTypes: [],
  });

  it('counts one-day window as 9 slots for 9h at 60 min', () => {
    expect(estimateBatchSlotCount(base())).toBe(9);
  });

  it('defaults to 09:00-18:00 on startDate if schedule is empty', () => {
    const vals = base();
    vals.schedule = [];
    vals.startDate = '2026-05-04';
    expect(estimateBatchSlotCount(vals)).toBe(9);
  });

  it('caps total slots at MAX_PLAN_SLOT_COUNT (400)', () => {
    const vals = base();
    vals.durationMinutes = '1'; // 1 min per slot
    vals.sharedStartTime = '00:00';
    vals.sharedEndTime = '10:00'; // 600 mins = 600 slots
    vals.schedule = [{ date: '2026-01-01', startTime: '00:00', endTime: '10:00' }];
    expect(estimateBatchSlotCount(vals)).toBe(400);
  });
});

describe('mapApiResultToRows', () => {
  it('maps API slots to table rows with formatted times', () => {
    const apiSlots = [
      {
        id: '1',
        startTime: '2026-01-01T09:00:00Z',
        endTime: '2026-01-01T10:00:00Z',
        capacity: 50,
        status: 'LOCKED',
      },
    ];
    const rows = mapApiResultToRows(apiSlots as any);
    expect(rows.length).toBe(1);
    expect(rows[0].startTime).toBe('2026-01-01T09:00:00Z');
    expect(rows[0].endTime).toBe('2026-01-01T10:00:00Z');
    expect(rows[0].capacity).toBe(50);
  });

  it('handles empty API results', () => {
    expect(mapApiResultToRows([])).toEqual([]);
    expect(mapApiResultToRows(undefined as any)).toEqual([]);
  });
});

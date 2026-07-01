import dayjs from 'dayjs';
import { it, vi, expect, describe, afterEach, beforeEach } from 'vitest';

import {
  fAdd,
  fSub,
  fDate,
  fTime,
  today,
  fToNow,
  fIsSame,
  fIsAfter,
  formatStr,
  fDateTime,
  fIsBetween,
  fTimestamp,
  fDateRangeShortLabel,
} from './format-time';

const FIXED_NOW = '2026-01-15T00:00:00.000Z';

describe('format-time', () => {
  describe('fDate', () => {
    it('returns null for falsy date input', () => {
      expect(fDate(null)).toBeNull();
      expect(fDate(undefined)).toBeNull();
      expect(fDate('')).toBeNull();
      expect(fDate(0)).toBeNull();
    });

    it('formats a valid date with the default format', () => {
      const input = '2026-04-17T12:00:00.000Z';
      expect(fDate(input)).toBe(dayjs(input).format(formatStr.date));
    });

    it('formats with a custom format string', () => {
      const input = '2026-04-17T12:00:00.000Z';
      expect(fDate(input, 'YYYY/MM/DD')).toBe(dayjs(input).format('YYYY/MM/DD'));
    });

    it('returns "Invalid time value" for unparseable input', () => {
      expect(fDate('not-a-date')).toBe('Invalid time value');
    });
  });

  describe('fDateTime', () => {
    it('returns null for falsy date input', () => {
      expect(fDateTime(null)).toBeNull();
      expect(fDateTime(undefined)).toBeNull();
    });

    it('formats with default and custom formats', () => {
      const input = '2026-04-17T12:00:00.000Z';
      expect(fDateTime(input)).toBe(dayjs(input).format(formatStr.dateTime));
      expect(fDateTime(input, 'YYYY')).toBe(dayjs(input).format('YYYY'));
    });

    it('returns "Invalid time value" for unparseable input', () => {
      expect(fDateTime('garbage')).toBe('Invalid time value');
    });
  });

  describe('fTime', () => {
    it('returns null for falsy input', () => {
      expect(fTime(undefined)).toBeNull();
    });

    it('formats a valid date with the default time format', () => {
      const input = '2026-04-17T12:00:00.000Z';
      expect(fTime(input)).toBe(dayjs(input).format(formatStr.time));
    });

    it('returns "Invalid time value" when input is invalid', () => {
      expect(fTime('garbage')).toBe('Invalid time value');
    });
  });

  describe('fTimestamp', () => {
    it('returns null for falsy input', () => {
      expect(fTimestamp(null)).toBeNull();
    });

    it('returns the millisecond timestamp for a valid date', () => {
      const input = '2026-04-17T12:00:00.000Z';
      expect(fTimestamp(input)).toBe(dayjs(input).valueOf());
    });

    it('returns "Invalid time value" for invalid input', () => {
      expect(fTimestamp('garbage')).toBe('Invalid time value');
    });
  });

  describe('fIsBetween', () => {
    const start = '2026-01-01T00:00:00.000Z';
    const middle = '2026-01-15T00:00:00.000Z';
    const end = '2026-01-31T00:00:00.000Z';
    const after = '2026-02-15T00:00:00.000Z';

    it('returns false when any argument is falsy', () => {
      expect(fIsBetween(null, start, end)).toBe(false);
      expect(fIsBetween(middle, null, end)).toBe(false);
      expect(fIsBetween(middle, start, null)).toBe(false);
    });

    it('returns true when input falls within the range (inclusive)', () => {
      expect(fIsBetween(middle, start, end)).toBe(true);
      expect(fIsBetween(start, start, end)).toBe(true);
      expect(fIsBetween(end, start, end)).toBe(true);
    });

    it('returns false when input is outside the range', () => {
      expect(fIsBetween(after, start, end)).toBe(false);
    });
  });

  describe('fIsAfter', () => {
    it('returns true when startDate is after endDate', () => {
      expect(fIsAfter('2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(true);
    });

    it('returns false when startDate is before endDate', () => {
      expect(fIsAfter('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')).toBe(false);
    });
  });

  describe('fIsSame', () => {
    it('returns false when either argument is falsy', () => {
      expect(fIsSame(null, '2026-01-01')).toBe(false);
      expect(fIsSame('2026-01-01', null)).toBe(false);
    });

    it('returns "Invalid time value" when either side is unparseable', () => {
      expect(fIsSame('garbage', '2026-01-01')).toBe('Invalid time value');
    });

    it('compares by year by default', () => {
      expect(fIsSame('2026-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z')).toBe(true);
      expect(fIsSame('2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')).toBe(false);
    });

    it('honours the provided unit', () => {
      expect(fIsSame('2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z', 'month')).toBe(true);
      expect(fIsSame('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', 'month')).toBe(false);
    });
  });

  describe('fDateRangeShortLabel', () => {
    it('returns "Invalid time value" when range is reversed', () => {
      expect(fDateRangeShortLabel('2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(
        'Invalid time value'
      );
    });

    it('returns "Invalid time value" when either date is invalid', () => {
      expect(fDateRangeShortLabel('garbage', '2026-01-01T00:00:00.000Z')).toBe(
        'Invalid time value'
      );
    });

    it('returns the long label when initial flag is true', () => {
      const start = '2026-01-01T00:00:00.000Z';
      const end = '2026-12-31T00:00:00.000Z';
      expect(fDateRangeShortLabel(start, end, true)).toBe(`${fDate(start)} - ${fDate(end)}`);
    });

    it('uses short month-and-end label when same year, different months', () => {
      const start = '2026-01-10T00:00:00.000Z';
      const end = '2026-05-20T00:00:00.000Z';
      expect(fDateRangeShortLabel(start, end)).toBe(`${fDate(start, 'DD MMM')} - ${fDate(end)}`);
    });

    it('uses day-and-end label when same month, different days', () => {
      const start = '2026-01-10T00:00:00.000Z';
      const end = '2026-01-20T00:00:00.000Z';
      expect(fDateRangeShortLabel(start, end)).toBe(`${fDate(start, 'DD')} - ${fDate(end)}`);
    });

    it('uses single-end label when start and end are the same day', () => {
      const start = '2026-01-10T00:00:00.000Z';
      const end = '2026-01-10T08:00:00.000Z';
      expect(fDateRangeShortLabel(start, end)).toBe(`${fDate(end)}`);
    });
  });

  describe('time-dependent helpers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(FIXED_NOW));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('today() returns now formatted at start of day', () => {
      const expected = dayjs(new Date(FIXED_NOW)).startOf('day').format('YYYY-MM-DD');
      expect(today('YYYY-MM-DD')).toBe(expected);
    });

    it('fAdd returns an ISO string offset forward from now', () => {
      const result = fAdd({ days: 5 });
      const expected = dayjs(new Date(FIXED_NOW))
        .add(dayjs.duration({ days: 5 }))
        .format();
      expect(result).toBe(expected);
    });

    it('fSub returns an ISO string offset backward from now', () => {
      const result = fSub({ hours: 3 });
      const expected = dayjs(new Date(FIXED_NOW))
        .subtract(dayjs.duration({ hours: 3 }))
        .format();
      expect(result).toBe(expected);
    });

    it('fToNow returns null for falsy input', () => {
      expect(fToNow(null)).toBeNull();
    });

    it('fToNow returns "Invalid time value" for invalid input', () => {
      expect(fToNow('garbage')).toBe('Invalid time value');
    });

    it('fToNow returns a humanised relative string for a valid date', () => {
      const result = fToNow('2026-01-14T00:00:00.000Z');
      expect(typeof result).toBe('string');
      expect(result).toBe(dayjs('2026-01-14T00:00:00.000Z').toNow(true));
    });
  });
});

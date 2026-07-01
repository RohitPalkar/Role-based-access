import { it, vi, expect, describe, afterEach, beforeEach } from 'vitest';

import { buildMapVouchersPayload } from './build-map-vouchers-payload';

describe('buildMapVouchersPayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mode 'now' returns {} without a notifyAt property", () => {
    const result = buildMapVouchersPayload({ mode: 'now' });
    expect(result).toEqual({});
    expect(result).not.toHaveProperty('notifyAt');
  });

  it('mode scheduled with valid date and time returns notifyAt as ISO-8601 UTC', () => {
    const result = buildMapVouchersPayload({
      mode: 'scheduled',
      date: '2026-06-20',
      time: '14:30',
    });

    expect(result).toHaveProperty('notifyAt');
    expect((result as { notifyAt: string }).notifyAt).toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
    );
    expect(new Date((result as { notifyAt: string }).notifyAt).toISOString()).toBe(
      (result as { notifyAt: string }).notifyAt
    );
  });

  it('mode scheduled with missing time throws', () => {
    expect(() =>
      buildMapVouchersPayload({ mode: 'scheduled', date: '2026-06-20', time: '' })
    ).toThrow('Date and time are required for scheduled notification');
  });

  it('mode scheduled with missing date throws', () => {
    expect(() =>
      buildMapVouchersPayload({ mode: 'scheduled', date: '', time: '14:30' })
    ).toThrow('Date and time are required for scheduled notification');
  });

  it('mode scheduled with invalid date throws', () => {
    expect(() =>
      buildMapVouchersPayload({ mode: 'scheduled', date: 'not-a-date', time: '14:30' })
    ).toThrow('Invalid date or time');
  });
});

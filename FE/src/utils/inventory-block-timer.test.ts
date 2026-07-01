import { it, expect, describe } from 'vitest';

import {
  toPlainRecord,
  parsePositiveMinutes,
  isBlockingApprovedStatus,
  getBlockPaymentWindowEndMs,
  getTimerExtensionMinutesFromUnit,
} from './inventory-block-timer';

describe('parsePositiveMinutes', () => {
  it('accepts positive numbers and numeric strings', () => {
    expect(parsePositiveMinutes(7)).toBe(7);
    expect(parsePositiveMinutes('13')).toBe(13);
  });

  it('rejects non-positive', () => {
    expect(parsePositiveMinutes(0)).toBeNull();
    expect(parsePositiveMinutes(-1)).toBeNull();
    expect(parsePositiveMinutes('')).toBeNull();
    expect(parsePositiveMinutes(null)).toBeNull();
  });
});

describe('getBlockPaymentWindowEndMs', () => {
  it('returns null when there is no blocking object', () => {
    expect(
      getBlockPaymentWindowEndMs({
        unitBlockDuration: 7,
        timerExtension: 13,
      })
    ).toBeNull();
  });

  it('prefers blocking.unitBlockExpiry when present', () => {
    const end = getBlockPaymentWindowEndMs({
      unitBlockDuration: 7,
      blocking: {
        createdAt: '2026-04-20T08:05:40.000Z',
        unitBlockExpiry: '2026-04-20T08:12:41.000Z',
      },
    });
    expect(end).toBe(Date.parse('2026-04-20T08:12:41.000Z'));
  });

  it('uses blocking.createdAt + root unitBlockDuration when expiry is missing', () => {
    const end = getBlockPaymentWindowEndMs({
      unitBlockDuration: 7,
      blocking: {
        createdAt: '2026-04-20T08:05:40.000Z',
      },
    });
    expect(end).toBe(Date.parse('2026-04-20T08:05:40.000Z') + 7 * 60 * 1000);
  });

  it('does not add timerExtension to the computed window from createdAt', () => {
    const end = getBlockPaymentWindowEndMs({
      unitBlockDuration: 7,
      timerExtension: 99,
      blocking: {
        createdAt: '2026-04-20T08:05:40.000Z',
      },
    });
    expect(end).toBe(Date.parse('2026-04-20T08:05:40.000Z') + 7 * 60 * 1000);
  });
});

describe('isBlockingApprovedStatus', () => {
  it('is true when status is Approved (case-insensitive)', () => {
    expect(isBlockingApprovedStatus(toPlainRecord({ status: 'Approved' }))).toBe(true);
    expect(isBlockingApprovedStatus(toPlainRecord({ status: 'approved' }))).toBe(true);
    expect(isBlockingApprovedStatus(toPlainRecord({ status: ' APPROVED ' }))).toBe(true);
  });

  it('is false for other statuses or missing blocking', () => {
    expect(isBlockingApprovedStatus(null)).toBe(false);
    expect(isBlockingApprovedStatus(toPlainRecord({ status: 'Pending' }))).toBe(false);
    expect(isBlockingApprovedStatus(toPlainRecord({}))).toBe(false);
  });
});

describe('getTimerExtensionMinutesFromUnit', () => {
  it('reads timerExtension from unit root only', () => {
    expect(
      getTimerExtensionMinutesFromUnit({
        timerExtension: 13,
        blocking: {},
      } as Record<string, unknown>)
    ).toBe(13);
  });
});

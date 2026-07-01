import {
  diffInDays,
  diffInHours,
  resolveCustomerNameFromDetails,
} from './iom-ageing.util';

describe('iom-ageing.util', () => {
  describe('diffInHours', () => {
    it('returns the floored whole-hour difference', () => {
      const from = new Date('2026-06-26T09:10:00Z');
      const to = new Date('2026-06-27T11:40:00Z');
      expect(diffInHours(from, to)).toBe(26);
    });

    it('accepts ISO string inputs', () => {
      expect(diffInHours('2026-06-26T09:10:00Z', '2026-06-26T12:09:00Z')).toBe(
        2,
      );
    });

    it('clamps negative deltas to 0 (clock skew)', () => {
      const from = new Date('2026-06-27T12:00:00Z');
      const to = new Date('2026-06-27T10:00:00Z');
      expect(diffInHours(from, to)).toBe(0);
    });

    it('returns 0 when either input is null or unparseable', () => {
      expect(diffInHours(null, new Date())).toBe(0);
      expect(diffInHours(new Date(), null)).toBe(0);
      expect(diffInHours('not-a-date', new Date())).toBe(0);
    });
  });

  describe('diffInDays', () => {
    it('returns the floored whole-day difference', () => {
      const from = new Date('2026-06-26T09:10:00Z');
      const to = new Date('2026-06-29T08:09:00Z');
      expect(diffInDays(from, to)).toBe(2);
    });

    it('returns 0 when the same day', () => {
      const from = new Date('2026-06-26T09:00:00Z');
      const to = new Date('2026-06-26T23:00:00Z');
      expect(diffInDays(from, to)).toBe(0);
    });

    it('returns 0 on negative deltas', () => {
      const from = new Date('2026-06-27T00:00:00Z');
      const to = new Date('2026-06-26T00:00:00Z');
      expect(diffInDays(from, to)).toBe(0);
    });
  });

  describe('resolveCustomerNameFromDetails', () => {
    it('prefers `name` over the other keys', () => {
      expect(
        resolveCustomerNameFromDetails({
          name: 'Primary',
          customerName: 'Secondary',
          fullName: 'Tertiary',
        }),
      ).toBe('Primary');
    });

    it('falls back to customerName when name is missing/blank', () => {
      expect(
        resolveCustomerNameFromDetails({
          name: '   ',
          customerName: 'Secondary',
        }),
      ).toBe('Secondary');
    });

    it('falls back to fullName as the last resort', () => {
      expect(
        resolveCustomerNameFromDetails({
          fullName: 'Tertiary',
        }),
      ).toBe('Tertiary');
    });

    it('returns null when no usable key is present', () => {
      expect(resolveCustomerNameFromDetails({ other: 'x' })).toBeNull();
      expect(resolveCustomerNameFromDetails(null)).toBeNull();
      expect(resolveCustomerNameFromDetails(undefined)).toBeNull();
    });
  });
});

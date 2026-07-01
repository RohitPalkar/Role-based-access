import { it, expect, describe } from 'vitest';

import { GATEWAY, MAX_TRANSACTION_LIMIT, PAYMENT_GATEWAY_OPTIONS } from './payment';

describe('payment constants', () => {
  it('GATEWAY enum exposes the expected literal values', () => {
    expect(GATEWAY.RAZORPAY).toBe('Razorpay');
    expect(GATEWAY.EASEBUZZ).toBe('Easebuzz');
  });

  it('PAYMENT_GATEWAY_OPTIONS lists Easebuzz first, then Razorpay', () => {
    expect(PAYMENT_GATEWAY_OPTIONS).toEqual([
      { value: GATEWAY.EASEBUZZ, label: 'Easebuzz' },
      { value: GATEWAY.RAZORPAY, label: 'Razorpay' },
    ]);
  });

  it('every PAYMENT_GATEWAY_OPTIONS value comes from the GATEWAY enum', () => {
    const allowed = new Set<string>(Object.values(GATEWAY));
    PAYMENT_GATEWAY_OPTIONS.forEach((option) => {
      expect(allowed.has(option.value)).toBe(true);
    });
  });

  it('PAYMENT_GATEWAY_OPTIONS pairs each value with a non-empty label', () => {
    PAYMENT_GATEWAY_OPTIONS.forEach((option) => {
      expect(typeof option.label).toBe('string');
      expect(option.label.length).toBeGreaterThan(0);
    });
  });

  it('MAX_TRANSACTION_LIMIT is a positive integer', () => {
    expect(Number.isInteger(MAX_TRANSACTION_LIMIT)).toBe(true);
    expect(MAX_TRANSACTION_LIMIT).toBeGreaterThan(0);
    expect(MAX_TRANSACTION_LIMIT).toBe(10);
  });
});

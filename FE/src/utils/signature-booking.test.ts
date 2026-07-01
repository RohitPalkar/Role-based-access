import { it, expect, describe } from 'vitest';

import { isSignaturePresent } from './signature-booking';

describe('isSignaturePresent', () => {
  it('returns false for undefined', () => {
    expect(isSignaturePresent()).toBe(false);
  });

  it('returns false for null', () => {
    expect(isSignaturePresent(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSignaturePresent('')).toBe(false);
  });

  it('returns false for whitespace-only strings', () => {
    expect(isSignaturePresent('   ')).toBe(false);
    expect(isSignaturePresent('\t\n')).toBe(false);
  });

  it('returns true for a non-empty signature path', () => {
    expect(isSignaturePresent('signatures/user-1.png')).toBe(true);
  });

  it('returns true for a trimmed non-empty signature value', () => {
    expect(isSignaturePresent('  signatures/user-1.png  ')).toBe(true);
  });
});

import { it, expect, describe } from 'vitest';

import { GROUPS, INDIAN_GROUPS, isIndianGroup } from './groups';

describe('groups constants', () => {
  it('exposes the expected GROUPS map', () => {
    expect(GROUPS).toEqual({
      REF: 'Ref',
      NRI: 'NRI',
      CLOSING_RM: 'Closing RM',
      SOURCING_CP_RM: 'Sourcing CP RM',
      CP_RM_AOP: 'CP RM - AOP',
      LOYALTY_RM: 'Loyalty RM',
      GCC: 'GCC',
    });
  });

  it('INDIAN_GROUPS contains exactly the Indian-role labels', () => {
    expect(INDIAN_GROUPS.has(GROUPS.CLOSING_RM)).toBe(true);
    expect(INDIAN_GROUPS.has(GROUPS.SOURCING_CP_RM)).toBe(true);
    expect(INDIAN_GROUPS.has(GROUPS.CP_RM_AOP)).toBe(true);
    expect(INDIAN_GROUPS.has(GROUPS.NRI)).toBe(false);
    expect(INDIAN_GROUPS.has(GROUPS.REF)).toBe(false);
    expect(INDIAN_GROUPS.has(GROUPS.LOYALTY_RM)).toBe(false);
    expect(INDIAN_GROUPS.size).toBe(3);
  });
});

describe('isIndianGroup', () => {
  const groups = [
    { id: 1, name: GROUPS.CLOSING_RM },
    { id: 2, name: GROUPS.NRI },
    { id: 3, name: GROUPS.CP_RM_AOP },
  ];

  it('returns false when groupId is missing', () => {
    expect(isIndianGroup(undefined, groups)).toBe(false);
    expect(isIndianGroup('', groups)).toBe(false);
  });

  it('returns false when groups is not an array', () => {
    expect(isIndianGroup('1')).toBe(false);
    expect(isIndianGroup('1', null as unknown as { id: number; name: string }[])).toBe(false);
  });

  it('returns false when no matching group is found', () => {
    expect(isIndianGroup('99', groups)).toBe(false);
  });

  it('returns false when the matched group has no name', () => {
    expect(isIndianGroup('5', [{ id: 5, name: '' }])).toBe(false);
  });

  it('returns true for groups whose name is in INDIAN_GROUPS', () => {
    expect(isIndianGroup('1', groups)).toBe(true);
    expect(isIndianGroup('3', groups)).toBe(true);
  });

  it('returns false for groups whose name is not in INDIAN_GROUPS', () => {
    expect(isIndianGroup('2', groups)).toBe(false);
  });

  it('coerces numeric ids on either side via String(...)', () => {
    expect(isIndianGroup(1 as unknown as string, groups)).toBe(true);
  });
});

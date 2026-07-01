import type { RoleColumn } from 'src/config/role-based-permissions';

import { it, expect, describe } from 'vitest';

import { roleColumnsToDefinitions } from './role-table-head';

describe('roleColumnsToDefinitions', () => {
  it('returns an empty array for null input', () => {
    expect(roleColumnsToDefinitions(null)).toEqual([]);
  });

  it('returns an empty array for undefined input', () => {
    expect(roleColumnsToDefinitions(undefined)).toEqual([]);
  });

  it('returns an empty array for an empty array input', () => {
    expect(roleColumnsToDefinitions([])).toEqual([]);
  });

  it('filters out entries with missing or non-string id', () => {
    const input = [
      null,
      undefined,
      'string-entry',
      { id: 123 },
      { id: '' },
      { id: 'valid', label: 'Valid', visible: true },
    ] as unknown as RoleColumn[];

    const result = roleColumnsToDefinitions(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('defaults label to the id when label is missing', () => {
    const input = [{ id: 'no-label', visible: true }] as unknown as RoleColumn[];

    expect(roleColumnsToDefinitions(input)[0].label).toBe('no-label');
  });

  it('defaults width to 150 when width is missing', () => {
    const input = [{ id: 'a', label: 'A', visible: true }] as unknown as RoleColumn[];

    expect(roleColumnsToDefinitions(input)[0].width).toBe(150);
  });

  it('preserves an explicit width when provided', () => {
    const input = [{ id: 'a', label: 'A', width: 240, visible: true }] as unknown as RoleColumn[];

    expect(roleColumnsToDefinitions(input)[0].width).toBe(240);
  });

  it('defaults visible to true when missing and respects explicit false', () => {
    const input = [
      { id: 'no-visible' },
      { id: 'hidden', visible: false },
      { id: 'shown', visible: true },
    ] as unknown as RoleColumn[];

    const result = roleColumnsToDefinitions(input);

    expect(result[0].visible).toBe(true);
    expect(result[1].visible).toBe(false);
    expect(result[2].visible).toBe(true);
  });

  it('defaults sortable to false unless explicitly true', () => {
    const input = [
      { id: 'no-sort', visible: true },
      { id: 'sort-false', visible: true, sortable: false },
      { id: 'sort-true', visible: true, sortable: true },
    ] as unknown as RoleColumn[];

    const result = roleColumnsToDefinitions(input);

    expect(result[0].sortable).toBe(false);
    expect(result[1].sortable).toBe(false);
    expect(result[2].sortable).toBe(true);
  });

  it('preserves disableToggle and tooltip when provided', () => {
    const input = [
      {
        id: 'a',
        label: 'A',
        visible: true,
        disableToggle: true,
        tooltip: 'Help text',
      },
    ] as unknown as RoleColumn[];

    const [result] = roleColumnsToDefinitions(input);

    expect(result.disableToggle).toBe(true);
    expect(result.tooltip).toBe('Help text');
  });

  it('only attaches the group field when group is truthy', () => {
    const input = [
      { id: 'no-group', visible: true },
      { id: 'empty-group', visible: true, group: '' },
      { id: 'with-group', visible: true, group: 'Pricing' },
    ] as unknown as RoleColumn[];

    const result = roleColumnsToDefinitions(input);

    expect(Object.hasOwn(result[0], 'group')).toBe(false);
    expect(Object.hasOwn(result[1], 'group')).toBe(false);
    expect(result[2].group).toBe('Pricing');
  });
});

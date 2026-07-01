import { it, expect, describe } from 'vitest';

import { formatTableCellValue } from './table-cell-display';

describe('formatTableCellValue', () => {
  it('returns placeholder for nullish and objects', () => {
    expect(formatTableCellValue(null)).toBe('-');
    expect(formatTableCellValue(undefined)).toBe('-');
    expect(formatTableCellValue({ a: 1 })).toBe('-');
    expect(formatTableCellValue([1, 2])).toBe('-');
  });

  it('uses custom empty placeholder when provided', () => {
    expect(formatTableCellValue(null, '—')).toBe('—');
  });

  it('stringifies booleans', () => {
    expect(formatTableCellValue(true)).toBe('true');
    expect(formatTableCellValue(false)).toBe('false');
  });

  it('passes through strings and numbers', () => {
    expect(formatTableCellValue('x')).toBe('x');
    expect(formatTableCellValue(42)).toBe(42);
  });
});

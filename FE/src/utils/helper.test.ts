import { it, expect, describe } from 'vitest';

import {
  keyBy,
  sumBy,
  orderBy,
  isEqual,
  deepCopy,
  filterKeys,
  flattenDeep,
  getInitials,
  interpolate,
  flattenArray,
  truncateString,
  normalizeValue,
  buildQueryParams,
  formatPercentage,
  stripCountryCode,
  buildQueryString,
  isIndianPhoneValue,
  formatIndianCurrency,
  mapArrayToLabelValue,
  CapitalizeFirstLetter,
  joinWithoutDuplicates,
  formatNumberWithCommas,
  validatePhoneByCountry,
  appendPayloadToEndpoint,
  convertNumberToShortForm,
  formatArrayToCommaString,
  transformChangeSourceHistory,
} from './helper';

describe('helper utilities', () => {
  describe('flattenArray', () => {
    it('flattens a nested array with children', () => {
      const nested = [{ id: 1, children: [{ id: 2 }, { id: 3 }] }, { id: 4 }];
      const flat = flattenArray(nested);
      expect(flat.length).toBe(4);
      expect(flat.map((i: any) => i.id)).toEqual([1, 4, 2, 3]);
    });
  });

  describe('flattenDeep', () => {
    it('flattens deeply nested arrays', () => {
      expect(flattenDeep([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);
    });
  });

  describe('orderBy', () => {
    it('sorts array by multiple properties', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'John', age: 20 },
      ];
      const sorted = orderBy(data, ['name', 'age'], ['asc', 'desc']);
      expect(sorted[0].name).toBe('Jane');
      expect(sorted[1].age).toBe(30);
      expect(sorted[2].age).toBe(20);
    });
  });

  describe('keyBy', () => {
    it('transforms array into object keyed by property', () => {
      const data = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
      expect(keyBy(data, 'id')).toEqual({
        a: { id: 'a', v: 1 },
        b: { id: 'b', v: 2 },
      });
    });
  });

  describe('sumBy', () => {
    it('sums values based on iteratee', () => {
      const data = [{ v: 10 }, { v: 20 }];
      expect(sumBy(data, (i) => i.v)).toBe(30);
    });
  });

  describe('isEqual', () => {
    it('compares primitives and objects', () => {
      expect(isEqual(1, 1)).toBe(true);
      expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(isEqual([1, 2], [1, 2])).toBe(true);
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    });
  });

  describe('CapitalizeFirstLetter', () => {
    it('capitalizes the first letter', () => {
      expect(CapitalizeFirstLetter('hello')).toBe('Hello');
      expect(CapitalizeFirstLetter('')).toBe('');
    });
  });

  describe('buildQueryParams', () => {
    it('builds query string from object', () => {
      expect(buildQueryParams({ a: 1, b: 'foo', c: '' })).toBe('?a=1&b=foo');
    });
  });

  describe('formatNumberWithCommas', () => {
    it('formats numbers for Indian locale', () => {
      expect(formatNumberWithCommas(1234567)).toBe('12,34,567');
    });
  });

  describe('truncateString', () => {
    it('truncates string and replaces underscores', () => {
      expect(truncateString('hello_world_how_are_you', 10)).toBe('hello w...');
    });
  });

  describe('getInitials', () => {
    it('returns initials of a name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('')).toBe('NA');
    });
  });

  describe('appendPayloadToEndpoint', () => {
    it('appends payload as query string', () => {
      expect(appendPayloadToEndpoint('/api/data', { id: 1, type: 'test' })).toBe('/api/data?id=1&type=test');
      expect(appendPayloadToEndpoint('/api/data', { id: null, type: undefined, valid: 'yes' })).toBe('/api/data?valid=yes');
    });
  });

  describe('filterKeys', () => {
    it('filters object keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(filterKeys(obj, 'a', 'c')).toEqual({ a: 1, c: 3 });
    });
  });

  describe('deepCopy', () => {
    it('creates a deep copy of an object', () => {
      const obj = { a: { b: 1 } };
      const copy = deepCopy(obj);
      expect(copy).toEqual(obj);
      expect(copy).not.toBe(obj);
      expect(copy.a).not.toBe(obj.a);
    });
  });

  describe('formatIndianCurrency', () => {
    it('formats amount to Indian currency format', () => {
      expect(formatIndianCurrency(100000)).toBe('1,00,000');
    });
  });

  describe('joinWithoutDuplicates', () => {
    it('joins array items without duplicates', () => {
      expect(joinWithoutDuplicates(['a', 'b', 'a'])).toBe('a, b');
      expect(joinWithoutDuplicates([{ name: 'a' }, { name: 'b' }, { name: 'a' }])).toBe('a, b');
      expect(joinWithoutDuplicates(null)).toBe('-');
    });
  });

  describe('formatPercentage', () => {
    it('formats value to percentage string', () => {
      expect(formatPercentage(10.5)).toBe('10.50%');
      expect(formatPercentage('10.5')).toBe('10.50%');
      expect(formatPercentage(null)).toBe('-');
    });
  });

  describe('phone utilities', () => {
    it('stripCountryCode removes +91 and +0', () => {
      expect(stripCountryCode('+91 9876543210')).toBe('9876543210');
      expect(stripCountryCode('+0 9876543210')).toBe('9876543210');
    });

    it('isIndianPhoneValue detects Indian prefixes', () => {
      expect(isIndianPhoneValue('+91 9876543210')).toBe(true);
      expect(isIndianPhoneValue('+1 9876543210')).toBe(false);
    });

    it('validatePhoneByCountry validates Indian phone length', () => {
      expect(validatePhoneByCountry('9876543210', '+91')).toBe(true);
      expect(validatePhoneByCountry('12345', '+91')).toBe(false);
      expect(validatePhoneByCountry('+1 12345', '+1')).toBe(true);
    });
  });

  describe('convertNumberToShortForm', () => {
    it('converts large numbers to short strings', () => {
      expect(convertNumberToShortForm(12500000)).toBe('1.25 Cr');
      expect(convertNumberToShortForm(125000)).toBe('1.25 L');
      expect(convertNumberToShortForm(1250)).toBe('1.25 K');
      expect(convertNumberToShortForm(100)).toBe('100');
    });
  });

  describe('normalizeValue', () => {
    it('normalizes single and multiple values', () => {
      expect(normalizeValue(' test ', false)).toBe(' test ');
      expect(normalizeValue('', false)).toBe(null);
      expect(normalizeValue(['a', ' ', 'b'], true)).toEqual(['a', 'b']);
      expect(normalizeValue([], true)).toBe(null);
    });
  });

  describe('interpolate', () => {
    it('replaces placeholders in text', () => {
      expect(interpolate('Hello {name}!', { name: 'John' })).toBe('Hello John!');
      expect(interpolate('Hello {name}!', {})).toBe('Hello !');
    });
  });

  describe('mapArrayToLabelValue', () => {
    it('maps primitives', () => {
      expect(mapArrayToLabelValue(['a', 'b'])).toEqual([
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]);
    });

    it('maps objects with keys', () => {
      const data = [{ id: 1, name: 'John' }];
      expect(mapArrayToLabelValue(data, 'name', 'id')).toEqual([
        { label: 'John', value: '1' },
      ]);
    });
  });

  describe('formatArrayToCommaString', () => {
    it('joins array with commas', () => {
      expect(formatArrayToCommaString(['a', 'b'])).toBe('a, b');
      expect(formatArrayToCommaString('single')).toBe('single');
      expect(formatArrayToCommaString([])).toBe('-');
    });
  });

  describe('transformChangeSourceHistory', () => {
    it('transforms API data to history model', () => {
      const apiData = [
        {
          createdAt: '2026-01-01T10:00:00Z',
          currentData: { primarySource: 'A' },
          newData: { primarySource: 'B' },
        },
      ];
      const result = transformChangeSourceHistory(apiData);
      expect(result[0].id).toBe(1);
      expect(result[0].about).toBe('A to B');
      expect(result[0].createdAt).toMatch(/\d{2}-\d{2}-\d{4}/);
    });
  });

  describe('buildQueryString', () => {
    it('builds a query string from an object', () => {
      expect(buildQueryString({ a: 1, b: 'foo' })).toBe('a=1&b=foo');
      expect(buildQueryString({ a: '', b: null })).toBe('');
    });
  });
});

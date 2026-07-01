/**
 * https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore?tab=readme-ov-file#_flatten
 * https://github.com/you-dont-need-x/you-dont-need-lodash
 */

import dayjs from 'dayjs';
import { useRef } from 'react';
import { parsePhoneNumber } from 'libphonenumber-js';

// ----------------------------------------------------------------------
type StringNumberObject = Record<string, string>;
type NumberObject = Record<string, number | "">;

export function flattenArray<T>(list: T[], key = 'children'): T[] {
  let children: T[] = [];

  const flatten = list?.map((item: any) => {
    if (item[key]?.length) {
      children = [...children, ...item[key]];
    }
    return item;
  });

  return flatten?.concat(children.length ? flattenArray(children, key) : children);
}

// ----------------------------------------------------------------------

export function flattenDeep(array: any): any[] {
  const isArray = array && Array.isArray(array);

  if (isArray) {
    return array.flat(Infinity);
  }
  return [];
}

// ----------------------------------------------------------------------

export function orderBy<T>(array: T[], properties: (keyof T)[], orders?: ('asc' | 'desc')[]): T[] {
  return array.slice().sort((a, b) => {
    for (let i = 0; i < properties.length; i += 1) {
      const property = properties[i];
      const order = orders?.[i] === 'desc' ? -1 : 1;

      const aValue = a[property];
      const bValue = b[property];

      if (aValue < bValue) return -1 * order;
      if (aValue > bValue) return 1 * order;
    }
    return 0;
  });
}

// ----------------------------------------------------------------------

export function keyBy<T>(
  array: T[],
  key: keyof T
): {
  [key: string]: T;
} {
  return (array || []).reduce((result, item) => {
    const keyValue = key ? item[key] : item;

    return { ...result, [String(keyValue)]: item };
  }, {});
}

// ----------------------------------------------------------------------

export function sumBy<T>(array: T[], iteratee: (item: T) => number): number {
  return array.reduce((sum, item) => sum + iteratee(item), 0);
}

// ----------------------------------------------------------------------

export function isEqual(a: any, b: any): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => isEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a!);
    const keysB = Object.keys(b!);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every((key) => isEqual(a[key], b[key]));
  }

  return false;
}

// ----------------------------------------------------------------------

function isObject(item: any) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export const merge = (target: any, ...sources: any[]): any => {
  if (!sources.length) return target;

  const source = sources.shift();

  // eslint-disable-next-line no-restricted-syntax
  for (const key in source) {
    if (isObject(source[key])) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      merge(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }

  return merge(target, ...sources);
};
export function buildQueryParams(params: any) {
  const query = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return query ? `?${query}` : '';
}

export function CapitalizeFirstLetter(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function appendPayloadToEndpoint(endpoint: string, payload: Record<string, any>): string {
  // Filter out invalid values and map key-value pairs into query string format
  const queryString = Object.entries(payload)
    .filter(
      ([_, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (!Array.isArray(value) || (Array.isArray(value) && value.length !== 0))
    ) // Exclude undefined and null values
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`) // Encode keys and values
    .join('&'); // Join with "&"

  return queryString ? `${endpoint}?${queryString}` : endpoint; // Append only if queryString exists
}

export const convertToNumberObject = (
  obj: Record<string, string>
): NumberObject =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      value === '' ? "" : Number(value),
    ])
  );

export const convertToStringObject = (obj: {
  [key: string]: number | string;
}): { [key: string]: string } =>
  Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, String(value=== null ? '': value)]));

export const convertBoosterNumberObject = (obj: StringNumberObject) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const convertedValue =
        Number(value) !== 0 && !Number.isNaN(Number(value)) ? Number(value) : value;
      return [key, convertedValue];
    })
  );

export function filterKeys<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      if (key in obj) {
        acc[key] = obj[key];
      }
      return acc;
    },
    {} as Pick<T, K>
  );
}

export function transformKeys<T extends Record<string, any>>(
  array: T[],
  keyMap: Record<string, string>
): T[] {
  return array.map((item) => {
    const transformedItem: Record<string, any> = {};

    Object.keys(item).forEach((key) => {
      const newKey = keyMap[key] || key; // Use the mapped key or default to the original key if not found in keyMap
      transformedItem[newKey] = String(item[key]);
    });

    return transformedItem as T;
  });
}

export const removeDuplicates = <T extends { id: string }>(arr: T[]): T[] => {
  const uniqueMap = new Map<any, T>();

  arr.forEach((item) => {
    uniqueMap.set(item.id, item); // Using the `id` as the key to ensure uniqueness
  });

  return Array.from(uniqueMap.values());
};

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function useDebounceMethod<T extends (...args: any[]) => void>(func: T, delay: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // useRef to persist the timer across renders

  // eslint-disable-next-line func-names
  return function (this: any, ...args: any[]) {
    if (timerRef.current) {
      clearTimeout(timerRef.current); // Clear the previous timer if typing continues
    }

    timerRef.current = setTimeout(() => {
      func.apply(this, args); // Call the debounced function after the delay
    }, delay);
  } as T;
}

export function getInitials(name: string) {
  if (!name || typeof name !== 'string') return 'NA';

  const nameParts = name.split(' ');
  const initials = nameParts.map((part: any) => part.charAt(0).toUpperCase()).join('');
  return initials;
}

export const formatNumberWithCommas = (num: number): string => {
  if (!num) return '0';
  const parts = num?.toString()?.split('.');
  parts[0] = new Intl.NumberFormat('en-IN').format(Number.parseInt(parts[0], 10)); // 🔹 Use `en-IN` locale
  return parts.join('.'); // Preserve original decimal part
};

/** Formats slab/range values to remove floating-point noise (e.g. 4.0000001 → 4) */
export function formatSlabNumber(val: number | string | null | undefined): string {
  if (val === '' || val == null) return '-';
  if (typeof val !== 'number' && typeof val !== 'string') return '-';
  const num = Number(val);
  if (Number.isNaN(num)) return '-';
  const rounded = Math.round(num * 100) / 100;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded);
}

// ---------------------
export function truncateString(str: any, maxLength: number = 60, suffix: string = '...'): string {
  if (typeof str === 'string') {
    str = str.replaceAll(/_/g, ' ');

    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  }
  return str;
}

export function getMinMaxDateForFilter(startFromToday = false) {
  const startYearDate = startFromToday ? dayjs() : dayjs('2023-01-01');

  const currentDate = dayjs();
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month(); // 0-indexed

  const currentFYStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const nextFYEndYear = currentFYStartYear + 2;

  const endYearDate = dayjs(`${nextFYEndYear}-03-31`);

  return {
    startYearDate,
    endYearDate,
  };
}

export const formatIndianCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN').format(amount);

// ----------------------------------------------------------------------

export function joinWithoutDuplicates(
  array: any[] | null | undefined,
  separator: string = ', ',
  fallback: string = '-',
  nameKey: string = 'name'
): string {
  // Handle null, undefined, or non-array inputs
  if (!array || !Array.isArray(array) || array?.length === 0) {
    return fallback;
  }

  try {
    // Extract values from array
    const values = array
      .map((item) => {
        if (item === null || item === undefined) return null;
        
        // If item is an object with the specified key
        if (typeof item === 'object' && item[nameKey]) {
          return String(item[nameKey]).trim();
        }
        
        // If item is a string
        if (typeof item === 'string') {
          return item.trim();
        }
        
        // For other types, convert to string
        return String(item).trim();
      })
      .filter((value) => value && value !== '') // Remove null, undefined, and empty strings
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    return values.length > 0 ? values.join(separator) : fallback;
  } catch (error) {
    console.error('Error in joinWithoutDuplicates:', error, array);
    return fallback;
  }
}

/**
 * Removes duplicate strings from an array (case-insensitive)
 * @param array - Array of strings
 * @returns Array without duplicates
 */
export function removeDuplicateStrings(array: string[] | null | undefined): string[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  const seen = new Set<string>();
  return array.filter((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      return false;
    }
    
    const lowerCaseItem = item.trim().toLowerCase();
    if (seen.has(lowerCaseItem)) {
      return false;
    }
    
    seen.add(lowerCaseItem);
    return true;
  });
}

// Helper function to format percentage values to 2 decimal places
export const formatPercentage = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(numValue)) {
    return '-';
  }
  return `${numValue.toFixed(2)}%`;
};
  export function formatToDDMMYYYY(rawDateString: string): string {
    if (!rawDateString) return '\u00A0\u00A0-\u00A0\u00A0';

    const cleaned = rawDateString.replace(/(\d{1,10})(st|nd|rd|th)/, '$1');

    const parsed = dayjs(cleaned, 'D MMM YYYY');

    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : '\u00A0\u00A0-\u00A0\u00A0';
  }

/**
 * Removes leading India country code (+91 or +0) from a phone string.
 * Used when we know the number is Indian (e.g. for validation).
 */
export const stripCountryCode = (phone?: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/^\+91\s?/, '').replace(/^\+0\s?/, '').trim();
};

/**
 * True if the phone value is Indian (starts with +91 or +0).
 * Use to decide when to apply 10-digit validation; other countries have no format validation.
 */
export const isIndianPhoneValue = (phone?: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const s = phone.trim();
  return /^\+91\s?/.test(s) || /^\+0\s?/.test(s);
};

/**
 * True if we should treat as Indian for validation: value starts with +91/+0 OR countryCode is +91/+0.
 */
export const isIndianPhoneForValidation = (phone?: string, countryCode?: string): boolean => {
  if (countryCode === '+91' || countryCode === '+0') return true;
  return isIndianPhoneValue(phone ?? '');
};

/**
 * Validates phone for forms: if Indian (+91 or +0, by value or countryCode) then must be exactly 10 digits; otherwise no validation.
 * Empty value passes (optional field); only runs length check when user has entered something.
 *
 * If the value starts with `+` but is not +91/+0 (e.g. NRI +1…), skip Indian rules even when `countryCode` is still +91 from defaults/legacy API — matches create/edit when stored contact is international.
 */
export const validatePhoneByCountry = (phone?: string, countryCode?: string): boolean => {
  const s = typeof phone === 'string' ? phone.trim() : String(phone ?? '').trim();
  if (s === '') return true;
  // Explicit international prefix (not +91/+0)
  if (s.startsWith('+') && !/^\+91\s?/.test(s) && !/^\+0\s?/.test(s)) {
    return true;
  }
  const digitsAll = s.replaceAll(/\D/g, '');
  // Numeric fields strip "+"; NRI numbers often stay >10 digits (e.g. 1 + US). Skip Indian rule.
  if (
    digitsAll.length > 10 &&
    !/^\+91\s?/.test(s) &&
    !/^\+0\s?/.test(s)
  ) {
    return true;
  }
  if (!isIndianPhoneForValidation(s, countryCode)) return true;
  const digitsOnly = isIndianPhoneValue(s) ? stripCountryCode(s).replaceAll(/\D/g, '') : (s || '').replaceAll(/\D/g, '');
  return digitsOnly.length === 10;
};

/**
 * Normalize phone from API/SFDC for form display.
 * - Indian only: strip +91 or +0 (and optional space), return rest. e.g. "+91 878987891" → "878987891".
 * - All other (NRI): pass as-is, no strip, no validation. e.g. "+96565850965", "+12285506081", "+12 285506081" unchanged.
 */
export const normalizePhoneFromApi = (phone?: string | null): string => {
  if (phone == null) return '';
  const s = typeof phone === 'string' ? phone.trim() : String(phone).trim();
  if (s === '') return '';
  if (/^\+91\s?/.test(s)) return s.replace(/^\+91\s?/, '').trim();
  if (/^\+0\s?/.test(s)) return s.replace(/^\+0\s?/, '').trim();
  return s;
};

export const isValidPhoneNumberWithRules = (countryCode: string, number:string) => {
  if (!number || !countryCode) return false;

  try {
    const parsedNumber = parsePhoneNumber(`${countryCode}${number}`);
    const numericOnly = number.replaceAll(/\D/g, "");

    if (countryCode === "+91" && numericOnly.length !== 10) return false;

    return parsedNumber?.isValid();
  } catch {
    return false;
  }
};

export function convertNumberToShortForm(num: number | string): string {
  if (num === null || num === undefined || num === '') return '-';
  const value = typeof num === 'string' ? Number.parseFloat(num) : num;
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`; 
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;  
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} K`;  

  return value.toString();
}

export function formatDateIST(
  isoDate?: string | Date | null,
  options?: { hideTime?: boolean }
): string {
  if (!isoDate) return "-";

  const date = new Date(isoDate);

  // Check if invalid
  if (Number.isNaN(date.getTime())) {
    console.warn("Invalid date received:", isoDate);
    return "-";
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  if (!options?.hideTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = true;
  }

  return new Intl.DateTimeFormat("en-GB", formatOptions)
    .format(date)
    .replaceAll(/\//g, "-");
}

export const formatDate = (dateString : string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export function formatDateISTShort(isoDate?: string | Date | null):string {
  if (!isoDate) return "-";

  const date = new Date(isoDate);

  // Convert to IST (UTC + 5:30)
  const istOffset = 5 * 60 + 30; // minutes
  const istTime = new Date(date.getTime() + istOffset * 60 * 1000);

  const day = String(istTime.getUTCDate()).padStart(2, "0");
  const month = istTime.toLocaleString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  const year = istTime.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

export function normalizeValue(value: unknown, multiple: false): string | null;

export function normalizeValue(value: unknown, multiple: true): string[] | null;

export function normalizeValue(
  value: unknown,
  multiple: boolean
): string | string[] | null {
  // MULTI SELECT
  if (multiple) {
    if (!Array.isArray(value)) return null;

    const strings = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');

    return strings.length ? strings : null;
  }

  // SINGLE SELECT
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function mapArrayToLabelValue<
  T extends Record<string, any> | string | number,
  E extends readonly (keyof Extract<T, Record<string, any>>)[]
>(
  arr: T[] = [],
  labelKey?: keyof Extract<T, Record<string, any>>,
  valueKey?: keyof Extract<T, Record<string, any>>,
  extraKeys?: E
) {
  if (!Array.isArray(arr) || arr.length === 0) return [];

  const firstItem = arr[0];

  // CASE 1: primitives
  if (typeof firstItem !== 'object') {
    return (arr as Array<string | number>).map((v) => ({
      label: CapitalizeFirstLetter(String(v)),
      value: String(v),
    }));
  }

  // CASE 2: objects
  if (labelKey && valueKey) {
    return (arr as Array<Record<string, any>>)
      .filter(
        (item) =>
          item?.[labelKey as string] !== undefined &&
          item?.[valueKey as string] !== undefined
      )
      .map((item) => {
        const extras =
          extraKeys?.reduce((acc, key) => {
            acc[key as string] = item[key as string];
            return acc;
          }, {} as Record<string, any>) ?? {};

        return {
          label: CapitalizeFirstLetter(String(item[labelKey as string])),
          value: String(item[valueKey as string]),
          ...extras,
        };
      });
  }

  return [];
}


export const interpolate = (text: string, values: Record<string, string>) =>
  text.replaceAll(/{(\w+)}/g, (_, key) => values[key] ?? '');

 export const formatArrayToCommaString = (value?: string[] | string) => {
  if (!value) return '-';

  if (Array.isArray(value)) {
    return value?.length ? value.join(', ') : '-';
  }

  return value;
};

// convert to IST
const convertToISTDate = (utcDate: string) => {
  const date = new Date(utcDate);
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const day = String(ist.getDate()).padStart(2, '0');
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const year = ist.getFullYear();

  return `${day}-${month}-${year}`;
};

// transform change source history data
export const transformChangeSourceHistory = (apiData: any[]) => apiData.map((item, index) => {
    const current = item?.currentData || {};
    const next = item?.newData || {};

    const createdAt = item?.createdAt
      ? convertToISTDate(item?.createdAt) || new Date(item?.createdAt).toISOString().split('T')[0]
      : '-';

    const about = `${current.primarySource || 'N/A'} to ${
      next.primarySource || 'N/A'
    }`;

    return {
      id: index + 1,

      createdAt,
      reviewedAt:  item?.reviewedAt
        ? convertToISTDate(item?.reviewedAt) || new Date(item?.reviewedAt).toISOString().split('T')[0]
         : '-',

      about,
      targetPRID: item?.targetPRID || '',
      targetEnquiryId: item?.targetEnquiryId || '',
      status: item?.status || '',
      changeSource: item?.changeSource || '',
      reason: item?.reason || '',
      reviewerRemark: item?.reviewerRemark || '',
      approvalProof: item?.approvalProof || '',
      swappedFields: item?.swappedFields || '',
      currentData: {
        firstName: current?.firstName || '',
        lastName: current?.lastName || '',
        emailId: current?.emailId || '',
        countryCode: current?.countryCode || '+91',
        contactNumber: current?.contactNumber || '',
        uniqueReferenceId: item?.targetPRID || '',
        primarySource: current?.primarySource || '',
        amountPaid: current?.amountPaid || 0,
      },

      newData: {
        firstName: next?.firstName || '',
        lastName: next?.lastName || '',
        emailId: next?.emailId || '',
        countryCode: next?.countryCode || '+91',
        contactNumber: next?.contactNumber || '',
        uniqueReferenceId: item?.targetPRID || '',
        primarySource: next?.primarySource || '',
        amountPaid: next?.amountPaid || 0,
      },
    };
  });

 export const buildQueryString = <T extends Record<string, any>>(params: T): string =>
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) => value !== undefined && value !== null && value !== ''
      )
    )
  ).toString();

export const formatTimeToAMPM = (time: string): string => {
  if (!time) return "-";

  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const formattedHour = hours % 12 || 12;

  return `${formattedHour}:${String(minutes).padStart(2, "0")} ${period}`;
};
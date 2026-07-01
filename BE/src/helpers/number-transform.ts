import { decimalTransformer } from 'src/utils/transformers';

// Helper function for converting the stored incentive percentage value.
export function convertFromIncentive(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  return decimalTransformer.from(value);
}

// Helper function for incentive percentage columns.
// It first converts the value to a number (if needed) and then applies
// the custom decimalTransformer logic.
export function convertToIncentive(
  value: number | string | null,
): number | null {
  if (value === null) {
    return null;
  }
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  return decimalTransformer.to(numeric);
}

// Helper function to convert any value (number | string | null)
// to a number or null. This is used for non-incentive columns.
export function convertToDecimal(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  return value;
}

// Helper function to convert from a string (or null) stored
// in the database to a number with 2 fixed decimals.
export function convertFromDecimal(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  return parseFloat(parseFloat(value).toFixed(7));
}

export const safeNumber = (
  v: string | number | null | undefined,
  fallback: number | null = 0,
) => {
  if (v === null || v === undefined || v === '') {
    return fallback;
  }

  const num = Number(v);
  return Number.isNaN(num) ? fallback : num;
};

import { Transform } from 'class-transformer';

export const ToNumberArray = () =>
  Transform(({ value }) => {
    // Return undefined for empty/null/undefined values
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    let result: number[] = [];

    if (Array.isArray(value)) {
      // Filter out empty strings and convert to numbers
      result = value
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter((num) => !Number.isNaN(num));
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      // Try to parse as JSON array first (handles cases like "[39]" or "[39,40]")
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            result = parsed
              .filter((v) => v !== null && v !== undefined && v !== '')
              .map(Number)
              .filter((num) => !Number.isNaN(num));
          }
        } catch {
          // If JSON parsing fails, fall through to comma-separated handling
        }
      }

      // If not a JSON array or parsing failed, treat as comma-separated string
      if (result.length === 0) {
        result = trimmed
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v !== '')
          .map(Number)
          .filter((num) => !Number.isNaN(num));
      }
    }

    // Return undefined if the result array is empty
    return result.length > 0 ? result : undefined;
  });

export function parseBoolean(value: any): boolean | undefined {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }

  return undefined;
}

export function parseStringToArray(value: any): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((v: string) => v.trim())
    .filter(Boolean);
}

export const decimalTransformer = {
  to: (value: number): number => value,
  from: (value: string): number => parseFloat(parseFloat(value).toFixed(7)),
};

/**
 * TypeORM transformer for date/timestamp columns that handles MySQL zero dates
 * Converts MySQL zero date (0000-00-00 00:00:00) to null to avoid Invalid Date errors
 */
export const dateTransformer = {
  to: (value: Date | null): Date | null => value,
  from: (value: string | Date | null): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    // Handle MySQL zero date (0000-00-00 00:00:00) which creates Invalid Date
    return Number.isNaN(date.getTime()) ? null : date;
  },
};

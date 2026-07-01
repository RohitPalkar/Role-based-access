import { endOfDay, format, isAfter, isValid, startOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
  FINANCIAL_YEAR_FORMAT,
  FY_END,
  FY_START,
  IST_TIME_ZONE,
  LISTING_DATE_FORMAT,
} from 'src/config/constants';
import { logger } from 'src/logger/logger';

export const DISPLAY_DATE_FORMAT = 'dd MMM yyyy';

/**
 * Converts a given date to IST (Asia/Kolkata) timezone and returns a Date object.
 * @param dateInput - The date to be converted (Date object or string)
 * @returns A Date object in IST timezone
 */
export function convertToISTDate(dateInput: Date | string): Date | null {
  if (!dateInput) {
    return null;
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return null; // Handle invalid date inputs
  }

  // Convert UTC to IST and return a Date object

  return toZonedTime(date, IST_TIME_ZONE);
}

export const formatDateUtil = (
  date?: string | Date | null,
  mode: 'timestamp' | 'date' | 'display' = 'date',
): string | null => {
  if (mode === 'timestamp') {
    // Use the provided date, or default to the current date.
    const d = date ? new Date(date) : new Date();
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // convert to 12-hour format
    return `${day}${month}_${hours}-${minutes}${ampm}`;
  } else if (mode === 'date') {
    // In 'date' mode, if no date is provided or if it's invalid, return 'NA'
    if (!date) return 'NA';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'NA';

    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();

    const getOrdinalSuffix = (n: number): string => {
      if (n >= 11 && n <= 13) return 'th';
      switch (n % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  } else if (mode === 'display') {
    // In 'display' mode, use format from  date-fns to format the date.
    if (!date) return null;
    return format(date, DISPLAY_DATE_FORMAT);
  }

  return null;
};

/**
 * Returns the start and end dates of the current financial year in MySQL date format ("YYYY-MM-DD").
 *
 * In India, the financial year runs from April 1 to March 31.
 *
 * The function uses:
 *  - IST_TIME_ZONE: to base calculations on the Asia/Kolkata time zone.
 *  - FY_START: the start date of the financial year (e.g. "04-01").
 *  - FY_END: (newly defined) the end date of the financial year ("03-31").
 *  - DATE_FORMAT: (from your constants) defined as "YYYY-MM-DD".
 *
 * @returns A tuple [startDate, endDate] as strings in the "YYYY-MM-DD" format.
 *
 * Example:
 *  If today's date is "15 May 2025", the function returns:
 *    ["2025-04-01", "2026-03-31"]
 */
export function getCurrentFinancialYear(
  financialYear?: string,
): [string, string] {
  // 1) If a valid 'YYYY-YYYY' string is passed, parse and return that range
  if (financialYear) {
    // inline regex for 'YYYY-YYYY'
    const match = FINANCIAL_YEAR_FORMAT.exec(financialYear);
    if (match) {
      const [, startYear, endYear] = match;
      return [
        `${startYear}-${FY_START}`, // e.g. "2024-04-01"
        `${endYear}-${FY_END}`, // e.g. "2025-03-31"
      ];
    } else {
      logger.error(
        `getCurrentFinancialYear: invalid format "${financialYear}", ` +
          `falling back to current FY`,
      );
    }
  }

  // 2) Otherwise, compute based on "today" in IST
  const currentYear = Number(
    formatInTimeZone(new Date(), IST_TIME_ZONE, 'yyyy'),
  );

  const currentMonth = Number(formatInTimeZone(new Date(), IST_TIME_ZONE, 'M'));

  let startYear: number;
  let endYear: number;

  // April = 4 in date-fns formatting
  if (currentMonth >= 4) {
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    startYear = currentYear - 1;
    endYear = currentYear;
  }
  // Return the start and end dates in "YYYY-MM-DD" format
  // FY_START and FY_END are defined as "04-01" and "03-31" respectively
  return [
    `${startYear}-${FY_START}`, // e.g. "2024-04-01" if today is Feb 2025
    `${endYear}-${FY_END}`, // e.g. "2025-03-31"
  ];
}

export function safeDate<T>(value: T): T | null {
  return value ?? null;
}

// convert UTC TO IST timezone
export const formatDateTime = (date: Date | string) => {
  if (!date) return 'N/A';

  const parsedDate =
    typeof date === 'string' && !date.endsWith('Z')
      ? new Date(`${date}Z`)
      : new Date(date);

  return formatInTimeZone(parsedDate, IST_TIME_ZONE, LISTING_DATE_FORMAT);
};

export const formatDate = (date: Date | string) => {
  if (!date) return 'N/A';

  return formatInTimeZone(date, IST_TIME_ZONE, 'dd/MM/yyyy'); // only date
};

export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const isValidDateOnOrBefore = (
  date: Date | string | null | undefined,
  deadline: Date,
): boolean => {
  if (!date) {
    return false;
  }

  const parsedDate = new Date(date);

  return isValid(parsedDate) && !isAfter(parsedDate, deadline);
};

// for converting to start of the day and end date till eod

export function normalizeDate(
  value?: Date,
  type: 'start' | 'end' = 'start',
): Date | undefined {
  if (!(value instanceof Date)) return undefined;
  if (isNaN(value.getTime())) return undefined;

  if (type === 'start') {
    // already normalized → return as-is
    if (
      value.getHours() === 0 &&
      value.getMinutes() === 0 &&
      value.getSeconds() === 0
    ) {
      return value;
    }
    return startOfDay(value);
  }

  // end
  if (
    value.getHours() === 23 &&
    value.getMinutes() === 59 &&
    value.getSeconds() === 59
  ) {
    return value;
  }

  return endOfDay(value);
}

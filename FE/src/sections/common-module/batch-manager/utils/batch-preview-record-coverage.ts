import dayjs from 'dayjs';

/** Product rule: batch plan must fit within this many calendar days (inclusive start–end). */
export const BATCH_MANAGER_MAX_PLANNING_DAYS = 3;

export function sumPreviewAllocatedRecords(rows: readonly { capacity: number }[]): number {
  return rows.reduce((sum, row) => {
    const n = row.capacity;
    if (!Number.isFinite(n) || n < 1) {
      return sum;
    }
    return sum + Math.floor(n);
  }, 0);
}

/** Inclusive day count from `YYYY-MM-DD` start through end; `null` if invalid or end before start. */
export function inclusiveScheduleDayCount(startDate: string, endDate: string): number | null {
  const start = dayjs(startDate.trim(), 'YYYY-MM-DD', true);
  const end = dayjs(endDate.trim(), 'YYYY-MM-DD', true);
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) {
    return null;
  }
  return end.diff(start, 'day') + 1;
}

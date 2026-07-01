import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';

import { scheduleDayWindow } from './batch-preview-build-rows';

// ----------------------------------------------------------------------

export type GeneratedBatchSlot = {
  startTime: string;
  endTime: string;
  capacity: number;
  batchNumber: number;
};

export type GeneratedBatchPreviewDay = {
  date: string;
  batches: GeneratedBatchSlot[];
};

/**
 * Consecutive slot bounds inside `[windowStart, windowEnd)`, aligned with `estimateBatchSlotCount` in
 * `batch-preview-build-rows.ts` (each slot ends at `min(cursor + duration, windowEnd)`; next slot starts at that end).
 */
function slotBoundsForDayWindow(
  windowStart: Dayjs,
  windowEnd: Dayjs,
  batchDurationMinutes: number
): { start: Dayjs; end: Dayjs }[] {
  const durationMins = Math.max(1, Math.floor(batchDurationMinutes));
  const slots: { start: Dayjs; end: Dayjs }[] = [];
  let cursor = windowStart;

  for (; ;) {
    if (!cursor.isBefore(windowEnd)) {
      break;
    }
    const slotEndByDuration = cursor.add(durationMins, 'minute');
    const end = slotEndByDuration.isAfter(windowEnd) ? windowEnd : slotEndByDuration;
    if (!end.isAfter(cursor)) {
      break;
    }
    slots.push({ start: cursor, end });
    if (end.isSame(windowEnd, 'minute')) {
      break;
    }
    cursor = end;
  }

  return slots;
}

function inclusiveLocalDateKeys(startDate: Date, endDate: Date): string[] {
  if (
    !(startDate instanceof Date) ||
    !(endDate instanceof Date) ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return [];
  }
  const start = dayjs(startDate).startOf('day');
  const end = dayjs(endDate).startOf('day');
  if (!start.isValid() || !end.isValid() || start.isAfter(end, 'day')) {
    return [];
  }
  const dayCount = end.diff(start, 'day') + 1;
  return Array.from({ length: dayCount }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
}

/**
 * Per-day batch preview using `scheduleDayWindow` and the same consecutive slot packing as the plan summary
 * (`estimateBatchSlotCount`). Records are assigned until `totalRecords` is exhausted (partial last batch; stops
 * before consuming further slots or days).
 */
export function generateBatchPreview(
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string,
  batchDuration: number,
  recordsPerBatch: number,
  totalRecords: number
): GeneratedBatchPreviewDay[] {
  const perBatch = Math.floor(Number(recordsPerBatch));
  const total = Math.floor(Number(totalRecords));
  const durationMins = Math.max(1, Math.floor(Number(batchDuration)));

  if (
    !Number.isFinite(perBatch) ||
    !Number.isFinite(total) ||
    !Number.isFinite(durationMins) ||
    perBatch < 1 ||
    total < 1
  ) {
    return [];
  }

  const dateKeys = inclusiveLocalDateKeys(startDate, endDate);
  if (dateKeys.length === 0) {
    return [];
  }

  const result: GeneratedBatchPreviewDay[] = [];
  let remaining = total;
  let batchNumber = 1;

  dateKeys.forEach((date) => {
    if (remaining <= 0) return;

    const { windowStart, windowEnd } = scheduleDayWindow({
      date,
      startTime: startTime?.trim() || '09:00',
      endTime: endTime?.trim() || '18:00',
    });

    const dayBatches: GeneratedBatchSlot[] = [];
    const slotBounds = slotBoundsForDayWindow(windowStart, windowEnd, durationMins);

    slotBounds.forEach((bound) => {
      if (remaining <= 0) return;

      const { start, end } = bound;
      const assigned = Math.min(perBatch, remaining);
      dayBatches.push({
        startTime: start.format('HH:mm'),
        endTime: end.format('HH:mm'),
        capacity: assigned,
        batchNumber,
      });
      batchNumber += 1;
      remaining -= assigned;
    });

    if (dayBatches.length > 0) {
      result.push({ date, batches: dayBatches });
    }
  });

  return result;
}

import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { formatDateIST } from 'src/utils/helper';

dayjs.extend(customParseFormat);

// ----------------------------------------------------------------------

/** Row shape returned by the batch preview API (`BatchPreviewTable`). */
export type BatchPreviewRow = {
  id: string;
  name: string;
  slotName: string;
  capacity: number;
  batchId: string;
  isVoucherMapped: boolean;
  /** Calendar date (YYYY-MM-DD) of this batch’s **start**. */
  slotDate: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  status?: string;
  attended?: number;
  headCount?: number;
  filledCount?: number;
};

/** Maps backend slot objects to the frontend row structure. */
export function mapApiResultToRows(result: any[]): BatchPreviewRow[] {
  return (result || []).map((item) => ({
    id: item.id,
    name: item.name,
    batchId: item.batchId,
    isVoucherMapped: item.isVoucherMapped,
    slotName: String(item.slotName || ''),
    capacity: Number(item.capacity || 0),
    filledCount: Number(item.filledCount || 0),
    slotDate: item.date || '',
    dateLabel: item.date ? formatDateIST(item.date, { hideTime: true }) : '',
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    status: item.status || '',
    attended: item.attended || 0,
    headCount: item.headCount || 0,
  }));
}

export type BatchPreviewEditablePatch = Partial<Pick<BatchPreviewRow, 'capacity' | 'startTime' | 'endTime'>>;

/** Subset of batch configuration used only to count slots for the plan summary (no circular import to the form). */
export type BatchSlotEstimateFormSlice = {
  idTypes: (string | number)[];
  startDate: string;
  endDate: string;
  sharedStartTime: string;
  sharedEndTime: string;
  schedule: { date: string; startTime: string; endTime: string }[];
  durationMinutes: string;
  recordsPerBatch: string;
};

/** Caps slot counting for the plan summary when the window × duration is very large. */
const MAX_PLAN_SLOT_COUNT = 400;

const SCHEDULE_TIME_FORMATS = [
  'HH:mm',
  'HH:mm:ss',
  'H:mm',
  'hh:mm A',
  'h:mm A',
  'hh:mm a',
  'h:mm a',
] as const;

/**
 * Parses a schedule clock string to a Dayjs on reference date 2000-01-01 (minute precision).
 * Supports 24h and 12h so values like `10:00 PM` are not misread as `10:00` (AM).
 */
export function parseScheduleHm(t: string): Dayjs {
  const trimmed = t?.trim() ?? '';
  if (!trimmed) {
    return dayjs('2000-01-01T09:00:00');
  }
  const parsed = dayjs(trimmed, [...SCHEDULE_TIME_FORMATS], true);
  if (parsed.isValid()) {
    return dayjs('2000-01-01').hour(parsed.hour()).minute(parsed.minute()).second(0).millisecond(0);
  }
  const [hs, rest] = trimmed.split(':');
  const h = Number.parseInt(hs ?? '', 10);
  const m = Number.parseInt((rest ?? '0').replaceAll(/\D/g, '').slice(0, 2), 10);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return dayjs('2000-01-01T09:00:00');
  }
  return dayjs('2000-01-01').hour(h).minute(m).second(0).millisecond(0);
}

/** Normalizes any supported schedule time string to `HH:mm` for storage and display. */
export function normalizeScheduleTimeToHm(t: string): string {
  return parseScheduleHm(t).format('HH:mm');
}

function parseCalendarDate(dateStr: string): Dayjs {
  const trimmed = dateStr?.trim() ?? '';
  if (dayjs(trimmed, 'YYYY-MM-DD', true).isValid()) {
    return dayjs(trimmed, 'YYYY-MM-DD', true).startOf('day');
  }
  return dayjs().startOf('day');
}

/**
 * Start/end instants for one schedule row. If the end clock is not after the start on the same calendar day,
 * the end is taken as the next calendar day (overnight window).
 */
export function scheduleDayWindow(day: { date: string; startTime: string; endTime: string }): {
  windowStart: Dayjs;
  windowEnd: Dayjs;
} {
  const day0 = parseCalendarDate(day.date);
  const stClock = parseScheduleHm(day.startTime || '09:00');
  const etClock = parseScheduleHm(day.endTime || '18:00');
  const windowStart = day0.hour(stClock.hour()).minute(stClock.minute()).second(0).millisecond(0);
  let windowEnd = day0.hour(etClock.hour()).minute(etClock.minute()).second(0).millisecond(0);
  if (!windowEnd.isAfter(windowStart)) {
    windowEnd = windowEnd.add(1, 'day');
  }
  return { windowStart, windowEnd };
}

/** Counts consecutive slots inside one day window (recursive; depth bounded by `maxSlots`). */
function countSlotsWithinWindow(
  cursor: Dayjs,
  windowEnd: Dayjs,
  durationMins: number,
  countedSoFar: number,
  maxSlots: number
): number {
  if (countedSoFar >= maxSlots || !cursor.isBefore(windowEnd)) {
    return countedSoFar;
  }
  const slotEndByDuration = cursor.add(durationMins, 'minute');
  const end = slotEndByDuration.isAfter(windowEnd) ? windowEnd : slotEndByDuration;
  if (!end.isAfter(cursor)) {
    return countedSoFar;
  }
  const nextCount = countedSoFar + 1;
  if (nextCount >= maxSlots || end.isSame(windowEnd, 'minute')) {
    return nextCount;
  }
  return countSlotsWithinWindow(end, windowEnd, durationMins, nextCount, maxSlots);
}

/**
 * Slot count for **BatchPlanSummaryCard** only (dates + daily windows + slot duration).
 * Preview grid rows are returned by the API, not built here.
 */
export function estimateBatchSlotCount(values: BatchSlotEstimateFormSlice): number {
  const durationMins = Math.max(1, Math.floor(Number(values.durationMinutes)) || 30);
  const schedule =
    values.schedule?.length > 0
      ? values.schedule
      : [
        {
          date: values.startDate?.trim() || dayjs().format('YYYY-MM-DD'),
          startTime: values.sharedStartTime?.trim() || '09:00',
          endTime: values.sharedEndTime?.trim() || '18:00',
        },
      ];

  return schedule.reduce((total, day) => {
    if (total >= MAX_PLAN_SLOT_COUNT) {
      return total;
    }
    const { windowStart, windowEnd } = scheduleDayWindow(day);
    if (!windowEnd.isAfter(windowStart)) {
      return total;
    }
    const remaining = MAX_PLAN_SLOT_COUNT - total;
    const added = countSlotsWithinWindow(windowStart, windowEnd, durationMins, 0, remaining);
    return total + added;
  }, 0);
}

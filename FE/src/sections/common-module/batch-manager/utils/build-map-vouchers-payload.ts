import dayjs from 'dayjs';

import { parseScheduleHm } from './batch-preview-build-rows';

export type MapVouchersNotifyMode = 'now' | 'scheduled';

export function buildMapVouchersPayload(input: {
  mode: MapVouchersNotifyMode;
  date?: string | null;
  time?: string | null;
}): Record<string, never> | { notifyAt: string } {
  if (input.mode === 'now') {
    return {};
  }

  if (!input.date || !input.time) {
    throw new Error('Date and time are required for scheduled notification');
  }

  const datePart = dayjs(input.date);
  const timePart = parseScheduleHm(String(input.time));

  const combined = datePart
    .hour(timePart.hour())
    .minute(timePart.minute())
    .second(0)
    .millisecond(0);

  if (!combined.isValid()) {
    throw new Error('Invalid date or time');
  }

  return { notifyAt: combined.toISOString() };
}

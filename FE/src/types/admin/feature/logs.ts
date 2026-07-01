import type { Dayjs } from 'dayjs';

export type LogItems = {
  /** Row id from API — unique per log line (same empId can appear on multiple rows). */
  id?: number | string;
  name: string;
  empId: string;
  email: string;
  fileName: string;
  createdAt: string;
  status: string;
};

export type ILogsTableFilters = {
  name: string | null;
  startDate: null | Dayjs;
  endDate: null | Dayjs;
  status: string | null;
};

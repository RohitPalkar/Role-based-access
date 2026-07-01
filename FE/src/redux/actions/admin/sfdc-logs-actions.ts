import { createAsyncThunk } from '@reduxjs/toolkit';

import { getSFDCLogById, getSFDCLogsList } from 'src/services/admin-services/sdfc-logs-service';

export type FetchSFDCLogsListArgs = {
  page?: number;
  limit?: number;
  search?: string;
  /** Raw enum: `opp_updated` | `eoi_lead_push` | `site-visit_form` */
  logEvent?: string;
  /** Server sort, e.g. `columnId:asc` (matches table `orderBy` + `order`) */
  sortBy?: string;
};

function buildSfdcLogsQueryString(args: FetchSFDCLogsListArgs): string {
  const p = new URLSearchParams();
  if (args.page != null && args.page > 0) {
    p.set('page', String(args.page));
  }
  if (args.limit != null && args.limit > 0) {
    p.set('limit', String(args.limit));
  }
  const q = args.search?.trim();
  if (q) {
    p.set('search', q);
  }
  const logEvent = args.logEvent?.trim();
  if (logEvent) {
    p.set('logEvent', logEvent);
  }
  const sortBy = args.sortBy?.trim();
  if (sortBy) {
    p.set('sortBy', sortBy);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Prefer API `total`, then legacy `count`, then logs length. */
function totalFromBlock(block: Record<string, unknown>, logsLen: number): number {
  if (typeof block.total === 'number') {
    return block.total;
  }
  if (typeof block.count === 'number') {
    return block.count;
  }
  return logsLen;
}

/** Normalizes list API payloads to `{ logs, total }` for the slice. */
export function normalizeSfdcLogsListResponse(raw: unknown): { logs: unknown[]; total: number } {
  if (raw == null) {
    return { logs: [], total: 0 };
  }
  if (Array.isArray(raw)) {
    return { logs: raw, total: raw.length };
  }
  if (typeof raw !== 'object') {
    return { logs: [], total: 0 };
  }
  const r = raw as Record<string, unknown>;

  const inner = r.data ?? r.response;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const block = inner as Record<string, unknown>;
    const logsCandidate = block.logs ?? block.data;
    if (Array.isArray(logsCandidate)) {
      return { logs: logsCandidate, total: totalFromBlock(block, logsCandidate.length) };
    }
  }

  if (Array.isArray(r.logs)) {
    const logs = r.logs as unknown[];
    return { logs, total: totalFromBlock(r, logs.length) };
  }
  if (Array.isArray(r.data)) {
    const logs = r.data as unknown[];
    return { logs, total: totalFromBlock(r, logs.length) };
  }

  return { logs: [], total: 0 };
}

export const fetchSFDCLogsList = createAsyncThunk(
  'sfdc/fetchLogs',
  async (args: FetchSFDCLogsListArgs | undefined, { rejectWithValue }) => {
    try {
      const qs = buildSfdcLogsQueryString(args ?? {});
      const response = await getSFDCLogsList(qs || undefined);
      return normalizeSfdcLogsListResponse(response);
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

export const fetchSFDCLogById = createAsyncThunk(
  'sfdc/fetchLogById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await getSFDCLogById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

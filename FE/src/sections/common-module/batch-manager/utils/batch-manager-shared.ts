import type { BatchStatsData } from 'src/services/common-module/batch-manager-services';

import dayjs from 'dayjs';

import { RESIDENT_STATUS } from 'src/utils/constant';

import { inclusiveScheduleDayCount } from './batch-preview-record-coverage';
import { estimateBatchSlotCount, type BatchSlotEstimateFormSlice } from './batch-preview-build-rows';

// ----------------------------------------------------------------------

/** Canonical ID type keys used across breakdown tiles. */
export type BatchManagerIdTypeKey = 'Preferential' | 'Standard' | 'Voucher';

export const BATCH_MANAGER_ID_TYPE_ORDER: readonly BatchManagerIdTypeKey[] = [
  'Preferential',
  'Standard',
  'Voucher',
] as const;

/** Values stored in batch configuration `idTypes` (multi-select); labels match UI copy. */
export const BATCH_CONFIGURED_ID_TYPE_OPTIONS_ORDER = [
  'Preferential FP',
  'Preferential PP',
  'Standard FP',
  'Standard PP',
  'Voucher FP',
  'Voucher PP',
] as const;

export type BatchConfiguredIdTypeOption = (typeof BATCH_CONFIGURED_ID_TYPE_OPTIONS_ORDER)[number];

export const BATCH_ID_TYPE_ACCENT_HEX: Record<BatchManagerIdTypeKey, string> = {
  Preferential: '#2e7d32',
  Standard: '#ed6c02',
  /** Softer purple for corner wash (navy reads too heavy next to EOICards). */
  Voucher: '#7b1fa2',
};

type IdTypeUi = {
  /** Value stored in react-hook-form / API-shaped config. */
  value: BatchManagerIdTypeKey;
  /** Short label in the ID type multi-select. */
  formLabel: string;
  /** Title on the tinted breakdown tile (matches existing copy). */
  breakdownTitle: string;
};

/** Maps canonical ID type keys to `BatchIdBreakdownRow` property names. */
export const BATCH_MANAGER_ID_TYPE_TO_BREAKDOWN_FIELD: Record<
  BatchManagerIdTypeKey,
  'preferential' | 'standard' | 'voucher'
> = {
  Preferential: 'preferential',
  Standard: 'standard',
  Voucher: 'voucher',
};

export const BATCH_MANAGER_ID_TYPE_UI: Record<BatchManagerIdTypeKey, IdTypeUi> = {
  Preferential: {
    value: 'Preferential',
    formLabel: 'Preferential',
    breakdownTitle: 'Preferential',
  },
  Standard: {
    value: 'Standard',
    formLabel: 'Standard',
    breakdownTitle: 'Standard',
  },
  Voucher: {
    value: 'Voucher',
    formLabel: 'Voucher',
    breakdownTitle: 'Vouchers',
  },
};

/** Options for `ControlledAutocomplete` — FP/PP variants; order is batch processing order. */
export const BATCH_ID_TYPE_OPTIONS = BATCH_CONFIGURED_ID_TYPE_OPTIONS_ORDER.map((label) => ({
  label,
  value: label,
}));

export function isBatchConfiguredIdTypeOption(v: string): v is BatchConfiguredIdTypeOption {
  return (BATCH_CONFIGURED_ID_TYPE_OPTIONS_ORDER as readonly string[]).includes(v);
}

export function isBatchManagerIdTypeKey(v: string): v is BatchManagerIdTypeKey {
  return (BATCH_MANAGER_ID_TYPE_ORDER as readonly string[]).includes(v);
}

/** Configured ID type selections (FP/PP lines), preserving user order; empty → all six in default order. */
export function normalizeConfiguredBatchIdTypes(
  idTypes: unknown[] | undefined
): BatchConfiguredIdTypeOption[] {
  if (!idTypes?.length) {
    return [...BATCH_CONFIGURED_ID_TYPE_OPTIONS_ORDER];
  }
  return idTypes.map(String).filter((s): s is BatchConfiguredIdTypeOption => isBatchConfiguredIdTypeOption(s));
}

// ----------------------------------------------------------------------
// Record breakdown (NRI / RI / all).

/** One scope row: All Records, NRI, or RI — Preferential / Standard / Voucher with FP & PP. */
export type BatchIdBreakdownRow = {
  label: string;
  preferential: { fp: number; pp: number };
  standard: { fp: number; pp: number };
  voucher: { fp: number; pp: number };
  rowTotal: number;
};

/**
 * Sum of record counts from the residency-scoped breakdown row that match **only** the configured ID-type lines
 * (e.g. `Preferential FP` → Preferential fully-paid count). Matches the tiles the user selected in batch config,
 * not `rowTotal` (which is all FP+PP lines combined).
 */
export function requiredRecordsFromBreakdownForConfiguredIdTypes(
  breakdownRow: BatchIdBreakdownRow,
  idTypes: unknown[] | undefined
): number {
  return normalizeConfiguredBatchIdTypes(idTypes).reduce((sum, opt) => {
    let n = 0;
    switch (opt) {
      case 'Preferential FP':
        n = breakdownRow.preferential.fp;
        break;
      case 'Preferential PP':
        n = breakdownRow.preferential.pp;
        break;
      case 'Standard FP':
        n = breakdownRow.standard.fp;
        break;
      case 'Standard PP':
        n = breakdownRow.standard.pp;
        break;
      case 'Voucher FP':
        n = breakdownRow.voucher.fp;
        break;
      case 'Voucher PP':
        n = breakdownRow.voucher.pp;
        break;
      default:
        break;
    }
    return sum + Math.max(0, Math.floor(Number(n)) || 0);
  }, 0);
}

export type BatchManagerIdBreakdownModel = {
  /** Portfolio-wide counts (replaces a separate “grand total” strip). */
  allRecords: BatchIdBreakdownRow;
  /** Typically NRI and RI; each card shows its own total inline. */
  rows: BatchIdBreakdownRow[];
  typology: {
    name: string;
    count: string;
  }[];
};

/**
 * Maps API response from /eoi-management/batch-stats to BatchManagerIdBreakdownModel.
 * Centralizes the transformation logic so components don't need to handle API shape differences.
 * This is the single source of truth for API response mapping.
 */
export function mapBatchStatsResponseToModel(apiResponse: BatchStatsData | null): BatchManagerIdBreakdownModel {
  return {
    allRecords: {
      label: apiResponse?.allRecords?.label || 'All Records',
      preferential: {
        fp: apiResponse?.allRecords?.preferential?.fullyPaid || 0,
        pp: apiResponse?.allRecords?.preferential?.partiallyPaid || 0,
      },
      standard: {
        fp: apiResponse?.allRecords?.standard?.fullyPaid || 0,
        pp: apiResponse?.allRecords?.standard?.partiallyPaid || 0,
      },
      voucher: {
        fp: apiResponse?.allRecords?.voucher?.fullyPaid || 0,
        pp: apiResponse?.allRecords?.voucher?.partiallyPaid || 0,
      },
      rowTotal: apiResponse?.allRecords?.rowTotal || 0,
    },
    rows: (apiResponse?.rows || []).map((row: any): BatchIdBreakdownRow => ({
      label: row.label || '',
      preferential: {
        fp: row.preferential?.fullyPaid || 0,
        pp: row.preferential?.partiallyPaid || 0,
      },
      standard: {
        fp: row.standard?.fullyPaid || 0,
        pp: row.standard?.partiallyPaid || 0,
      },
      voucher: {
        fp: row.voucher?.fullyPaid || 0,
        pp: row.voucher?.partiallyPaid || 0,
      },
      rowTotal: row.rowTotal || 0,
    })),
    typology: apiResponse?.typology || [],
  };
}

export function idTypeTotalsFromBreakdownRow(row: BatchIdBreakdownRow): Record<BatchManagerIdTypeKey, number> {
  return BATCH_MANAGER_ID_TYPE_ORDER.reduce<Record<BatchManagerIdTypeKey, number>>((acc, k) => {
    const field = BATCH_MANAGER_ID_TYPE_TO_BREAKDOWN_FIELD[k];
    const cell = row[field];
    return { ...acc, [k]: Math.max(0, cell.fp + cell.pp) };
  }, { Preferential: 0, Standard: 0, Voucher: 0 });
}

/**
 * Picks the breakdown card row that matches the selected residency, otherwise **All Records**.
 */
export function selectBreakdownRowForResidency(
  model: BatchManagerIdBreakdownModel,
  residentStatus: string | number
): BatchIdBreakdownRow {
  const rs = String(residentStatus).trim();
  if (!rs) {
    return model.allRecords;
  }
  if (rs === RESIDENT_STATUS.Nri) {
    const nri = model.rows.find((r) => r.label.trim().toUpperCase() === 'NRI');
    return nri ?? model.allRecords;
  }
  if (rs === RESIDENT_STATUS.Indian) {
    const ri = model.rows.find((r) => {
      const l = r.label.trim().toUpperCase();
      return l === 'RI' || l === 'INDIAN';
    });
    return ri ?? model.allRecords;
  }
  return model.allRecords;
}

// ----------------------------------------------------------------------
// Plan Summary Calculation

export type BatchPlanSummaryData = {
  slotCount: number;
  scheduleTimeSlotCount: number;
  capacity: number;
  requiredTotal: number;
  dayCount: number | null;
};

/** Shared formatter for 12h schedule display. */
export function formatScheduleTimeForCopy(isoTime: string): string {
  const raw = isoTime?.trim() ?? '';
  const parts = raw.split(':');
  const h = Number.parseInt(parts[0] ?? '', 10);
  const m = Number.parseInt((parts[1] ?? '0').slice(0, 2), 10);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return raw;
  }
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return dayjs(`2000-01-01T${hh}:${mm}:00`).format('h:mm A');
}

/**
 * Calculates BatchPlanSummaryData from configuration values and the residency-scoped breakdown row.
 */
export function calculateBatchPlanSummary(
  values: BatchSlotEstimateFormSlice,
  breakdownScopeRow?: BatchIdBreakdownRow,
  unmappedCount?: number,
): BatchPlanSummaryData {
  const scheduleTimeSlotCount = estimateBatchSlotCount(values);
  const recordsPerSlot = Math.max(1, Math.floor(Number(values.recordsPerBatch)) || 1);
  const capacity = scheduleTimeSlotCount * recordsPerSlot;
  const requiredTotal = unmappedCount ?? (breakdownScopeRow
    ? requiredRecordsFromBreakdownForConfiguredIdTypes(breakdownScopeRow, values.idTypes)
    : 0);
  const batchesForSelectedIds =
    breakdownScopeRow && requiredTotal > 0
      ? Math.ceil(requiredTotal / recordsPerSlot)
      : null;
  const slotCount =
    batchesForSelectedIds === null
      ? scheduleTimeSlotCount
      : Math.min(scheduleTimeSlotCount, batchesForSelectedIds);
  const dayCount = inclusiveScheduleDayCount(
    values.startDate?.trim() ?? '',
    values.endDate?.trim() ?? ''
  );
  return { slotCount, scheduleTimeSlotCount, capacity, requiredTotal, dayCount };
}

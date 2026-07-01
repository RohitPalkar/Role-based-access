import { it, expect, describe } from 'vitest';

import { RESIDENT_STATUS } from 'src/utils/constant';

import {
  isBatchManagerIdTypeKey,
  formatScheduleTimeForCopy,
  calculateBatchPlanSummary,
  mapBatchStatsResponseToModel,
  idTypeTotalsFromBreakdownRow,
  isBatchConfiguredIdTypeOption,
  selectBreakdownRowForResidency,
  normalizeConfiguredBatchIdTypes,
  requiredRecordsFromBreakdownForConfiguredIdTypes,
} from './batch-manager-shared';

const DEMO_BATCH_MANAGER_ID_BREAKDOWN = {
  allRecords: {
    label: 'All Records',
    preferential: { fp: 300, pp: 100 },
    standard: { fp: 200, pp: 80 },
    voucher: { fp: 600, pp: 100 },
    rowTotal: 1380,
  },
  rows: [
    {
      label: 'NRI',
      preferential: { fp: 200, pp: 20 },
      standard: { fp: 150, pp: 50 },
      voucher: { fp: 250, pp: 50 },
      rowTotal: 720,
    },
    {
      label: 'RI',
      preferential: { fp: 100, pp: 80 },
      standard: { fp: 50, pp: 30 },
      voucher: { fp: 350, pp: 50 },
      rowTotal: 660,
    },
  ],
  typology: [
    {
      name: "1 BHK",
      count: '2'
    },
    {
      name: "2 BHK",
      count: '3'
    }
  ]
};

describe('batch-manager-shared', () => {
  it('selectBreakdownRowForResidency returns NRI row for NRI status', () => {
    const row = selectBreakdownRowForResidency(DEMO_BATCH_MANAGER_ID_BREAKDOWN, RESIDENT_STATUS.Nri);
    expect(row.label).toBe('NRI');
    expect(row.preferential.fp + row.preferential.pp).toBe(220);
  });

  it('selectBreakdownRowForResidency returns RI row for Indian status', () => {
    const row = selectBreakdownRowForResidency(DEMO_BATCH_MANAGER_ID_BREAKDOWN, RESIDENT_STATUS.Indian);
    expect(row.label).toBe('RI');
  });

  it('normalizeConfiguredBatchIdTypes preserves order and drops unknown values', () => {
    expect(
      normalizeConfiguredBatchIdTypes(['Voucher PP', 'Unknown', 'Preferential FP', 'garbage'])
    ).toEqual(['Voucher PP', 'Preferential FP']);
  });

  it('requiredRecordsFromBreakdownForConfiguredIdTypes sums only selected lines (e.g. Preferential FP = 200 on NRI)', () => {
    const nri = selectBreakdownRowForResidency(DEMO_BATCH_MANAGER_ID_BREAKDOWN, RESIDENT_STATUS.Nri);
    expect(nri.rowTotal).toBe(720);
    expect(requiredRecordsFromBreakdownForConfiguredIdTypes(nri, ['Preferential FP'])).toBe(200);
    expect(requiredRecordsFromBreakdownForConfiguredIdTypes(nri, ['Preferential FP', 'Preferential PP'])).toBe(220);
  });

  it('requiredRecordsFromBreakdownForConfiguredIdTypes matches rowTotal when all six lines are configured', () => {
    const nri = selectBreakdownRowForResidency(DEMO_BATCH_MANAGER_ID_BREAKDOWN, RESIDENT_STATUS.Nri);
    expect(requiredRecordsFromBreakdownForConfiguredIdTypes(nri, undefined)).toBe(720);
  });

  it('mapBatchStatsResponseToModel handles null and provides defaults', () => {
    const model = mapBatchStatsResponseToModel(null);
    expect(model.allRecords.label).toBe('All Records');
    expect(model.rows).toEqual([]);
  });

  it('mapBatchStatsResponseToModel maps full API response correctly', () => {
    const apiData = {
      allRecords: {
        label: 'Overall',
        preferential: { fullyPaid: 10, partiallyPaid: 5 },
        standard: { fullyPaid: 20, partiallyPaid: 10 },
        voucher: { fullyPaid: 30, partiallyPaid: 15 },
        rowTotal: 90,
      },
      rows: [
        {
          label: 'Test Row',
          preferential: { fullyPaid: 5, partiallyPaid: 0 },
          rowTotal: 5,
        },
      ],
    };
    const model = mapBatchStatsResponseToModel(apiData as any);
    expect(model.allRecords.label).toBe('Overall');
    expect(model.allRecords.preferential.fp).toBe(10);
    expect(model.rows[0].label).toBe('Test Row');
  });

  it('idTypeTotalsFromBreakdownRow sums FP and PP for each category', () => {
    const row = DEMO_BATCH_MANAGER_ID_BREAKDOWN.rows[0]; // NRI: 200+20, 150+50, 250+50
    const totals = idTypeTotalsFromBreakdownRow(row);
    expect(totals.Preferential).toBe(220);
    expect(totals.Standard).toBe(200);
    expect(totals.Voucher).toBe(300);
  });

  it('formatScheduleTimeForCopy formats ISO times to 12h AM/PM', () => {
    expect(formatScheduleTimeForCopy('14:30:00')).toBe('2:30 PM');
    expect(formatScheduleTimeForCopy('09:05')).toBe('9:05 AM');
    expect(formatScheduleTimeForCopy('invalid')).toBe('invalid');
    expect(formatScheduleTimeForCopy('')).toBe('');
  });

  it('isBatchConfiguredIdTypeOption and isBatchManagerIdTypeKey narrow valid values', () => {
    expect(isBatchConfiguredIdTypeOption('Voucher FP')).toBe(true);
    expect(isBatchConfiguredIdTypeOption('invalid')).toBe(false);
    expect(isBatchManagerIdTypeKey('Voucher')).toBe(true);
    expect(isBatchManagerIdTypeKey('Other')).toBe(false);
  });

  it('normalizeConfiguredBatchIdTypes returns all six options when input is empty', () => {
    expect(normalizeConfiguredBatchIdTypes([])).toHaveLength(6);
    expect(normalizeConfiguredBatchIdTypes(undefined)).toHaveLength(6);
  });

  it('selectBreakdownRowForResidency returns allRecords for empty residency', () => {
    const row = selectBreakdownRowForResidency(DEMO_BATCH_MANAGER_ID_BREAKDOWN, '');
    expect(row.label).toBe('All Records');
  });

  it('selectBreakdownRowForResidency returns allRecords for unknown residency', () => {
    const row = selectBreakdownRowForResidency(DEMO_BATCH_MANAGER_ID_BREAKDOWN, 'UNKNOWN');
    expect(row.label).toBe('All Records');
  });

  it('calculateBatchPlanSummary uses unmappedCount when provided', () => {
    const values = {
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      sharedStartTime: '09:00',
      sharedEndTime: '10:00',
      schedule: [{ date: '2026-01-01', startTime: '09:00', endTime: '10:00' }],
      recordsPerBatch: '25',
      durationMinutes: '60',
      idTypes: ['Preferential FP'],
    };
    const summary = calculateBatchPlanSummary(values, undefined, 88);
    expect(summary.requiredTotal).toBe(88);
  });

  it('calculateBatchPlanSummary computes capacity and requirements', () => {
    const values = {
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      sharedStartTime: '09:00',
      sharedEndTime: '10:00',
      schedule: [{ date: '2026-01-01', startTime: '09:00', endTime: '10:00' }],
      recordsPerBatch: '50',
      durationMinutes: '60',
      idTypes: ['Preferential FP'],
    };
    const row = DEMO_BATCH_MANAGER_ID_BREAKDOWN.rows[0]; // NRI, Preferential FP = 200
    const summary = calculateBatchPlanSummary(values as any, row);

    expect(summary.scheduleTimeSlotCount).toBe(1);
    expect(summary.capacity).toBe(50);
    expect(summary.requiredTotal).toBe(200);
    expect(summary.slotCount).toBe(1); // capped by scheduleTimeSlotCount
    expect(summary.dayCount).toBe(1);
  });
});

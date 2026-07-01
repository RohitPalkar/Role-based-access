import { it, expect, describe } from 'vitest';

import {
  BATCH_PLAN_STATUS,
  type BatchPlanStatus,
  BATCH_PLAN_STATUS_COLOR,
} from './batch-manager-constants';

describe('batch-manager-constants', () => {
  it('defines plan status labels used in summary UI', () => {
    expect(BATCH_PLAN_STATUS.DEFICIT).toBe('Deficit in no. of Batches');
    expect(BATCH_PLAN_STATUS.SUFFICIENT).toBe('Sufficient');
    expect(BATCH_PLAN_STATUS.EXTRA).toBe('Extra Batches');
  });

  it('maps every BatchPlanStatus to a display color', () => {
    const statuses = Object.values(BATCH_PLAN_STATUS) as BatchPlanStatus[];
    statuses.forEach((status) => {
      expect(BATCH_PLAN_STATUS_COLOR[status]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

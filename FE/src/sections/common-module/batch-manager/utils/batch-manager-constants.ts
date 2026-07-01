export const BATCH_PLAN_STATUS = {
  DEFICIT: 'Deficit in no. of Batches',
  SUFFICIENT: 'Sufficient',
  EXTRA: 'Extra Batches',
} as const;

export type BatchPlanStatus = (typeof BATCH_PLAN_STATUS)[keyof typeof BATCH_PLAN_STATUS];

export const BATCH_PLAN_STATUS_COLOR: Record<BatchPlanStatus, string> = {
  [BATCH_PLAN_STATUS.DEFICIT]: '#FF4842',
  [BATCH_PLAN_STATUS.SUFFICIENT]: '#22C55E',
  [BATCH_PLAN_STATUS.EXTRA]: '#3363FF',
};

export enum BookingStatusEnum {
  REGULARISED = 'regularized',
  UNREGURLAISED = 'unregularized',
  QUALIFIED = 'qualified',
  DISQUALIFIED = 'disqualified',
}

export enum IneligibilityReasonEnum {
  CANCELLED_POST_PAID = 'Cancelled post disbursement of incentive',
  CANCELLED_BEFORE_PAID = 'Cancelled post qualification, hence eligible',
  AGREEMENT_NOT_SIGNED = 'Agreement not signed within {DAYS} days',
  REG_DEADLINE_CROSSED = 'Reg. amount not collected within {DAYS} days',
  AMOUNT_NOT_ENOUGH = 'Regularization amount not received',
  LAUNCH_SLAB_MISSING = 'Launch slabs are missing',
  LAUNCH_TARGET_MISSED = 'Launch target slab not met',
  SUSTENANCE_SLAB_MISSING = 'Sustenance slab are missing',
  SUSTENANCE_TARGET_MISSED = 'Sustenance target slab not met',
  CANCELLATION_IMPACTED = 'Impacted due to cancellation of',
  DELTA_CALCULATED = 'Due to cancellation / Regularization of',
  POLICY_NOT_APPLIED = 'Incentive Policy Missing',
  BOOKING_TARGET_MISSED = 'Minimum booking criteria not met.',
  INVALID_RM_CONFIGURATION = 'Invalid RM configuration for incentive split',
}

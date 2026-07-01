export enum UnitStatusEnum {
  REGULARIZED = 'Regularized',
  UNREGULARIZED = 'Unregularized',
  QUALIFIED = 'Qualified',
  DISQUALIFIED = 'Disqualified',
  CANCELLED = 'Cancelled',
  QUALIFIED_CANCELLED = 'Qualified Cancelled',
  USER_PROJECT_POLICY_NOT_FOUND = 'User Or Project Or Policy Not Found',
}

export enum ReraStatusEnum {
  OC = 'OC',
  NO = 'NO',
}

export enum PaymentStatusEnum {
  INELIGIBLE = 'Ineligible',
  PAID = 'Paid',
  PAYABLE = 'Payable',
  HOLD = 'Hold',
}

export enum RegularizedStatusEnum {
  YES = 'Yes',
  NO = 'No',
}

export enum PayableStatusEnum {
  YES = 'Yes',
  NO = 'No',
}

export enum BookingStatusEnum {
  ACTIVE = 'Active',
  CANCELLED = 'Cancelled',
}

export enum SalesTypeEnum {
  CREDIT_SALE_MGT_APPROVED = 'Credit Sale-Mgt Approved',
}

export enum IncentiveTypeEnum {
  ALL = 'all',
  REGULARIZED = 'regularized',
  CANCELLED = 'cancelled',
  MANAGEMENT_SALE = 'management sale',
  UNREGULARIZED = 'unregularized',
  QUALIFIED = 'qualified',
  MGMT_APPROVED_CREDIT_SALE = 'management approved credit sale',
}

export enum IncentiveFilterEnum {
  RISK = 'risk',
  PAID_YTD = 'paid_ytd',
  PAYABLE = 'payable',
  PAID = 'paid',
}

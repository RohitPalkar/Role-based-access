export enum VoucherFormStatusEnum {
  CREATED = '1-Form Link Shared',
  IN_PROGRESS = '2-Form fill in progress',
  UNVERIFIED = '3-Form Submitted',
  MIS_VERIFIED = '4-MIS Verified',
  MIS_REQUESTED_CHANGES = '5-MIS-Resubmission requested',
  MIS_UPDATED = '6-Updated as per MIS',
  CRM_VERIFIED = '7-CRM Verified',
  CRM_REQUESTED_CHANGES = '8-CRM-Resubmission requested',
  CRM_UPDATED = '9-Updated as per CRM',
  ACTIVE = '10-Active',
  UPGRADING = '11-Upgrade in progress',
  UPGRADED = '12-Upgraded',
  CONVERTED = '13-Converted',
  CANCELLED_NOT_REALISED = '14-Cancelled – Not realised',
  CANCEL_REQUESTED = '15-Cancellation Requested by RM',
  CANCEL_ACCEPTED = '16-Cancellation Request Accepted',
  CANCEL_APPROVED = '17-Cancellation – In Progress by CRM',
  REFUND_INITIATED = '18-Refund Initiated',
  CANCELLED = '19-Cancellation – Complete & Refunded',
}

export enum VoucherFormType {
  VOUCHER = 'VOUCHER',
  EOI = 'EOI',
}

export enum EoiFormType {
  BASIC = 'Basic',
  KYC = 'KYC',
}

export enum VoucherPaymentStatus {
  PENDING = 'Pending',
  PARTIALLY_PAID = 'Partially Paid',
  PAID = 'Paid',
  REFUNDED = 'Refunded',
}

export enum VoucherLeadStatus {
  QUALIFIED = 'Qualified',
  NEW = 'New',
  CONVERTED = 'Converted',
}

export enum EOITypeEnum {
  PREFERENTIAL = 'Preferential',
  STANDARD = 'Standard',
  VOUCHER = 'Voucher',
}

export enum PreferenceType {
  PRE_FP = 'Preferential FP',
  PRE_PP = 'Preferential PP',
  STD_FP = 'Standard FP',
  STD_PP = 'Standard PP',
  VOUCHER_FP = 'Voucher FP',
  VOUCHER_PP = 'Voucher PP',
}

export enum VoucherPaymentType {
  CUSTOMER = 'Customer',
  REFUND = 'Refund',
}

export enum QueueTypeEnum {
  VQI = 'VQI',
  STD = 'STD',
  PRE = 'PRE',
}

export enum QueueCounterEnum {
  VQI_COUNTER = 'vqiCounter',
  STD_COUNTER = 'stdCounter',
  PRE_COUNTER = 'preCounter',
}

export enum QueueStatusEnum {
  ACTIVE = 'Active',
  WITHDRAWN = 'Withdrawn',
  CANCELLED = 'Cancelled',
}

export enum PrimarySourceEnum {
  CHANNEL_PARTNER = 'Channel Partner',
  PURVA_PRIVILEGE = 'Purva Privilege',
  PROVIDENT_PREMIER = 'Provident Premier',
  DIGITAL_MARKETING = 'Digital Marketing',
  PURVA_CHAMPION = 'Purva Champion',
  REFERRAL_AT_EOI = 'Referral at Voucher/EOI',
  CLOSING_TEAM_DRIVE = 'Closing Team Drive',
  DIRECT_WALKIN = 'Direct Walk-in',
  SITE_BRANDING = 'Site Branding',
  SELF_GENERATED = 'Self-generated',
  WORD_OF_MOUTH = 'Word of Mouth',
  EVENTS = 'Events',
  NEWS_PAPER = 'News paper',
  HOARDINGS = 'Hoardings',
  PRINT_MEDIA = 'Print Media',
  CORPORATE_ACTIVITY = 'Corporate Activity',
  BANKING = 'Banking',
  RADIO = 'Radio',
  CORPORATE_CITIZEN = 'Corporate Citizen',
  EMPLOYEE_SALES = 'Employee Sales',
}

export enum SecondarySourceEnum {
  LOYALTY = 'Loyalty',
  REFERRAL = 'Referral',
  REFERRAL_OTHERS = 'Referral Others',
}

export enum AccountTypeEnum {
  SAVINGS = 'Savings',
  CURRENT = 'Current',
}

export enum ChannelPartnerStatusEnum {
  SFDC_EMPANELLED = 'SFDC Empanelled',
  EMPANELMENT_PENDING = 'Empanelment Pending',
  NEW_REGISTRATION = 'New Registration',
}

export enum VoucherChronologyEnum {
  V = 'V', // Voucher form Phase
  V_C = 'V-C', // Voucher form phase to Cancelled
  V_E = 'V-E', // Voucher form phase to EOI phase
  E = 'E', // EOI phase
  E_C = 'E-C', // EOI phase to cancelled
  V_E_S = 'V-E-S', // Voucher form phase to EOI phase to Sale
  E_S = 'E-S', // EOI phase to Sale
  V_E_C = 'V-E-C',
}

export enum FacingDirectionsEnum {
  NORTH = 'North',
  EAST = 'East',
  SOUTH = 'South',
  WEST = 'West',
  NORTHEAST = 'Northeast',
  NORTHWEST = 'Northwest',
  SOUTHEAST = 'Southeast',
  SOUTHWEST = 'Southwest',
}

export enum CampaignStatusEnum {
  ACTIVE_VOUCHER = 'Active | Voucher',
  INACTIVE_VOUCHER = 'Inactive | Voucher',
  ACTIVE_EOI = 'Active | EOI',
  INACTIVE_EOI = 'Inactive | EOI',
  ACTIVE_VOUCHER_AND_EOI = 'Active | Voucher and EOI',
  INACTIVE_VOUCHER_AND_EOI = 'Inactive | Voucher and EOI',
  PROJECT_LAUNCHED = 'Project Launched',
  PROJECT_ON_HOLD = 'Project on Hold',
  CANCELLED_AND_REFUNDED = 'Cancelled & Refunded',
  ARCHIVED = 'Archived',
}

export enum ReasonActorEnum {
  CUSTOMER = 'Customer',
  RM = 'RM',
}

export enum CancellationActionEnum {
  APPROVE = 'Approve',
  REVOKE = 'Revoke',
  CANCEL = 'Cancel',
}

export enum DisplayQueueIdEnum {
  ONLINE = 'Immediately for Online Payments',
  ALL = 'Immediately for all',
  NONE = 'Masked for all',
}

export enum VoucherDeletionStatusEnum {
  DELETE = 'Deleted',
  RESTORE = 'Restored',
}

export enum SfdcLeadStatusEnum {
  SITE_VISIT_HAPPENED = 'Site Visit Happened',
  VIDEO_CALL_DONE = 'Video Call Done',
  SITE_VISIT_BOOKED = 'Site Visit Booked',
}

export enum SfdcEoiLeadApiStatus {
  LEAD_CREATED = 'lead_created',
  CONVERTED = 'converted',
  ERROR = 'error',
}

export enum EoiLeaderboardView {
  CHANNEL_PARTNER = 'channelPartner',
  RELATIONSHIP_MANAGER = 'relationshipManager',
}

export enum EoiLeaderboardSortBy {
  NO_OF_VOUCHERS = 'noOfVouchers',
  VOUCHER_VALUE = 'voucherValue',
  AMOUNT_COLLECTED = 'amountCollected',
}

export enum EoiCampaignStageType {
  LAUNCH = 'Launch',
  PRE_FILL = 'Pre-fill Booking Form',
}

export enum VoucherIdFieldNameEnum {
  PAID_VOUCHER_ID = 'paidVoucherId',
  STD_EOI_ID = 'stdEoiId',
  PRE_EOI_ID = 'preEoiId',
}

export enum UnitSourceType {
  SFDC = 'SFDC',
  DATABASE = 'Database',
}

export enum InventoryUnitStatusEnum {
  AVAILABLE = 'Available',
  BLOCKED_BY_MANAGEMENT = 'Blocked by Management',
  BLOCKED_BY_RM = 'Blocked by RM',
}
export enum VoucherAmountType {
  FIXED = 'Fixed',
  BHK_WISE = 'BHK Wise',
}

export enum VoucherChangeRequestStatus {
  REQUESTED = 'Requested',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum VoucherChangeEnum {
  SFDC = 'SFDC',
  PRID = 'PRID',
  NONE = 'NONE',
}

export enum DisplayUnitType {
  UNIT_NUMBER = 'Unit Number',
  TOWER_AND_SBA_SQFT = 'Tower and SBA Sq.Ft',
}

export enum BlockingStatus {
  BLOCKED = 'Blocked',
  PENDING = 'Pending Approval',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  EXPIRED = 'Approval Window Expired',
  RELEASED = 'Released',
  QUALIFIED = 'Qualified Post Request',
}

export enum MappingStatus {
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  EXPIRED = 'Approval Window Expired',
  REJECTED = 'Rejected',
}

export enum EmailActionsEnum {
  APPROVE = 'Approve',
  REJECT = 'Reject',
}

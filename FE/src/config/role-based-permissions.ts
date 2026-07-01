// Role-based permissions configuration
import type { IomTableRowItem } from 'src/sections/common-module/internal-office-memo/iom-config';

import {
  ROLES,
  IomStatus,
  EOIFormStatus,
  BOOKING_STATUS,
  EOIPaymentStatus,
  INVENTORY_TAB_OPTIONS,
  IOM_REJECTED_STATUSES,
} from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import {
  IOM_BASE_ACTIONS,
  IOM_BASE_FILTERS,
  IOM_LISTING_BASE_COLUMNS,
  IOM_MY_TEAM_BASE_ACTIONS,
  IOM_MY_TEAM_BASE_COLUMNS,
  IOM_MY_TEAM_BASE_FILTERS,
  INVOICE_LISTING_BASE_COLUMNS,
} from 'src/sections/common-module/internal-office-memo/iom-config';


// Agreement Management
const AGREEMENT_MANAGEMENT_BASE_COLUMNS = {
  projectName: { id: "projectName", label: "Project Name", width: 200, visible: true, disableToggle: true },
  unitNo: { id: "unitNo", label: "Unit Number", width: 130, visible: true },
  opportunityId: {
    id: "opportunityId",
    label: "Opportunity Id",
    width: 200,
    visible: false,
    disableToggle: false,
  },
  applicantName: { id: "applicantName", label: "Cx Name", width: 200, visible: true },
  numberOfApplicants: { id: "numberOfApplicants", label: "No. of Applicants", width: 150, visible: true },
  documentType: { id: "documentType", label: "Document Type", width: 250, visible: true, disableToggle: false },
  documentName: { id: "documentName", label: "Document Name", width: 250, visible: true, disableToggle: false },
  documentStatus: {
    id: "documentStatus",
    label: "Cx Sign Status",
    width: 200,
    visible: true,
    disableToggle: false,
  },
  sentDate: { id: "sentDate", label: "Doc Sent Date", width: 200, visible: true, disableToggle: false },
  signedAt: { id: "signedAt", label: "Cx Signed Date", width: 200, visible: true, disableToggle: false },
  internalSignatory: {
    id: "internalSignatory",
    label: "Authorised Signatory",
    width: 200,
    visible: true,
    disableToggle: false,
  },
  internalSignatorySignature: {
    id: "internalSignatorySignature",
    label: "CRM Sign Status",
    width: 250,
    visible: true,
    disableToggle: false,
  },
  rmName: { id: "rmName", label: "Created By", width: 150, visible: true, disableToggle: false },
  Action: { id: "Action", label: "Action", width: 100, visible: true, disableToggle: true },
};

const AGREEMENT_MANAGEMENT_BASE_FILTERS = [
  { id: "name", label: "Name", type: "text" as any },
  { id: "projectName", label: "Project Name", type: "select" as any },
  { id: "documentStatus", label: "Document Status", type: "select" as any },
  { id: "crmUser", label: "CRM User", type: "select" as any },
  { id: "internalSignatory", label: "Internal Signatory", type: "select" as any },
  { id: "documentType", label: "Document Type", type: "select" as any },
  { id: "startDate", label: "Start Date", type: "date" as any },
  { id: "enddate", label: "End Date", type: "date" as any },
];

const AGREEMENT_MANAGEMENT_ROLE_BASED_FILTERS = [
  { id: "name", label: "Name", type: "text" as any },
  { id: "projectName", label: "Project Name", type: "select" as any },
  { id: "documentStatus", label: "Cx Sign Status", type: "select" as any },
  { id: "documentType", label: "Document Type", type: "select" as any },
  { id: "startDate", label: "Start Date", type: "date" as any },
  { id: "enddate", label: "End Date", type: "date" as any },
]

const AGREEMENT_MANAGEMENT_ACTIONS = {
  signNow: { id: "signNow", label: "Sign Now" },
  edit: { id: "edit", label: "Edit" },
  download: { id: "download", label: "Signed PDF" },
  viewLink: { id: "viewLink", label: "View Link" },
};
export interface RoleColumn {
  id: string;
  label: string;
  width?: number;
  visible: boolean;
  disableToggle?: boolean;
  tooltip?: string;
  tab?: string;
  sortable?: boolean;
  /** Used by grouped table headers (e.g. brand / project RERA vs RTM). */
  group?: string;
}

export interface RoleFilter {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'boolean';
  required?: boolean;
}

export type RoleActionContext = {
  hasSignature?: boolean;
};

type IomRow = Pick<IomTableRowItem, 'statusLabel' | 'statusCode'>;

export interface RoleAction {
  id?: string;
  label?: string;
  icon?: string;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean | ((row: any, role?: any, context?: RoleActionContext) => boolean);
  condition?: (row: any) => boolean;
  visible?: (row: any) => boolean;
  /** EOI Records: when true, this action appears only on the Approve Unit tab (`getFilteredActions` + `eoiListTab`). */
  approveUnitTabOnly?: boolean;
}

/** EOI Records tab values (passed as `eoiListTab` into `getFilteredActions`). */
export type EoiRecordsListTab = 'all' | 'sourceView' | 'approveUnit' | 'cancellationsView';

/**
 * EOI Records (`module: 'eoi'`): which secondary tabs appear when `useTab` is true.
 * **All Records** (`all`) is always first; optional tabs follow in UI order:
 * Change Request → Approve Unit → Cancellations.
 */
export interface EoiRecordsTabVisibility {
  changeRequest?: boolean;
  cancellations?: boolean;
  approveUnit?: boolean;
}

export type EoiRecordsTabLabels = {
  allRecords: string;
  changeRequest: string;
  cancellations: string;
  approveUnit: string;
};

/**
 * Build EOI Records tab options from `ROLE_BASED_PERMISSIONS[role].eoi`.
 * When `useTab` is false, only **All Records** is returned (tab strip is hidden in the view).
 */
export function buildEoiRecordsTabOptions(
  modulePerms: ModulePermissions | undefined,
  labels: EoiRecordsTabLabels
): { value: EoiRecordsListTab; label: string }[] {
  const strip: { value: EoiRecordsListTab; label: string }[] = [
    { value: 'all', label: labels.allRecords },
  ];
  if (modulePerms?.useTab !== true) {
    return strip;
  }
  const tabs = modulePerms.eoiRecordsTabs;
  if (tabs?.changeRequest) {
    strip.push({ value: 'sourceView', label: labels.changeRequest });
  }
  if (tabs?.approveUnit) {
    strip.push({ value: 'approveUnit', label: labels.approveUnit });
  }
  if (tabs?.cancellations) {
    strip.push({ value: 'cancellationsView', label: labels.cancellations });
  }
  return strip;
}

/** Unit Inventory: which view tabs appear when `useTab` is true (`listView` / `towerView`). */
export interface UnitInventoryTabVisibility {
  listView?: boolean;
  towerView?: boolean;
}

/** IOM Management (`module: 'iomManagement'`): which tabs appear when `useTab` is true. */
export interface IomManagementTabVisibility {
  myTeam?: boolean;
}

export type IomManagementListTab = 'iom' | 'myTeam';

export type IomManagementTabLabels = {
  iom: string;
  myTeam: string;
};

/**
 * Build Unit Inventory tab strip from `ROLE_BASED_PERMISSIONS[role].unitInventory`.
 * Returns an empty array when `useTab` is false (parent hides the strip).
 * If `unitInventoryTabs` is omitted but `useTab` is true, all entries from `INVENTORY_TAB_OPTIONS` are used.
 */
export function buildUnitInventoryTabStripOptions(
  modulePerms: ModulePermissions | undefined
): { value: string; label: string }[] {
  if (modulePerms?.useTab !== true) {
    return [];
  }
  const vis = modulePerms.unitInventoryTabs;
  if (!vis) {
    return [...INVENTORY_TAB_OPTIONS];
  }
  return INVENTORY_TAB_OPTIONS.filter(
    (opt) =>
      (opt.value === 'listView' ? vis.listView !== false : true) &&
      (opt.value === 'towerView' ? vis.towerView !== false : true)
  );
}

/**
 * Build IOM Management tab strip from `ROLE_BASED_PERMISSIONS[role].iomManagement`.
 * When `useTab` is false, only **IOM** is returned (tab strip is hidden in the view).
 */
export function buildIomManagementTabOptions(
  modulePerms: ModulePermissions | undefined,
  labels: IomManagementTabLabels
): { value: IomManagementListTab; label: string }[] {
  const strip: { value: IomManagementListTab; label: string }[] = [
    { value: 'iom', label: labels.iom },
  ];
  if (modulePerms?.useTab !== true) {
    return strip;
  }
  if (modulePerms.iomManagementTabs?.myTeam) {
    strip.push({ value: 'myTeam', label: labels.myTeam });
  }
  return strip;
}

export interface ModulePermissions {
  columns?: RoleColumn[];
  filters?: RoleFilter[];
  actions?: RoleAction[];
  canCreate?: boolean;
  canExport?: boolean;
  /** Server refresh / SAP sync (e.g. reports users, bookings, user list). */
  canRefresh?: boolean;
  canViewAll?: boolean;
  useTab?: boolean;
  /** EOI Records: secondary tabs when `useTab` is true (see `EoiRecordsTabVisibility`). */
  eoiRecordsTabs?: EoiRecordsTabVisibility;
  /** Unit Inventory: List vs Tower tabs when `useTab` is true (see `UnitInventoryTabVisibility`). */
  unitInventoryTabs?: UnitInventoryTabVisibility;
  /** IOM Management: IOM vs My Team tabs when `useTab` is true (see `IomManagementTabVisibility`). */
  iomManagementTabs?: IomManagementTabVisibility;
  /** Row / detail edit (e.g. user list name link and edit actions). */
  canEdit?: boolean;
  canSelectRows?: boolean;
}

export interface RolePermissions {
  [moduleName: string]: ModulePermissions;
}

export interface RoleBasedConfig {
  [roleName: string]: RolePermissions;
}
// Common reusable pieces
const jsonValue = uiText.baseColumns.labels;
const BASE_COLUMNS = {
  uniqueReferenceId: {
    id: 'uniqueReferenceId',
    label: jsonValue.uniqueReferenceId,
    width: 200,
    visible: true,
    disableToggle: true,
    sortable: true,
    tab: 'both',
  },
  paidVoucherId: {
    id: 'paidVoucherId',
    label: jsonValue.paidVoucherId,
    width: 200,
    visible: true,
    disableToggle: true,
    sortable: true,
    tab: 'both',
  },
  customerName: {
    id: 'customerName',
    label: jsonValue.customerName,
    width: 200,
    visible: true,
    tab: 'both',
    sortable: false,
  },
  email: { id: 'email', label: jsonValue.email, width: 250, visible: false, tab: 'all' },
  mobile: { id: 'mobile', label: jsonValue.mobile, width: 150, visible: false, tab: 'all' },
  campaignName: {
    id: 'campaignName',
    label: jsonValue.campaignName,
    width: 200,
    visible: true,
    tab: 'both',
    sortable: false,
  },
  primarySource: {
    id: 'primarySource',
    label: jsonValue.primarySource,
    width: 180,
    visible: true,
    tab: 'both',
    sortable: false,
  },
  cpName: { id: 'cpName', label: jsonValue.cpName, width: 150, visible: false, tab: 'all', sortable: false },
  referrerName: {
    id: 'referrerName',
    label: jsonValue.referrerName,
    width: 200,
    visible: false,
    tab: 'all',
    sortable: false,
  },
  typologyPreference: {
    id: 'typologyPreference',
    label: jsonValue.typologyPreference,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  unitPreference: {
    id: 'unitPreference',
    label: jsonValue.unitPreference,
    width: 250,
    visible: true,
    tab: 'all',
  },
  customerQueueId: {
    id: 'queueId',
    label: jsonValue.queueId,
    width: 120,
    visible: false,
    sortable: true,
    tab: 'all',
  },
  sequenceId: {
    id: 'sequenceNo',
    label: jsonValue.sequenceNo,
    width: 150,
    visible: true,
    tab: 'all',
  },
  voucherCount: {
    id: 'voucherCount',
    label: jsonValue.voucherCount,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  leadStatus: {
    id: 'leadStatus',
    label: jsonValue.leadStatus,
    width: 120,
    visible: true,
    tab: 'all',
  },
  formStatus: {
    id: 'formStatus',
    label: jsonValue.formStatus,
    width: 270,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  paymentStatus: {
    id: 'paymentStatus',
    label: jsonValue.paymentStatus,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  financeStatus: {
    id: 'financeStatus',
    label: jsonValue.financeStatus,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  sourcingRm: {
    id: 'sourcingRm',
    label: jsonValue.sourcingRm,
    width: 120,
    visible: true,
    tab: 'all',
  },
  closingRm: {
    id: 'closingRm',
    label: jsonValue.closingRm,
    width: 150,
    visible: true,
    tab: 'all',
  },
  amountPaid: {
    id: 'amountPaid',
    label: jsonValue.amountPaid,
    width: 130,
    visible: true,
    tooltip: uiText.baseColumns.tooltip.amountPaid,
    tab: 'all',
    sortable: false,
  },
  finalPaidDate: {
    id: 'finalPaidDate',
    label: jsonValue.finalPaidDate,
    width: 180,
    visible: true,
    tooltip: uiText.baseColumns.tooltip.finalPaidDate,
    tab: 'all',
  },
  chronology: {
    id: 'chronology',
    label: jsonValue.chronology,
    width: 180,
    visible: true,
    tab: 'all',
  },
  createdAt: {
    id: 'createdAt',
    label: jsonValue.createdAt,
    width: 180,
    visible: true,
    sortable: true,
    tab: 'all',
  },
  deletionReason: {
    id: 'deletionReason',
    label: jsonValue.deletionReason,
    width: 250,
    visible: false,
    tab: 'all',
  },
  restoreReason: {
    id: 'restoreReason',
    label: jsonValue.restoreReason,
    width: 250,
    visible: false,
    tab: 'all',
  },
  actions: {
    id: 'actions',
    label: jsonValue.actions,
    width: 120,
    visible: true,
    disableToggle: true,
    tab: 'both',
    sortable: false,
  },
  sfdcEnquiryId: {
    id: 'sfdcEnquiryId',
    label: jsonValue.sfdcEnquiryId,
    width: 160,
    visible: false,
    tab: 'both',
    sortable: false,
  },
  sfdcLeadStatus: {
    id: 'sfdcLeadStatus',
    label: jsonValue.sfdcLeadStatus,
    width: 200,
    visible: false,
    tab: 'all',
    sortable: false,
  },
  sourceChangeStatus: {
    id: 'status',
    label: jsonValue.sourceChangeStatus,
    width: 150,
    visible: true,
    tab: 'sourceView',
    sortable: true,
  },
  requestedDate: {
    id: 'requestedDate',
    label: jsonValue.requestedDate,
    width: 180,
    visible: true,
    tab: 'sourceView',
    sortable: false,
  },
  reviewDate: {
    id: 'reviewDate',
    label: jsonValue.reviewDate,
    width: 180,
    visible: true,
    tab: 'sourceView',
    sortable: false,
  },
  stdEoiId: {
    id: 'stdEoiId',
    label: jsonValue.stdEoiId,
    width: 200,
    sortable: true,
    visible: false,
    tab: 'both',
  },
  preEoiId: {
    id: 'preEoiId',
    label: jsonValue.preEoiId,
    width: 200,
    sortable: true,
    visible: false,
    tab: 'both',
  },
  prefillBookingForm: {
    id: 'bookingStatus',
    label: jsonValue.prefillBookingForm,
    width: 180,
    visible: false,
    tab: 'both',
  },
  preferredUnit: {
    id: 'preferredUnit',
    label: jsonValue.preferredUnit,
    width: 180,
    visible: false,
    tab: 'both',
  },
  opportunityId: {
    id: 'opportunityId',
    label: jsonValue.opportunityId,
    width: 200,
    visible: false,
    tab: 'both',
  },
  amountPayable: {
    id: 'amountPayable',
    label: jsonValue.amountPayable,
    width: 150,
    visible: true,
    tooltip: uiText.baseColumns.tooltip.amountPayable,
    tab: 'all',
    sortable: false,
  },
  checkerRemarks: {
    id: 'checkerRemarks',
    label: jsonValue.checkerRemarks,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  countryCode: {
    id: 'countryCode',
    label: jsonValue.countryCode,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  occupation: {
    id: 'occupation',
    label: jsonValue.occupation,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  industry: {
    id: 'industry',
    label: jsonValue.industry,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  companyName: {
    id: 'companyName',
    label: jsonValue.companyName,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  designation: {
    id: 'designation',
    label: jsonValue.designation,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  annualIncome: {
    id: 'annualIncome',
    label: jsonValue.annualIncome,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  companyAddress: {
    id: 'companyAddress',
    label: jsonValue.companyAddress,
    width: 220,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  dob: {
    id: 'dob',
    label: jsonValue.dob,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  residentStatus: {
    id: 'residentStatus',
    label: jsonValue.residentStatus,
    width: 180,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  cpType: {
    id: 'cpType',
    label: jsonValue.cpType,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  referrerProjectName: {
    id: 'projectName',
    label: jsonValue.referrerProjectName,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  referrerUnitNo: {
    id: 'unitNumber',
    label: jsonValue.referrerUnitNo,
    width: 180,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  typologyPrefEoi: {
    id: 'typologyPreferenceEoi',
    label: jsonValue.typologyPrefEoi,
    width: 220,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  customerAddress: {
    id: 'customerAddress',
    label: jsonValue.customerAddress,
    width: 300,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  pinCode: {
    id: 'pinCode',
    label: jsonValue.pinCode,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  typology: {
    id: 'typology',
    label: jsonValue.typology,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  approvalStatus: {
    id: 'approvalStatus',
    label: jsonValue.status,
    width: 180,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  remainingTime: {
    id: 'remainingTime',
    label: jsonValue.approvalTime,
    width: 180,
    visible: true,
    sortable: true,
  },
  batchName: {
    id: 'slotName',
    label: uiText.batchManager.previewTable.columnBatchNo,
    width: 140,
    visible: true,
    tab: 'all',   
    sortable: false
  },
  batchDate: {
    id: 'slotDate',
    label: jsonValue.batchDate,
    width: 200,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  startTime: {
    id: 'slotStartTime',
    label: uiText.common.formFields.startTime,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
  },
  attendance: {
    id: 'attendance',
    label: jsonValue.attendance,
    width: 150,
    visible: true,
    tab: 'all',
    sortable: false,
    disableToggle: true,
  },
};

export const POPUP_COLUMNS = [
  {
    id: 'uniqueReferenceId',
    label: jsonValue.uniqueReferenceId,
    width: 200,
    visible: true,
    disableToggle: true,
    sortable: true,
  },
  {
    id: 'paidVoucherId',
    label: jsonValue.paidVoucherId,
    width: 200,
    visible: true,
    disableToggle: true,
    sortable: true,
  },
  {
    id: 'customerName',
    label: jsonValue.customerName,
    width: 200,
    visible: true,
  },
  {
    id: 'formStatus',
    label: jsonValue.formStatus,
    width: 270,
    visible: true,
  },
  {
    id: 'paymentStatus',
    label: jsonValue.paymentStatus,
    width: 150,
    visible: true,
  },
  {
    id: 'financeStatus',
    label: jsonValue.financeStatus,
    width: 150,
    visible: true,
  },
  {
    id: 'createdAt',
    label: jsonValue.createdAt,
    width: 180,
    visible: true,
    sortable: true,
  },
  {
    id: 'sourcingRm',
    label: jsonValue.sourcingRm,
    width: 120,
    visible: true,
  },
  {
    id: 'closingRm',
    label: jsonValue.closingRm,
    width: 150,
    visible: true,
  },
  {
    id: 'amountPaid',
    label: jsonValue.amountPaid,
    width: 130,
    visible: true,
    tooltip: 'Total amount paid (Partially/fully).',
  },
  {
    id: 'finalPaidDate',
    label: jsonValue.finalPaidDate,
    width: 180,
    visible: true,
    tooltip: 'Timestamp of the complete EOI/Voucher amount paid.',
  },
];

// Cancellation listing columns - same labels as EOI record, layout like reference image
export const CANCELLATION_TABLE_COLUMNS: RoleColumn[] = [
  { ...BASE_COLUMNS.uniqueReferenceId, visible: true, width: 200 },
  { ...BASE_COLUMNS.customerName, visible: true },
  { ...BASE_COLUMNS.campaignName, visible: true },
  { ...BASE_COLUMNS.primarySource, visible: true },
  { ...BASE_COLUMNS.amountPaid, visible: true },
  { ...BASE_COLUMNS.sourcingRm, visible: true },
  { ...BASE_COLUMNS.closingRm, visible: true },
  { ...BASE_COLUMNS.finalPaidDate, visible: true },
  { ...BASE_COLUMNS.requestedDate, visible: true },
  { ...BASE_COLUMNS.formStatus, visible: true },
  { ...BASE_COLUMNS.actions, visible: true },
];

export const APPROVAL_UNIT_TABLE_COLUMNS: RoleColumn[] = [
  { ...BASE_COLUMNS.uniqueReferenceId, visible: true, width: 200 },
  { ...BASE_COLUMNS.customerName, visible: true },
  { ...BASE_COLUMNS.preferredUnit, visible: true },
  { ...BASE_COLUMNS.typology, visible: true },
  { ...BASE_COLUMNS.amountPayable, visible: true },
  { ...BASE_COLUMNS.amountPaid, visible: true },
  { ...BASE_COLUMNS.paymentStatus, visible: true },
  { ...BASE_COLUMNS.approvalStatus, visible: true },
  { ...BASE_COLUMNS.remainingTime, visible: true },
  { ...BASE_COLUMNS.cpName, visible: true },
  { ...BASE_COLUMNS.sourcingRm, visible: true },
  { ...BASE_COLUMNS.closingRm, visible: true },
  { ...BASE_COLUMNS.actions, visible: true },
];

const RECENT_HISTORY_BASE_COLUMNS = {
  requestedDate: {
    id: 'requestedDate',
    label: 'Requested Date',
    width: 200,
    visible: true,
    disableToggle: true,
  },
  actionDate: {
    id: 'actionDate',
    label: 'Action Date',
    width: 200,
    visible: true,
    disableToggle: true,
  },
  about: {
    id: 'about',
    label: 'About',
    width: 500,
    visible: true,
  },
  status: {
    id: 'status',
    label: 'Status',
    width: 120,
    visible: true,
  },
  expand: {
    id: 'expand',
    label: '',
    width: 80,
    visible: true,
    disableToggle: true,
  },
};
// EOI Records change source request history table columns
const CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS = {
  requestedDate: {
    id: 'requestedDate',
    label: 'Requested Date',
    width: 200,
    visible: true,
    disableToggle: true,
  },
  reviewedDate: {
    id: 'reviewedDate',
    label: 'Reviewed Date',
    width: 200,
    visible: true,
    disableToggle: true,
  },
  changeReason: {
    id: 'changeReason',
    label: 'Change Reason',
    width: 300,
    visible: true,
  },
  reviewerRemark: {
    id: 'reviewerRemark',
    label: 'Reviewers Remark',
    width: 300,
    visible: true,
  },
  status: {
    id: 'status',
    label: 'Status',
    width: 120,
    visible: true,
  },
  expand: {
    id: 'expand',
    label: '',
    width: 80,
    visible: true,
    disableToggle: true,
  },
};

// Common reusable filters
const FILTERS = {
  campaign: { id: 'campaignId', label: 'Campaign', type: 'select' as const },
  primarySource: { id: 'primarySource', label: 'Primary Source', type: 'select' as const },
  leadStatus: { id: 'leadStatus', label: 'Lead Status', type: 'select' as const },
  formStatus: { id: 'formStatus', label: 'Form Status', type: 'select' as const },
  paymentStatus: { id: 'paymentStatus', label: 'Payment Status', type: 'select' as const },
  financeStatus: { id: 'financeStatus', label: 'Finance Status', type: 'select' as const },
  deletionStatus: { id: 'deletionStatus', label: 'Archived Records', type: 'select' as const },
  rmUsers: { id: 'rmUsers', label: 'Relationship Manager', type: 'select' as const },
  queueIdAllotted: { id: 'queueIdAllotted', label: 'Queue ID Allotted', type: 'boolean' as const },
  cpName: { id: 'cpName', label: 'CP Name', type: 'select' as const },
  dateRange: {
    id: 'dateRange',
    label: uiText.common.dateRange,
    type: 'daterange' as const,
  },
  approvalStatus: {
    id: 'approvalStatus',
    label: 'Status',
    type: 'select' as const,
  },
};

// Preset groups of filters (can be reused across roles)
const BASE_FILTERS: RoleFilter[] = [
  FILTERS.campaign,
  FILTERS.primarySource,
  FILTERS.cpName,
  FILTERS.queueIdAllotted,
  // FILTERS.leadStatus,
  FILTERS.formStatus,
  FILTERS.paymentStatus,
  FILTERS.financeStatus,
];

// Finance-specific filters (subset of base)
const FINANCE_FILTERS: RoleFilter[] = [
  FILTERS.campaign,
  FILTERS.primarySource,
  FILTERS.cpName,
  FILTERS.formStatus,
  FILTERS.paymentStatus,
  FILTERS.financeStatus,
];
const ALLOWED_STATUSES = new Set([EOIFormStatus.CREATED, EOIFormStatus.IN_PROGRESS]);

const ACTIONS = {
  viewCustomer: {
    id: 'viewCustomer',
    label: uiText.actions.viewCustomer,
    // disabled: (row: any) => !ALLOWED_STATUSES.has(row.formStatus),
  },
  sendLink: { id: 'sendLink', label: uiText.actions.sendLink },
  changeSource: {
    id: 'changeSource',
    label: uiText.actions.changeSource,
    disabled: (row: any, role?: string) => {
      if (role !== ROLES.RM) return true;
      // Disable when status is 13+ and not RM
      return [
        EOIFormStatus.CANCELLED_NOT_REALISED,
        EOIFormStatus.CANCEL_REQUESTED,
        EOIFormStatus.CANCEL_ACCEPTED,
        EOIFormStatus.CANCEL_APPROVED,
        EOIFormStatus.REFUND_INITIATED,
        EOIFormStatus.CANCELLED,
      ].includes(row?.formStatus);
    },
  }, // make changes here
  editEOI: { id: 'editEOI', label: uiText.actions.editEOI },
  assignClosingRM: { id: 'assignClosingRM', label: uiText.actions.asignClosingRM },
  cancelEOI: {
    id: 'cancelEOI',
    label: uiText.actions.cancelEOI,
    color: 'error',
    disabled: (row: any) => ALLOWED_STATUSES.has(row.formStatus),
  },
  exportRecords: {
    id: 'exportRecords',
    label: uiText.actions.exportRecords,
    disabled: (row: any) => !row || row.formStatus === 'Cancelled' || !row.closingRm,
  },
  view: {
    id: 'view',
    label: uiText.actions.view,
  },
  edit: {
    id: 'edit',
    label: uiText.actions.edit,
    disabled: (row: any) => row.formStatus !== EOIFormStatus.REFUND_INITIATED,
  },

  verify: {
    id: 'verify',
    label: uiText.actions.verify,
    disabled: (row: any, role?: string) => {
      if (role === ROLES.MIS) {
        return ![
          EOIFormStatus.UNVERIFIED,
          EOIFormStatus.MIS_UPDATED,
          EOIFormStatus.MIS_REQUESTED_CHANGES,
        ].includes(row.formStatus);
      }
      if (role === ROLES.CRM) {
        return ![
          EOIFormStatus.MIS_VERIFIED,
          EOIFormStatus.CRM_UPDATED,
          EOIFormStatus.CRM_REQUESTED_CHANGES,
        ].includes(row.formStatus);
      }
      return true;
    },
  },

  requestCancellation: {
    id: 'requestCancellation',
    label: uiText.actions.requestCancellation,
    condition: (row: any) => {
      const allowedPaymentStatuses = [EOIPaymentStatus.PAID, EOIPaymentStatus.PARTIALLY_PAID];
      const allowedFormStatuses = [
        EOIFormStatus.CREATED,
        EOIFormStatus.IN_PROGRESS,
        EOIFormStatus.UNVERIFIED,
        EOIFormStatus.MIS_VERIFIED,
        EOIFormStatus.MIS_REQUESTED_CHANGES,
        EOIFormStatus.MIS_UPDATED,
        EOIFormStatus.CRM_VERIFIED,
        EOIFormStatus.CRM_REQUESTED_CHANGES,
        EOIFormStatus.CRM_UPDATED,
        EOIFormStatus.ACTIVE,
        EOIFormStatus.UPGRADING,
        EOIFormStatus.UPGRADED,
        EOIFormStatus.CONVERTED,
      ];
      const hasValidPaymentStatus = allowedPaymentStatuses.includes(row?.paymentStatus);
      const hasValidFormStatus = allowedFormStatuses.includes(row?.formStatus);
      return hasValidPaymentStatus && hasValidFormStatus;
    },
  },
  requestChanges: {
    id: 'requestChanges',
    label: uiText.actions.ChangesRequest,
    disabled: (row: any, role?: string) => {
      if (role === ROLES.MIS) {
        return ![
          EOIFormStatus.MIS_REQUESTED_CHANGES,
          EOIFormStatus.UNVERIFIED,
          EOIFormStatus.MIS_UPDATED,
        ].includes(row.formStatus);
      }
      if (role === ROLES.CRM) {
        return ![
          EOIFormStatus.CRM_REQUESTED_CHANGES,
          EOIFormStatus.MIS_VERIFIED,
          EOIFormStatus.CRM_UPDATED,
        ].includes(row.formStatus);
      }
      return true;
    },
  },

  approveCancellation: {
    id: 'approveCancellation',
    label: uiText.actions.approveCancellation,
    disabled: (row: any, role?: string) => {
      const status = row?.formStatus;

      // Map formStatus -> allowed roles
      const statusRoleMap: Record<string, any[]> = {
        [EOIFormStatus.CANCEL_REQUESTED]: [ROLES.Admin, ROLES.SuperAdmin, ROLES.SALES_RSH]
      };

      const allowedRoles = statusRoleMap[status] || [];
      const isAllowed = allowedRoles.includes(role || '');

      // Disable if role not allowed or status not in map
      return !isAllowed;
    },
  },

  EOI_converted: {
    id: 'EOI_converted',
    label: uiText.actions.EOI_converted,
    disabled: (row: any) =>
      ![EOIFormStatus.CRM_VERIFIED, EOIFormStatus.ACTIVE, EOIFormStatus.UPGRADED].includes(
        row?.formStatus
      ),
  },

  previewForm: {
    id: 'previewForm',
    label: uiText.actions.previewForm,
    disabled: (row: any) => ALLOWED_STATUSES.has(row.formStatus),
  },
  deleteEoi: {
    id: 'deleteEoi',
    label: uiText.actions.deleteEoi,
    disabled: (row: any) => row?.isDeleted === true,
  },
  restoreEoi: {
    id: 'restoreEoi',
    label: uiText.actions.restoreEoi,
    disabled: (row: any) => row?.isDeleted === false || row?.isDeleted === undefined,
  },
  mapAndConvertEOI: {
    id: 'mapAndConvertEOI',
    label: uiText.actions.mapAndConvertEOI,
    visible: (row: any) => Boolean(row?.opportunityId) || Boolean(row?.preferredUnit),
  },
  exportBookingForm: {
    id: 'exportBookingForm',
    label: uiText.actions.exportBookingForm,
    visible: (row: any) => row?.bookingStatus === BOOKING_STATUS.PRE_FILLED,
  },

  crmCancellationAction: {
    id: 'crmCancellationAction',
    label: uiText.actions.crmCancellationAction,
    condition: (row: any) =>
      [EOIFormStatus.CANCEL_ACCEPTED, EOIFormStatus.CANCEL_APPROVED].includes(row?.formStatus),
  },
  manageSfdcOpportunity: {
    id: 'manageSfdcOpportunity',
    label: uiText.actions.manageSfdcOpportunity,
  },
  /** EOI Records (row-level): same API as EOI Manager campaign push, with voucherId in payload */
  createLeadsOnSFDC: {
    id: 'createLeadsOnSFDC',
    label: uiText.campaignListing.actionsLabel.createLeadOnSFDC,
  },
  convertLeadsOnSFDC: {
    id: 'convertLeadsOnSFDC',
    label: uiText.campaignListing.actionsLabel.convertLeadOnSDFC,
  },
  approveUnit: {
    id: 'approveUnit',
    label: uiText.actions.approveUnit,
  },
  preBookingDetails: {
    id: 'preBookingDetails',
    label: uiText.actions.preBookingDetails,
    disabled: (row: any) => row?.isUnitMapped === false || !row?.opportunityId,
  },
};

const ADMIN_ACTIONS: RoleAction[] = [
  ACTIONS.viewCustomer,
  ACTIONS.previewForm,
  ACTIONS.approveCancellation,
  // ACTIONS.mapAndConvertEOI,
  ACTIONS.exportBookingForm,
  ACTIONS.manageSfdcOpportunity,
  ACTIONS.deleteEoi,
  ACTIONS.restoreEoi,
  ACTIONS.createLeadsOnSFDC,
  ACTIONS.convertLeadsOnSFDC,
];

/** Admin EOI row actions; Approve Unit uses the same list with `approveUnitTabOnly` on that action. */
const ADMIN_EOI_ACTIONS: RoleAction[] = [
  ...ADMIN_ACTIONS,
  { ...ACTIONS.approveUnit, approveUnitTabOnly: true },
];
const RM_ACTIONS: RoleAction[] = [
  ACTIONS.viewCustomer,
  ACTIONS.previewForm,
  ACTIONS.editEOI,
  { ...ACTIONS.assignClosingRM, visible: (row: any) => !row?.hasBuddyRMPermission},
  ACTIONS.mapAndConvertEOI,
  ACTIONS.exportBookingForm,
  { ...ACTIONS.requestCancellation, visible: (row: any) => !row?.hasBuddyRMPermission},
  { ...ACTIONS.changeSource, visible: (row: any) => !row?.hasBuddyRMPermission},
  ACTIONS.manageSfdcOpportunity,
  { ...ACTIONS.createLeadsOnSFDC, visible: (row: any) => !row?.hasBuddyRMPermission},
  ACTIONS.convertLeadsOnSFDC,
  // ACTIONS.preBookingDetails,
];
const FINANCE_ACTIONS: RoleAction[] = [ACTIONS.view, ACTIONS.edit, ACTIONS.previewForm];
const MIS_ACTIONS: RoleAction[] = [
  ACTIONS.previewForm,
  ACTIONS.assignClosingRM,
  ACTIONS.verify,
  ACTIONS.requestChanges,
  ACTIONS.manageSfdcOpportunity,
];
const SALES_ACTIONS: RoleAction[] = [ACTIONS.viewCustomer];
const CRM_ACTIONS: RoleAction[] = [ACTIONS.view, ACTIONS.previewForm, ACTIONS.exportBookingForm, ACTIONS.verify, ACTIONS.requestChanges, ACTIONS.crmCancellationAction];
const PROJECT_HEAD: RoleAction[] = [
  ACTIONS.viewCustomer,
  ACTIONS.previewForm,
  ACTIONS.sendLink,
  // ACTIONS.cancelEOI,
  ACTIONS.createLeadsOnSFDC,
  ACTIONS.convertLeadsOnSFDC,
  // ACTIONS.preBookingDetails,
];
const SALES_RSH_ACTIONS: RoleAction[] = [
  ACTIONS.viewCustomer,
  ACTIONS.previewForm,
  ACTIONS.assignClosingRM,
  ACTIONS.approveCancellation,
  ACTIONS.manageSfdcOpportunity,
];
const SALES_TL_ACTIONS: RoleAction[] = [
  ACTIONS.viewCustomer,
  ACTIONS.previewForm,
  ACTIONS.assignClosingRM,
  ACTIONS.manageSfdcOpportunity,
  ACTIONS.createLeadsOnSFDC,
  ACTIONS.convertLeadsOnSFDC,
  // ACTIONS.preBookingDetails,
];
/** EOI Records: view list, preview form (read-only). Approve Unit is only for Admin / Sales BH on the Approve Unit tab. */
const BIS_EOI_ACTIONS: RoleAction[] = [ACTIONS.view, ACTIONS.previewForm];
// EOI Dashboard Start
const eoiDashboardColumns = uiText.eoiDashboard.columns;
const eoiDashboardFilters = uiText.eoiDashboard.filters;
const eoiDashboardTooltips = uiText.eoiDashboard.tooltip;

const EOI_DASHBOARD_BASE_COLUMNS = {
  campaign: {
    id: 'campaign',
    label: eoiDashboardColumns?.campaign,
    width: 250,
    visible: true,
    sortable: false,
    disableToggle: true,
    tab: 'both',
  },
  collectedEoiCount: {
    id: 'collectedEoiCount',
    label: eoiDashboardColumns?.collectedEoiCount,
    width: 180,
    visible: true,
    sortable: true,
    disableToggle: false,
    tab: 'both',
  },
  paidEoiCollectedCounts: {
    id: 'paidEoiCollectedCounts',
    label: eoiDashboardColumns?.paidEoiCollectedCounts,
    width: 150,
    visible: true,
    sortable: true,
    disableToggle: false,
    tab: 'both',
  },
  partiallyPaidEoiCollectedCounts: {
    id: 'partiallyPaidEoiCollectedCounts',
    label: eoiDashboardColumns?.partiallyPaidEoiCollectedCounts,
    width: 170,
    visible: true,
    sortable: true,
    disableToggle: false,
    tab: 'both',
  },
  inProgressEoiCount: {
    id: 'inProgressEoiCount',
    label: eoiDashboardColumns?.inProgressEoiCount,
    width: 200,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'both',
  },
  totalEoiAmount: {
    id: 'totalEoiAmount',
    label: eoiDashboardColumns?.totalEoiAmount,
    width: 150,
    visible: true,
    sortable: true,
    disableToggle: false,
    tab: 'both',
    tooltip: eoiDashboardTooltips.totalEoiAmount,
  },
  totalEoiAmountCollected: {
    id: 'totalEoiAmountCollected',
    label: eoiDashboardColumns?.totalEoiAmountCollected,
    width: 220,
    visible: true,
    sortable: true,
    disableToggle: false,
    tab: 'both',
    tooltip: eoiDashboardTooltips.totalEoiAmountCollected,
  },
  allotedIdCount: {
    id: 'allotedIdCount',
    label: eoiDashboardColumns?.allotedIdCount,
    width: 160,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'default',
    tooltip: eoiDashboardTooltips.allotedIdCount,
  },
  activeEoiCount: {
    id: 'activeEoiCount',
    label: eoiDashboardColumns?.activeEoiCount,
    width: 160,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'default',
  },
  pendingMISCount: {
    id: 'pendingMISCount',
    label: eoiDashboardColumns?.pendingMISCount,
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'default',
    tooltip: eoiDashboardTooltips?.pendingMISCount,
  },
  pendingCRMCount: {
    id: 'pendingCRMCount',
    label: eoiDashboardColumns?.pendingCRMCount,
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'default',
    tooltip: eoiDashboardTooltips?.pendingCRMCount,
  },
  pendingFINCount: {
    id: 'pendingFINCount',
    label: eoiDashboardColumns?.pendingFINCount,
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'default',
    tooltip: eoiDashboardTooltips?.pendingFINCount,
  },
  pendingRMCount: {
    id: 'pendingRMCount',
    label: eoiDashboardColumns?.pendingRMCount,
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'default',
    tooltip: eoiDashboardTooltips?.pendingRMCount,
  },
  cancellationCount: {
    id: 'cancellationCount',
    label: eoiDashboardColumns?.cancellationCount,
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'default',
    tooltip: eoiDashboardTooltips?.cancellationCount,
  },
  channelPartner: {
    id: 'channelPartner',
    label: eoiDashboardColumns?.channelPartner,
    width: 300,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'source',
  },
  loyalty: {
    id: 'loyalty',
    label: eoiDashboardColumns?.loyalty,
    width: 300,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'source',
  },
  purvaChampion: {
    id: 'purvaChampion',
    label: eoiDashboardColumns?.purvaChampion,
    width: 300,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'source',
  },
  direct: {
    id: 'direct',
    label: eoiDashboardColumns?.direct,
    width: 300,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'source',
  },
  digital: {
    id: 'digital',
    label: eoiDashboardColumns?.digital,
    width: 300,
    visible: true,
    sortable: false,
    disableToggle: false,
    tab: 'source',
  },
};

const EOI_DASHBOARD_BASE_FILTERS = {
  viewBy: { id: 'viewBy', label: eoiDashboardFilters.viewBy, type: 'multiselect' as const },
  campaign: { id: 'campaign', label: eoiDashboardFilters.campaign, type: 'select' as const },
  unitType: { id: 'unitType', label: eoiDashboardFilters.unitType, type: 'select' as const },
  dateRange: {
    id: 'dateRange',
    label: eoiDashboardFilters.dateRange,
    type: 'daterange' as const,
  },
};

const CHANNEL_PARTNERS_BASE_FILTERS = {
  campaign: { id: 'campaign', label: eoiDashboardFilters.campaign, type: 'select' as const },
  cpType: { id: 'cpType', label: eoiDashboardFilters.cpType, type: 'select' as const },
  createdBy: {
    id: 'createdBy',
    label: uiText.channelPartners.columns.createdBy,
    type: 'multiselect' as const,
  },
  dateRange: {
    id: 'dateRange',
    label: uiText.common.dateRange,
    type: 'daterange' as const,
  },
};
// EOI Dashboard End

// EOI Manager Start

const EOI_MANAGER_BASE_COLUMNS = {
  campaignName: {
    id: 'campaignName',
    label: uiText.campaignListing.table.campaignName,
    width: 200,
    visible: true,
  },
  city: {
    id: 'city',
    label: uiText.campaignListing.table.city,
    width: 220,
    visible: true,
  },
  phaseLabel: {
    id: 'phaseLabel',
    label: uiText.campaignListing.table.phase,
    width: 110,
    visible: true,
    disableToggle: true,
  },
  countCollected: {
    id: 'countCollected',
    label: uiText.campaignListing.table.noofVouchers,
    width: 180,
    visible: true,
    disableToggle: true,
  },
  startDate: {
    id: 'startDate',
    label: uiText.campaignListing.table.startDate,
    width: 125,
    visible: true,
  },
  endDate: {
    id: 'endDate',
    label: uiText.campaignListing.table.endDate,
    width: 125,
    visible: true,
  },
  status: {
    id: 'status',
    label: uiText.campaignListing.table.status,
    width: 180,
    visible: true,
    disableToggle: true,
  },
  Action: {
    id: 'Action',
    label: uiText.campaignListing.table.actions,
    width: 100,
    visible: true,
    disableToggle: false,
  },
};

const EOI_MANAGER_BASE_FILTERS = {
  projectStatus: { id: 'projectStatus', label: 'Project Status', type: 'multiselect' as const },
  city: { id: 'city', label: 'City', type: 'multiselect' as const },
};

const EOI_MANAGER_BASE_ACTIONS = {
  edit: { id: 'edit', label: uiText.campaignListing.actionsLabel.edit },
  export: { id: 'export', label: uiText.campaignListing.actionsLabel.importExport },
  createLeadsOnSFDC: { id: 'createLeadsOnSFDC', label: uiText.campaignListing.actionsLabel.createLeadsOnSFDC },
  convertLeadsOnSFDC: { id: 'convertLeadsOnSFDC', label: uiText.campaignListing.actionsLabel.convertLeadsOnSFDC },
};

// EOI Manager End

// Channel Partners Start

const channelPartnersColumns = uiText.channelPartners.columns;
const channelPartnersActions = uiText.channelPartners.actions;
// channel partber base columns
const CHANNEL_PARTNERS_BASE_COLUMNS = {
  cpName: {
    id: 'cpName',
    label: channelPartnersColumns.cpName,
    width: 250,
    visible: true,
    disableToggle: true,
    sortable: false,
  },
  cpType: {
    id: 'cpType',
    label: channelPartnersColumns.cpType,
    width: 120,
    visible: true,
    disableToggle: true,
    sortable: false,
  },
  campaignName: {
    id: 'campaignName',
    label: channelPartnersColumns.campaignName,
    width: 200,
    visible: true,
    disableToggle: true,
    sortable: false,
  },
  noOfVouchers: {
    id: 'noOfVouchers',
    label: channelPartnersColumns.noOfVouchers,
    width: 200,
    visible: true,
    sortable: true,
  },
  voucherValue: {
    id: 'voucherValue',
    label: channelPartnersColumns.voucherValue,
    width: 150,
    visible: true,
    sortable: false,
  },
  amountCollected: {
    id: 'amountCollected',
    label: channelPartnersColumns.amountCollected,
    width: 200,
    visible: true,
    sortable: false,
  },
  lastCollectedDate: {
    id: 'lastCollectedDate',
    label: channelPartnersColumns.lastCollectedDate,
    width: 200,
    visible: true,
    sortable: false,
  },
  createdBy: {
    id: 'createdByName',
    label: channelPartnersColumns.createdBy,
    width: 200,
    visible: true,
    sortable: false,
  },
  createdDate: {
    id: 'createdAt',
    label: channelPartnersColumns.createdDate,
    width: 200,
    visible: true,
    sortable: false,
  },
  status: { id: 'status', label: channelPartnersColumns.status, width: 180, visible: true },
  actions: { id: 'actions', label: channelPartnersColumns.actions, width: 120, visible: true },
};

const CHANNEL_PARTNERS_BASE_ACTIONS = {
  copyLink: { id: 'copyLink', label: channelPartnersActions.copyLink },
};

const eoiLeaderboardFilters = uiText.eoiLeaderboard.filters
const EOI_LEADERBOARD_BASE_COLUMNS = {
  cpName: {
    id: 'cpName',
    label: channelPartnersColumns.cpName,
    width: 200,
    visible: true,
    disableToggle: true,
    tab: 'channelPartner',
  },
  cpType: {
    id: 'channelPartnerType',
    label: channelPartnersColumns.cpType,
    width: 150,
    visible: true,
    disableToggle: true,
    tab: 'channelPartner',
  },
  relationshipManager: {
    id: 'rmName',
    label: 'RM Name',
    width: 160,
    visible: true,
    disableToggle: true,
    tab: 'relationshipManager',
  },
  campaignName: {
    id: 'campaignName',
    label: channelPartnersColumns.campaignName,
    width: 190,
    visible: true,
    disableToggle: true,
    tab: 'both',
  },
  noOfVouchers: {
    id: 'noOfVouchers',
    label: channelPartnersColumns.noOfVouchers,
    width: 180,
    visible: true,
    tab: 'both',
  },
  voucherValue: {
    id: 'voucherValue',
    label: channelPartnersColumns.voucherValue,
    width: 150,
    visible: true,
    tab: 'both',
  },
  amountCollected: {
    id: 'amountCollected',
    label: channelPartnersColumns.amountCollected,
    width: 200,
    visible: true,
    tab: 'both',
  },
  sourcingRm: {
    id: 'createdByName',
    label: 'Sourcing RM',
    width: 200,
    visible: true,
    tab: 'channelPartner',
  },
  userGroup: {
    id: 'userGroup',
    label: 'User Group',
    width: 200,
    visible: true,
    tab: 'relationshipManager',
  },
  ffProgress: {
    id: 'formFillingInProgress',
    label: 'In Progress',
    width: 200,
    visible: true,
    tab: 'relationshipManager',
  },
  formLink: {
    id: 'formLinksShared',
    label: 'Form Links Shared',
    width: 200,
    visible: true,
    tab: 'relationshipManager',
  },
  cancellations: {
    id: 'cancellations',
    label: 'Cancelled',
    width: 200,
    visible: true,
    tab: 'both',
  },
  convertToBooking: {
    id: 'converted',
    label: 'Converted to Booking',
    width: 200,
    visible: false,
    tab: 'relationshipManager',
  },
  lastCollectedDate: {
    id: 'lastCollectedDate',
    label: channelPartnersColumns.lastCollectedDate,
    width: 200,
    visible: true,
    tab: 'both',
  },
};

const EOI_LEADERBOARD_BASE_FILTERS = {
  campaign: { id: 'campaign', label: eoiLeaderboardFilters.campaign, type: 'select' as const },
  cpName: { id: 'cpName', label: eoiLeaderboardFilters.cpName, type: 'select' as const },
  rmName: { id: 'rmName', label: eoiLeaderboardFilters.rmName, type: 'select' as const },
  userGroup: { id: 'userGroup', label: eoiLeaderboardFilters.userGroup, type: 'select' as const },
  dateRange: {
    id: 'dateRange',
    label: eoiLeaderboardFilters.dateRange,
    type: 'daterange' as const,
  },
};

type BatchManagerLocale = typeof uiText.batchManager & { previewTable: Record<string, string> };

const batchBaseColumns = uiText.batchManager.columns;

const BATCH_MANAGER_LIST_COLUMNS = {
  campaignName: {
    id: 'campaignName',
    label: batchBaseColumns.campaignName,
    width: 200,
    visible: true,
    sortable: false,
  },
  slotCount: {
    id: 'slotCount',
    label: batchBaseColumns.slotCount,
    width: 150,
    visible: true,
    sortable: false,
  },
  startDate: {
    id: 'startDate',
    label: batchBaseColumns.startDate,
    width: 180,
    visible: true,
    sortable: false,
  },
  endDate: {
    id: 'endDate',
    label: batchBaseColumns.endDate,
    width: 180,
    visible: true,
    sortable: false,
  },
  stage: {
    id: 'stage',
    label: batchBaseColumns.stage,
    width: 180,
    visible: true,
    sortable: false,
  },
  slotDuration: {
    id: 'slotDuration',
    label: batchBaseColumns.slotDuration,
    width: 150,
    visible: true,
    sortable: false,
  },
  capacityPerSlot: {
    id: 'capacityPerSlot',
    label: batchBaseColumns.recordsPerBatch,
    width: 150,
    visible: true,
    sortable: false,
  },
  batchName: {
    id: 'name',
    label: batchBaseColumns.batchName,
    width: 180,
    visible: true,
    sortable: false,
  },
  actions: {
    id: 'actions',
    label: batchBaseColumns.action,
    width: 150,
    visible: true,
    sortable: false,
    disableToggle: true,
  },
};

const BATCH_LIST_ACTIONS = {
  mapEois: { id: 'mapEois', label: uiText.batchManager.actions.mapEois },
  notifyCx: { id: 'notifyCx', label: uiText.batchManager.actions.notifyCx },
  editBatch: { id: 'editBatch', label: uiText.batchManager.actions.editBatch },
  deleteBatch: { id: 'deleteBatch', label: uiText.batchManager.actions.deleteBatch },
};

/** Batch Manager — preview grid toolbar + row edit (same `editBatch` id as batch listing). */
const batchPreviewCols = (uiText.batchManager as BatchManagerLocale).previewTable;

const BATCH_PREVIEW_LISTING_COLUMNS = {
  sequence: { id: 'sequence', label: batchPreviewCols.columnBatchNo, width: 140, visible: true },
  date: { id: 'date', label: batchPreviewCols.columnDate, width: 140, visible: true },
  startTime: { id: 'startTime', label: uiText.common.formFields.startTime, width: 200, visible: true },
  endTime: { id: 'endTime', label: uiText.common.formFields.endTime, width: 200, visible: true },
  capacity: { id: 'capacity', label: batchPreviewCols.columnRecords, width: 120, visible: true },
  attended: { id: 'attended', label: batchPreviewCols.attended, width: 150, visible: true, sortable: false, },
  headCount: { id: 'headCount', label: batchPreviewCols.headCount, width: 150, visible: true, sortable: false, },
  status: { id: 'status', label: batchBaseColumns.status, width: 120, visible: true },
  actions: { id: 'actions', label: batchBaseColumns.action, width: 140, visible: true, sortable: false, disableToggle: true, },
}

const BATCH_PREVIEW_LISTING_ACTIONS = {
  generateBatches: { id: 'generateBatches', label: uiText.batchManager.actions.generateBatches },
  sharePreview: { id: 'sharePreview', label: uiText.batchManager.actions.sharePreview },
  editBatch: { id: 'editBatch', label: uiText.batchManager.actions.editBatch },
  openBatch: { id: 'openBatch', label: uiText.batchManager.actions.openBatch },
  lockBatch: { id: 'lockBatch', label: uiText.batchManager.actions.lockBatch },
}

export const BATCH_MANAGER_PREVIEW_GRID_COLUMNS: RoleColumn[] = [
  BATCH_PREVIEW_LISTING_COLUMNS.sequence,
  BATCH_PREVIEW_LISTING_COLUMNS.capacity,
  BATCH_PREVIEW_LISTING_COLUMNS.date,
  BATCH_PREVIEW_LISTING_COLUMNS.startTime,
  BATCH_PREVIEW_LISTING_COLUMNS.endTime,
  BATCH_PREVIEW_LISTING_COLUMNS.actions,
];

export const BATCH_MANAGER_PREVIEW_DEFAULT_ACTIONS: RoleAction[] = [
  BATCH_PREVIEW_LISTING_ACTIONS.generateBatches,
  BATCH_PREVIEW_LISTING_ACTIONS.sharePreview,
  BATCH_PREVIEW_LISTING_ACTIONS.editBatch,
  BATCH_PREVIEW_LISTING_ACTIONS.openBatch,
  BATCH_PREVIEW_LISTING_ACTIONS.lockBatch,
];

const BATCH_SLOT_LISTING_COLUMNS = [
  BATCH_PREVIEW_LISTING_COLUMNS.sequence,
  BATCH_PREVIEW_LISTING_COLUMNS.date,
  BATCH_PREVIEW_LISTING_COLUMNS.startTime,
  BATCH_PREVIEW_LISTING_COLUMNS.endTime,
  BATCH_PREVIEW_LISTING_COLUMNS.capacity,
  BATCH_PREVIEW_LISTING_COLUMNS.attended,
  BATCH_PREVIEW_LISTING_COLUMNS.headCount,
  BATCH_PREVIEW_LISTING_COLUMNS.status,
  BATCH_PREVIEW_LISTING_COLUMNS.actions,
];

const batchVoucherListColumns = uiText.batchVoucherListing.columns;

const BATCH_VOUCHER_LIST_COLUMNS = {
  pridId: {
    id: 'uniqueReferenceId',
    label: batchVoucherListColumns.pridId,
    width: 150,
    visible: true,
    sortable: false,
  },
  customerName: {
    id: 'customerName',
    label: batchVoucherListColumns.customerName,
    width: 200,
    visible: true,
    sortable: false,
  },
  closingRmName: {
    id: 'closingRmName',
    label: batchVoucherListColumns.closingRmName,
    width: 200,
    visible: true,
    sortable: false,
  },
  status: {
    id: 'cxStatus',
    label: batchVoucherListColumns.status,
    width: 150,
    visible: true,
    sortable: false,
    tab: 'all'
  },
  action: {
    id: 'action',
    label: batchVoucherListColumns.action,
    width: 120,
    visible: true,
    sortable: false,
  },
};

const BATCH_VOUCHER_LIST_ACTIONS = {
  moveTo: { id: 'moveTo', label: uiText.batchManager.actions.moveTo },
  notifyCx: { id: 'notifyCx', label: uiText.batchManager.actions.notifyCx },
};

const BHK_WISE_SPLIT_BASE_FILTERS = {
  campaign: { id: 'campaign', label: eoiDashboardFilters.campaign, type: 'select' as const },
  dateRange: {
    id: 'dateRange',
    label: eoiDashboardFilters.dateRange,
    type: 'daterange' as const,
  },
};

const DAILY_TRACKER_BASE_FILTERS = {
  campaign: { id: 'campaign', label: eoiDashboardFilters.campaign, type: 'select' as const },
  dateRange: {
    id: 'dateRange',
    label: eoiDashboardFilters.dateRange,
    type: 'daterange' as const,
  },
};

// unit inventory columns
const unitInventoryColumns = uiText.unitInventory.columns

// Unit inventory base columns
const UNIT_INVENTORY_BASE_COLUMNS = {
  campaignName: {
    id: 'campaignName',
    label: unitInventoryColumns.campaignName,
    width: 250,
    visible: false,
    disableToggle: false,
    sortable: false,
  },
  towerName: {
    id: 'towerName',
    label: unitInventoryColumns.towerName,
    width: 150,
    visible: true,
    disableToggle: true,
    sortable: false,
  },
  floor: {
    id: 'floor',
    label: unitInventoryColumns.floor,
    width: 100,
    visible: true,
    sortable: false,
  },
  unitNumber: {
    id: 'unitNumber',
    label: unitInventoryColumns.unitNumber,
    width: 180,
    sortable: false,
    visible: true,
  },
  configuration: {
    id: 'configuration',
    label: unitInventoryColumns.configuration,
    width: 150,
    sortable: false,
    visible: true,
  },
  facing: {
    id: 'facing',
    label: unitInventoryColumns.facing,
    width: 100,
    sortable: false,
    visible: true,
  },
  carParkType: {
    id: 'carParkType',
    label: unitInventoryColumns.carParkType,
    width: 300,
    sortable: false,
    visible: false,
  },
  noOfCarParks: {
    id: 'numberOfCarParks',
    label: unitInventoryColumns.noOfCarParks,
    width: 150,
    sortable: false,
    visible: false,
  },
  areaSba: {
    id: 'areaSba',
    label: unitInventoryColumns.areaSBA,
    width: 150,
    sortable: false,
    visible: true,
  },
  carpetArea: {
    id: 'carpetArea',
    label: unitInventoryColumns.carpetArea,
    width: 150,
    sortable: false,
    visible: true,
  },
  agreementValue: {
    id: 'agreementValue',
    label: unitInventoryColumns.agreementValue,
    width: 160,
    sortable: false,
    visible: true,
  },
  status: {
    id: 'status',
    label: unitInventoryColumns.status,
    width: 200,
    visible: true,
    sortable: false,
    disableToggle: true,
  },
  action: {
    id: 'action',
    label: unitInventoryColumns.actions,
    width: 80,
    visible: true,
    sortable: false,
    disableToggle: false,
  },
  series: {
    id: 'series',
    label: unitInventoryColumns.series,
    width: 100,
    visible: true,
    sortable: false,
    disableToggle: false,
  },
};

// unit inventory filters
const UNIT_INVENTORY_BASE_FILTERS = {
  campaign: { id: 'campaign', label: unitInventoryColumns.campaignName, type: 'select' as const },
  tower: { id: 'tower', label: unitInventoryColumns.towerName, type: 'multiselect' as const },
  floor: { id: 'floor', label: unitInventoryColumns.floor, type: 'multiselect' as const },
  series: { id: 'series', label: unitInventoryColumns.series, type: 'multiselect' as const },
  configuration: { id: 'configuration', label: unitInventoryColumns.configuration, type: 'multiselect' as const },
  facing: { id: 'facing', label: unitInventoryColumns.facing, type: 'multiselect' as const },
  inventoryStatus: { id: 'inventoryStatus', label: unitInventoryColumns.status, type: 'select' as const },
};

const UNIT_INVENTORY_BASE_ACTIONS = {
  updateStatus: { id: 'updateStatus', label: uiText.unitInventory.editStatus },
  mapUnitToVoucher: { id: 'mapUnitToVoucher', label: uiText.unitInventory.mapUnitToVoucher },
};

const BANK_DETAILS_BASE_COLUMNS = {
  campaignname: {
    id: 'campaignName',
    label: uiText.bankDetails.columns.campaignName,
    width: 180,
    visible: true,
    sortable: false,
    disableToggle: true,
  },
  accHolderName: {
    id: 'accountName',
    label: uiText.bankDetails.columns.accHolderName,
    width: 180,
    sortable: false,
    visible: true,
  },
  bankName: {
    id: 'bankName',
    label: uiText.bankDetails.columns.bankName,
    width: 150,
    sortable: false,
    visible: true,
  },
  accNumber: {
    id: 'accountNumber',
    label: uiText.bankDetails.columns.accNumber,
    width: 180,
    sortable: false,
    visible: true,
  },
  ifscCode: {
    id: 'ifscCode',
    label: uiText.bankDetails.columns.ifscCode,
    width: 150,
    sortable: false,
    visible: true,
  },
  swiftCode: {
    id: 'swiftCode',
    label: uiText.bankDetails.columns.swiftCode,
    width: 150,
    sortable: false,
    visible: true,
  },
  action: {
    id: 'action',
    label: uiText.bankDetails.columns.action,
    width: 100,
    sortable: false,
    visible: true,
  },
};

const BANK_DETAILS_BASE_ACTIONS = {
  share: { id: 'share', label: uiText.bankDetails.actions.share },
};

const SFDC_LOGS_BASE_ACTIONS = {
  view: { id: 'view', label: uiText.sfdcLogs.actions.view },
};

const SFDC_LOGS_COLUMNS: RoleColumn[] = [
  {
    id: 'opportunityId',
    label: uiText.sfdcLogs.columns.opportunityId,
    width: 220,
    visible: true,
    sortable: true,
    disableToggle: true,
  },
  {
    id: 'logEvent',
    label: uiText.sfdcLogs.columns.logEvent,
    width: 180,
    visible: true,
    sortable: false,
  },
  {
    id: 'status',
    label: uiText.sfdcLogs.columns.status,
    width: 120,
    visible: true,
    sortable: true,
  },
  {
    id: 'createdAt',
    label: uiText.sfdcLogs.columns.createdAt,
    width: 200,
    visible: true,
    sortable: true,
  },
  {
    id: 'action',
    label: uiText.sfdcLogs.columns.action,
    width: 88,
    visible: true,
    sortable: false,
    disableToggle: true,
  },
];

const SFDC_LOGS_FILTERS: RoleFilter[] = [
  { id: 'search', label: uiText.sfdcLogs.filters.search, type: 'text' },
  { id: 'logEvent', label: uiText.sfdcLogs.filters.logEvent, type: 'select' },
];
// Channel Partners End

/** Hide row action column for view-only roles (e.g. BIS). */
const hideActionsColumn = (cols: RoleColumn[]): RoleColumn[] =>
  cols.map((c) =>
    c.id === 'actions' || c.id === 'Action' ? { ...c, visible: false } : c
  );

// --- Reports: Users (admin / super-admin / bis) ---
const REPORTS_USERS_COLUMNS: RoleColumn[] = [
  { id: 'id', label: 'Employee ID', width: 120, visible: true, sortable: false, disableToggle: true },
  { id: 'name', label: 'RM Name', width: 300, visible: true, sortable: false, disableToggle: true },
  { id: 'email', label: 'Email', width: 300, visible: false, sortable: false, tooltip: 'Email Address' },
  { id: 'incentivePaidYTD', label: 'Incentive Paid YTD', width: 200, visible: true, sortable: true, tooltip: 'Incentive paid YTD' },
  { id: 'incentivePayable', label: 'Incentive Payable', width: 200, visible: true, sortable: true, tooltip: 'Incentive payable' },
  { id: 'incentivePaid', label: 'Last Incentive Paid', width: 200, visible: true, sortable: true, tooltip: 'Incentive paid' },
  { id: 'bookingAmountYTD', label: ' Total Agreement Value (AV)​', width: 250, visible: true, sortable: true, tooltip: ' Total Agreement Value (AV)​' },
  { id: 'collectedAmountYTD', label: 'AV collected YTD​', width: 220, visible: true, sortable: true, tooltip: 'AV collected YTD​' },
  { id: 'totalBookings', label: 'Units Sold', width: 200, visible: true, sortable: true, tooltip: 'Units Sold' },
  { id: 'qualifiedBookings', label: 'Qualified Bookings', width: 200, visible: true, sortable: true, tooltip: 'Qualified Bookings' },
  { id: 'disqualifiedBookings', label: 'Disqualified Bookings', width: 220, visible: true, sortable: true, tooltip: 'Disqualified Bookings' },
  { id: 'cancelledBookings', label: 'Cancelled Bookings', width: 200, visible: true, sortable: true, tooltip: 'Cancelled Bookings' },
  { id: 'regularisedBookings', label: 'Regularised Bookings', width: 200, visible: true, sortable: true, tooltip: 'Regularised Bookings' },
  { id: 'unRegularisedBookings', label: 'Unregularised Bookings', width: 200, visible: true, sortable: true, tooltip: 'Unregularised Bookings' },
  { id: 'actions', label: 'Action', width: 88, visible: true, sortable: false, disableToggle: true, tooltip: 'Action' },
];

const REPORTS_USERS_FILTERS: RoleFilter[] = [{ id: 'search', label: 'Search', type: 'text' }];

// --- Reports: Bookings ---
const REPORTS_BOOKINGS_COLUMNS: RoleColumn[] = [
  { id: 'rmName', label: 'RM Name', width: 150, visible: true, sortable: true },
  { id: 'unitStatus', label: 'Unit Status', width: 150, visible: true, sortable: true },
  { id: 'customerName', label: 'Customer Name', width: 250, visible: true, sortable: false, disableToggle: true },
  { id: 'projectName', label: 'Project Name', width: 200, visible: true, sortable: true, disableToggle: true },
  { id: 'propertyNo', label: 'Property No.', width: 200, visible: true, sortable: false },
  { id: 'bookingDate', label: 'Booking Date', width: 150, visible: true, sortable: true },
  { id: 'sapBookingDate', label: 'SAP Booking Date', width: 150, visible: true, sortable: false },
  { id: 'agreementReceivedDate', label: 'Agreement Recd. Date', width: 270, visible: true, sortable: true, tooltip: 'Agreement Received Date' },
  { id: 'receivedDate', label: 'Reg. % Recd. Date', width: 200, visible: true, sortable: true, tooltip: 'Regularization Amount Percentage Received' },
  { id: 'qualificationDate', label: 'Qualification Date', width: 200, visible: true, sortable: true },
  { id: 'incentiveAmount', label: 'Incentive Payable', width: 170, visible: true, sortable: true },
  { id: 'paidDate', label: 'Incentive Paid Date', width: 200, visible: true, sortable: true },
  { id: 'receivedPercentage', label: 'Amount Recd. %', width: 170, visible: true, sortable: true, tooltip: '% of Agreement Value Received' },
  { id: 'grossTotalValue', label: 'Agreement Value', width: 170, visible: true, sortable: true },
  { id: 'incentivePercentage', label: 'Incentive %', width: 150, visible: true, sortable: true },
  { id: 'paymentStatus', label: 'Incentive Status', width: 170, visible: true, sortable: true },
  { id: 'cancellationDate', label: 'Cancelled Date', width: 150, visible: true, sortable: false },
  { id: 'stage', label: 'Stage', width: 150, visible: true, sortable: true },
  { id: 'saleType', label: 'Sale Type', width: 150, visible: true, sortable: true },
  { id: 'ineligibilityReason', label: 'Ineligibility Reason', width: 400, visible: false, sortable: false },
  { id: 'actions', label: 'Action', width: 88, visible: true, sortable: false },
];

const REPORTS_BOOKINGS_FILTERS: RoleFilter[] = [
  { id: 'brand', label: 'Brand', type: 'select' },
  { id: 'project', label: 'Project', type: 'multiselect' },
  { id: 'rm', label: 'RM', type: 'multiselect' },
  { id: 'unitStatus', label: 'Unit status', type: 'select' },
  { id: 'incentiveStatus', label: 'Incentive status', type: 'select' },
  { id: 'dateRange', label: 'Date range', type: 'daterange' },
];

// --- Leaderboard RM summary ---
const LEADERBOARD_RM_SUMMARY_COLUMNS: RoleColumn[] = [
  { id: 'srNo', label: 'Sr. No.', width: 80, visible: true, sortable: false, disableToggle: true },
  { id: 'rmName', label: 'RM Name', width: 300, visible: true, sortable: false, tooltip: 'Relationship Manager Name', disableToggle: true },
  { id: 'totalBookings', label: 'Total Bookings', width: 150, visible: true, sortable: false },
  { id: 'totalAgreementValue', label: 'Total Agreement Value (AV)​', width: 250, visible: true, sortable: false },
  { id: 'totalIncentiveAmount', label: 'Incentive Amount', width: 250, visible: true, sortable: false },
  { id: 'percentageReceived', label: 'AV % Received', width: 150, visible: true, sortable: false },
];

const LEADERBOARD_RM_SUMMARY_FILTERS: RoleFilter[] = [
  { id: 'brand', label: 'Brand', type: 'select' },
  { id: 'city', label: 'City', type: 'multiselect' },
  { id: 'project', label: 'Project', type: 'multiselect' },
  { id: 'unitStatus', label: 'Unit status', type: 'select' },
  { id: 'incentiveStatus', label: 'Incentive status', type: 'select' },
  { id: 'dateRange', label: 'Date range', type: 'daterange' },
];

// --- Incentive policy & Booster lists ---
const INCENTIVE_STRUCTURE_COLUMNS: RoleColumn[] = [
  { id: 'name', label: 'Incentive Policy Name', width: 350, visible: true, sortable: false, disableToggle: true },
  { id: 'duration', label: 'Duration', width: 185, visible: true, sortable: true, disableToggle: true },
  { id: 'brand', label: 'Brand', width: 300, visible: true, sortable: false },
  { id: 'status', label: 'Status', width: 100, visible: true, sortable: true },
  { id: 'actions', label: 'Action', width: 100, visible: true, sortable: false, disableToggle: true },
];

const INCENTIVE_STRUCTURE_FILTERS: RoleFilter[] = [
  { id: 'name', label: 'Name', type: 'text' },
  { id: 'brand', label: 'Brand', type: 'select' },
  { id: 'status', label: 'Status', type: 'select' },
  { id: 'dateRange', label: 'Date range', type: 'daterange' },
];

const BOOSTER_COLUMNS: RoleColumn[] = [
  { id: 'name', label: 'Booster Name', width: 300, visible: true, sortable: false, disableToggle: true },
  { id: 'project', label: 'Project', width: 250, visible: true, sortable: true, disableToggle: true },
  { id: 'city', label: 'City', width: 150, visible: true, sortable: true },
  { id: 'brand', label: 'Brand', width: 200, visible: true, sortable: false },
  { id: 'duration', label: 'Duration', width: 250, visible: true, sortable: false },
  { id: 'status', label: 'Status', width: 100, visible: true, sortable: true },
  { id: 'actions', label: 'Action', width: 120, visible: true, sortable: false, disableToggle: true },
];

const BOOSTER_FILTERS: RoleFilter[] = [
  { id: 'projectName', label: 'Project', type: 'text' },
  { id: 'city', label: 'City', type: 'multiselect' },
  { id: 'brand', label: 'Brand', type: 'select' },
  { id: 'status', label: 'Status', type: 'select' },
  { id: 'dateRange', label: 'Date range', type: 'daterange' },
];

const INCENTIVE_REPORTS_FILTERS: RoleFilter[] = [
  { id: 'rm', label: 'Relationship Manager', type: 'select' },
  { id: 'statementPeriod', label: 'Statement period (months)', type: 'select' },
];

/** Admin & Super Admin: incentive stack — tune columns/filters/actions here for all roles using these modules. */
const ADMIN_INCENTIVE_STACK_MODULES: Record<string, ModulePermissions> = {
  reportsUsers: {
    columns: REPORTS_USERS_COLUMNS,
    filters: REPORTS_USERS_FILTERS,
    actions: [],
    canCreate: false,
    canExport: true,
    canRefresh: true,
  },
  reportsBookings: {
    columns: hideActionsColumn(REPORTS_BOOKINGS_COLUMNS),
    filters: REPORTS_BOOKINGS_FILTERS,
    actions: [],
    canCreate: false,
    canExport: true,
    canRefresh: true,
  },
  incentiveReports: {
    columns: [],
    filters: INCENTIVE_REPORTS_FILTERS,
    actions: [],
    canCreate: false,
    canExport: true,
  },
  leaderboardRmSummary: {
    columns: LEADERBOARD_RM_SUMMARY_COLUMNS,
    filters: LEADERBOARD_RM_SUMMARY_FILTERS,
    actions: [],
    canCreate: false,
    canExport: true,
  },
  incentiveStructure: {
    columns: INCENTIVE_STRUCTURE_COLUMNS,
    filters: INCENTIVE_STRUCTURE_FILTERS,
    actions: [],
    canCreate: true,
    canExport: false,
  },
  booster: {
    columns: BOOSTER_COLUMNS,
    filters: BOOSTER_FILTERS,
    actions: [],
    canCreate: true,
    canExport: false,
  },
  bookingDateModification: {
    columns: [],
    filters: [],
    actions: [],
    canCreate: true,
    canExport: true,
  },
  /** Batch Manager — preview grid (admin stack roles inherit via spread). */
  batchManager: {
    columns: BATCH_MANAGER_PREVIEW_GRID_COLUMNS,
    filters: [],
    actions: BATCH_MANAGER_PREVIEW_DEFAULT_ACTIONS,
    canCreate: true,
    canExport: true,
  },
};

/** BIS: same modules, view-only exports/create; tighten columns (no row actions). */
const BIS_INCENTIVE_STACK_VIEW_ONLY: Record<string, ModulePermissions> = {
  reportsUsers: {
    columns: hideActionsColumn(REPORTS_USERS_COLUMNS),
    filters: REPORTS_USERS_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
    canRefresh: false,
  },
  reportsBookings: {
    columns: hideActionsColumn(REPORTS_BOOKINGS_COLUMNS),
    filters: REPORTS_BOOKINGS_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
    canRefresh: false,
  },
  incentiveReports: {
    columns: [],
    filters: INCENTIVE_REPORTS_FILTERS,
    actions: [],
    canCreate: false,
    canExport: true,
  },
  leaderboardRmSummary: {
    columns: LEADERBOARD_RM_SUMMARY_COLUMNS,
    filters: LEADERBOARD_RM_SUMMARY_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
  },
  incentiveStructure: {
    columns: hideActionsColumn(INCENTIVE_STRUCTURE_COLUMNS),
    filters: INCENTIVE_STRUCTURE_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
  },
  booster: {
    columns: hideActionsColumn(BOOSTER_COLUMNS),
    filters: BOOSTER_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
  },
  bookingDateModification: {
    columns: [],
    filters: [],
    actions: [],
    canCreate: true,
    canExport: true,
  },
  batchManager: {
    columns: BATCH_MANAGER_PREVIEW_GRID_COLUMNS,
    filters: [],
    actions: [],
    canCreate: false,
    canExport: false,
  },
};

// --- Admin / Super Admin: Role nav — Brands, Projects, Project phases (list columns & flags) ---
const BRAND_LIST_COLUMNS: RoleColumn[] = [
  { id: 'name', label: 'Name', width: 180, visible: true, sortable: false },
  {
    id: 'salaryMultiplier',
    label: 'Salary Multiplier',
    width: 180,
    visible: true,
    sortable: false,
  },
  {
    id: 'reraRegularization',
    label: 'Regularisation %',
    width: 160,
    visible: true,
    tooltip: 'RERA Regularisation Percentage',
    sortable: false,
    group: 'RERA',
  },
  {
    id: 'reraPayable',
    label: 'Qualification %',
    width: 160,
    visible: true,
    tooltip: 'RERA Qualification Percentage',
    sortable: false,
    group: 'RERA',
  },
  {
    id: 'rtmRegularization',
    label: 'Regularisation %',
    width: 160,
    visible: true,
    tooltip: 'RTM Regularisation Percentage',
    sortable: false,
    group: 'RTM',
  },
  {
    id: 'rtmPayable',
    label: 'Qualification %',
    width: 160,
    visible: true,
    tooltip: 'RTM Qualification Percentage',
    sortable: false,
    group: 'RTM',
  },
  { id: 'edit', label: 'Action', width: 100, visible: true, sortable: false },
];

const PROJECT_LIST_COLUMNS: RoleColumn[] = [
  {
    id: 'projectName',
    label: 'Project Name',
    width: 200,
    visible: true,
    sortable: true,
    disableToggle: true,
  },
  {
    id: 'city',
    label: 'City',
    width: 150,
    visible: true,
    disableToggle: true,
    sortable: false,
  },
  { id: 'brand', label: 'Brand', width: 200, visible: true, sortable: false },
  {
    id: 'reraRegularization',
    label: 'Regularisation %',
    width: 160,
    visible: true,
    tooltip: 'RERA Regularisation Percentage',
    sortable: false,
    group: 'RERA',
  },
  {
    id: 'reraPayable',
    label: 'Qualification %',
    width: 160,
    visible: true,
    tooltip: 'RERA Qualification Percentage',
    sortable: false,
    group: 'RERA',
  },
  {
    id: 'rtmRegularization',
    label: 'Regularisation %',
    width: 160,
    visible: true,
    tooltip: 'RTM Regularisation Percentage',
    sortable: false,
    group: 'RTM',
  },
  {
    id: 'rtmPayable',
    label: 'Qualification %',
    width: 160,
    visible: true,
    tooltip: 'RTM Qualification Percentage',
    sortable: false,
    group: 'RTM',
  },
  {
    id: 'actions',
    label: 'Action',
    width: 88,
    visible: true,
    sortable: false,
    tooltip: 'Actions',
  },
];

const PHASE_LIST_COLUMNS: RoleColumn[] = [
  {
    id: 'name',
    label: 'Phase Name',
    width: 250,
    visible: true,
    sortable: false,
    tooltip: 'Phase Name',
    disableToggle: true,
  },
  {
    id: 'project',
    label: 'Project Name',
    width: 150,
    visible: true,
    sortable: false,
    tooltip: 'Project Name',
    disableToggle: true,
  },
  {
    id: 'isLaunch',
    label: 'Launch',
    width: 120,
    visible: true,
    sortable: false,
    tooltip: 'Launch Status',
  },
  {
    id: 'isSustenance',
    label: 'Sustenance',
    width: 120,
    visible: true,
    sortable: false,
    tooltip: 'Sustenance Status',
  },
  {
    id: 'launchDateRange',
    label: 'Launch Date Range',
    width: 250,
    visible: true,
    sortable: false,
    tooltip: 'Launch Date Range',
  },
  {
    id: 'sustenanceDate',
    label: 'Sustenance Date',
    width: 150,
    visible: true,
    sortable: false,
    tooltip: 'Sustenance Date',
  },
  {
    id: 'possessionDate',
    label: 'Possession Date',
    width: 180,
    visible: true,
    sortable: false,
    tooltip: 'Possession Date',
  },
  { id: 'brand', label: 'Brand', width: 200, visible: true, sortable: false, tooltip: 'Brand' },
  { id: 'city', label: 'City', width: 150, visible: true, sortable: false, tooltip: 'City' },
  { id: 'edit', label: 'Action', width: 150, visible: true, sortable: false, tooltip: 'Action' },
];

const BRAND_LIST_FILTERS: RoleFilter[] = [{ id: 'name', label: 'Name', type: 'text' }];
const PROJECT_LIST_FILTERS: RoleFilter[] = [
  { id: 'name', label: 'Project name', type: 'text' },
  { id: 'brand', label: 'Brand', type: 'select' },
  { id: 'city', label: 'City', type: 'select' },
  { id: 'billingEntity', label: 'Billing entity', type: 'select' },
];
const PHASE_LIST_FILTERS: RoleFilter[] = [
  { id: 'name', label: 'Phase name', type: 'text' },
  { id: 'brand', label: 'Brand', type: 'select' },
  { id: 'city', label: 'City', type: 'multiselect' },
];

const USER_LIST_COLUMNS: RoleColumn[] = [
  { id: 'id', label: 'Employee ID', width: 120, visible: true, disableToggle: true, sortable: false },
  { id: 'name', label: 'Name', width: 250, visible: true, disableToggle: true, sortable: false },
  { id: 'email', label: 'Email', width: 300, visible: false, sortable: false },
  { id: 'brand', label: 'Brand', width: 200, visible: true, sortable: false },
  { id: 'group', label: 'Group', width: 150, visible: true, sortable: false },
  { id: 'role', label: 'Role', width: 200, visible: true, sortable: false },
  { id: 'status', label: 'Status', width: 100, visible: true, sortable: false },
  { id: 'employeeStatus', label: 'Employment Status', width: 180, visible: true, sortable: false },
  { id: 'Action', label: 'Action', width: 80, visible: true, disableToggle: false, sortable: false },
];

const USER_LIST_FILTERS: RoleFilter[] = [
  { id: 'search', label: 'Search', type: 'text' },
  { id: 'role', label: 'Role', type: 'select' },
  { id: 'brand', label: 'Brand', type: 'select' },
  { id: 'group', label: 'Group', type: 'select' },
  { id: 'status', label: 'Status', type: 'select' },
];

const FINANCE_RECORD_DETAILS_COLUMNS: RoleColumn[] = [
  { id: 'srNo', label: 'Sr. No.', width: 100, visible: true, sortable: false },
  { id: 'paymentMode', label: 'Payment Mode', width: 180, visible: true, sortable: false },
  { id: 'date', label: 'Date', width: 150, visible: true, disableToggle: true, sortable: false },
  {
    id: 'transactionId',
    label: 'Transaction ID',
    width: 200,
    visible: true,
    disableToggle: true,
    sortable: false,
  },
  { id: 'amount', label: 'Amount', width: 100, visible: true, sortable: false },
  { id: 'realisationDate', label: 'Realisation Date', width: 150, visible: true, sortable: false },
  {
    id: 'receiptNo',
    label: 'Receipt No.',
    width: 100,
    visible: true,
    disableToggle: true,
    sortable: false,
  },
  { id: 'comments', label: 'Comments', width: 200, visible: true, sortable: false },
  { id: 'paymentProof', label: 'Payment Proof', width: 150, visible: true, sortable: false },
  {
    id: 'chequeDepositSlip',
    label: 'Cheque deposit Slip',
    width: 170,
    visible: true,
    sortable: false,
  },
  {
    id: 'receiptImage',
    label: 'Receipt Image',
    width: 170,
    visible: true,
    sortable: false,
  },
  { id: 'status', label: 'Status', width: 120, visible: true, sortable: false },
  { id: 'Action', label: 'Action', width: 100, visible: true, sortable: false },
];

/** Super Admin & Admin: brands / projects / phases listing under Role group. */
const ADMIN_ROLE_NAV_LIST_MODULES: Record<string, ModulePermissions> = {
  brandList: {
    columns: BRAND_LIST_COLUMNS,
    filters: BRAND_LIST_FILTERS,
    actions: [],
    canCreate: true,
    canExport: false,
  },
  projectList: {
    columns: PROJECT_LIST_COLUMNS,
    filters: PROJECT_LIST_FILTERS,
    actions: [],
    canCreate: true,
    canExport: false,
  },
  phaseList: {
    columns: PHASE_LIST_COLUMNS,
    filters: PHASE_LIST_FILTERS,
    actions: [],
    canCreate: true,
    canExport: false,
  },
  userList: {
    columns: USER_LIST_COLUMNS,
    filters: USER_LIST_FILTERS,
    actions: [],
    canCreate: true,
    canExport: true,
    canRefresh: true,
  },
};

/** BIS: Masters (brands / projects / phases) — view-only lists; no create or export. */
const BIS_MASTER_LIST_VIEW_ONLY: Record<string, ModulePermissions> = {
  userList: {
    columns: hideActionsColumn(USER_LIST_COLUMNS),
    filters: USER_LIST_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
    canRefresh: false,
    canEdit: false,
  },
  brandList: {
    columns: BRAND_LIST_COLUMNS.map((c) => (c.id === 'edit' ? { ...c, visible: false } : c)),
    filters: BRAND_LIST_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
  },
  projectList: {
    columns: hideActionsColumn(PROJECT_LIST_COLUMNS),
    filters: PROJECT_LIST_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
  },
  phaseList: {
    columns: PHASE_LIST_COLUMNS.map((c) => (c.id === 'edit' ? { ...c, visible: false } : c)),
    filters: PHASE_LIST_FILTERS,
    actions: [],
    canCreate: false,
    canExport: false,
  },
};

/** IOM row action disable rules — extend per role as view/verify/generate rules are defined. */

/**
 * CRM Generate IOM — enabled only when:
 * 1. Status is "IOM_TO_BE_CREATED" / "DRAFT" OR belongs to IOM_REJECTED_STATUSES
 * 2. AND signature is present
 *
 * Disabled otherwise.
 */
const isCrmGenerateIomDisabled = (
  row: IomRow,
  _role?: unknown,
  context?: RoleActionContext
): boolean => {
  const hasSignature = context?.hasSignature ?? false;
  const isIomToBeCreated =
    row.statusLabel === IomStatus.IOM_TO_BE_CREATED;

  const isDraft = row.statusLabel === IomStatus.DRAFT;

  const isEditableStatus =
    row.statusLabel && IOM_REJECTED_STATUSES.has(row.statusLabel as IomStatus);

  const isAllowedStatus = isIomToBeCreated || isDraft || isEditableStatus;

  return !isAllowedStatus || !hasSignature;
};

/**
 * CRM View IOM — disabled when:
 * 1. Status is "IOM_TO_BE_CREATED" (regardless of signature), OR
 * 2. Signature is missing (for any status).
 */
const isCrmViewDisabled = (
  row: IomRow,
  _role?: unknown,
  context?: RoleActionContext
): boolean => {
  const hasSignature = context?.hasSignature ?? false;
  const isIomToBeCreated = row.statusLabel === IomStatus.IOM_TO_BE_CREATED;

  return isIomToBeCreated || !hasSignature;
};

// Check if Signature is Missing
const isSignatureMissing = (context?: RoleActionContext) =>
  !(context?.hasSignature ?? false);

const isCrmTlViewDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean =>
  isSignatureMissing(context);

const isCrmTlVerifyIomDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean => 
  isSignatureMissing(context);

const isCrmHeadViewDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean =>
  isSignatureMissing(context);

const isCrmHeadVerifyIomDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean =>
  isSignatureMissing(context);

const isFinanceUserViewDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean =>
  isSignatureMissing(context);

const isFinanceUserVerifyIomDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean =>
  isSignatureMissing(context);

const isFinanceHeadViewDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean =>
  isSignatureMissing(context);

const isFinanceHeadVerifyIomDisabled = (_row: IomRow, _role?: unknown, context?: RoleActionContext): boolean =>
  isSignatureMissing(context);

/**
 * CRM "Verify Generated IOM" — visible only when the IOM is awaiting CRM TL approval.
 * Reuses the `disabled` flag as a visibility gate; the row component hides the CTA when disabled.
 */
const isCrmVerifyGeneratedIomHidden = (row: IomRow): boolean =>
  row.statusLabel !== IomStatus.CRM_TL_APPROVAL_PENDING;

const IOM_CRM_ACTIONS: RoleAction[] = [
  { ...IOM_BASE_ACTIONS.view, disabled: isCrmViewDisabled },
  { ...IOM_BASE_ACTIONS.generateIOM, disabled: isCrmGenerateIomDisabled },
  { ...IOM_BASE_ACTIONS.verifyGeneratedIOM, disabled: isCrmVerifyGeneratedIomHidden },
];

const IOM_CRM_TL_ACTIONS: RoleAction[] = [
  { ...IOM_BASE_ACTIONS.view, disabled: isCrmTlViewDisabled },
  { ...IOM_BASE_ACTIONS.verifyIOM, disabled: isCrmTlVerifyIomDisabled },
];

const IOM_CRM_HEAD_ACTIONS: RoleAction[] = [
  { ...IOM_BASE_ACTIONS.view, disabled: isCrmHeadViewDisabled },
  { ...IOM_BASE_ACTIONS.verifyIOM, disabled: isCrmHeadVerifyIomDisabled },
];

const IOM_FINANCE_USER_ACTIONS: RoleAction[] = [
  { ...IOM_BASE_ACTIONS.view, disabled: isFinanceUserViewDisabled },
  { ...IOM_BASE_ACTIONS.verifyIOM, disabled: isFinanceUserVerifyIomDisabled },
];

const IOM_FINANCE_HEAD_ACTIONS: RoleAction[] = [
  { ...IOM_BASE_ACTIONS.view, disabled: isFinanceHeadViewDisabled },
  { ...IOM_BASE_ACTIONS.verifyIOM, disabled: isFinanceHeadVerifyIomDisabled },
  { ...IOM_BASE_ACTIONS.closeInvoice },
];

/** Shared IOM listing columns — append role-specific columns, then IOM_MANAGEMENT_ACTION_COLUMN. */
const IOM_MANAGEMENT_DEFAULT_COLUMNS: RoleColumn[] = [
  { ...IOM_LISTING_BASE_COLUMNS.salesOrderId },
  { ...IOM_LISTING_BASE_COLUMNS.projectName },
  { ...IOM_LISTING_BASE_COLUMNS.unitNo },
  { ...IOM_LISTING_BASE_COLUMNS.customerName },
  { ...IOM_LISTING_BASE_COLUMNS.saleValue },
  { ...IOM_LISTING_BASE_COLUMNS.saleValueCollectedPercentage },
  { ...IOM_LISTING_BASE_COLUMNS.statusLabel },
  { ...IOM_LISTING_BASE_COLUMNS.iomCreatedAt },
  { ...IOM_LISTING_BASE_COLUMNS.iomNo },
  { ...IOM_LISTING_BASE_COLUMNS.thresholdPaymentReceivedAt },
  { ...IOM_LISTING_BASE_COLUMNS.totalBrokerageAmount },
  { ...IOM_LISTING_BASE_COLUMNS.referralSplitType },
  { ...IOM_LISTING_BASE_COLUMNS.referralPointsEdited },
  { ...IOM_LISTING_BASE_COLUMNS.loyaltyPointClassification },
  { ...IOM_LISTING_BASE_COLUMNS.pointsUpdatedAt },
  { ...IOM_LISTING_BASE_COLUMNS.invoiceReqNumber },
  { ...IOM_LISTING_BASE_COLUMNS.invoiceStatus },
  { ...IOM_LISTING_BASE_COLUMNS.ageing },
  { ...IOM_LISTING_BASE_COLUMNS.invoiceNumber },
  { ...IOM_LISTING_BASE_COLUMNS.invoiceDate },
  { ...IOM_LISTING_BASE_COLUMNS.saleValueAmountCollected },
];

const IOM_MANAGEMENT_ACTION_COLUMN: RoleColumn = { ...IOM_LISTING_BASE_COLUMNS.action };

/** Shared IOM Management permissions used by CRM and the IOM-only roles (CRM TL/Head, Finance User/Head, Loyalty Team). */
const IOM_MANAGEMENT_DEFAULT: ModulePermissions = {
  columns: [...IOM_MANAGEMENT_DEFAULT_COLUMNS, IOM_MANAGEMENT_ACTION_COLUMN],
  canSelectRows: false,
  canExport: true,
  filters: [
    IOM_BASE_FILTERS.iomStatus,
    IOM_BASE_FILTERS.project,
    IOM_BASE_FILTERS.invoiceStatus,
    IOM_BASE_FILTERS.pointsClassification,
    IOM_BASE_FILTERS.dateRange,
  ],
  actions: IOM_CRM_ACTIONS,
};

const IOM_MY_TEAM_DEFAULT: ModulePermissions = {
  columns: [
    { ...IOM_MY_TEAM_BASE_COLUMNS.empId },
    { ...IOM_MY_TEAM_BASE_COLUMNS.name },
    { ...IOM_MY_TEAM_BASE_COLUMNS.email },
    { ...IOM_MY_TEAM_BASE_COLUMNS.project },
    { ...IOM_MY_TEAM_BASE_COLUMNS.allocatedIomsCount },
    { ...IOM_MY_TEAM_BASE_COLUMNS.statusLabel },
    { ...IOM_MY_TEAM_BASE_COLUMNS.unavailableFrom },
    { ...IOM_MY_TEAM_BASE_COLUMNS.unavailableTo },
    { ...IOM_MY_TEAM_BASE_COLUMNS.action },
  ],
  filters: [IOM_MY_TEAM_BASE_FILTERS.status, IOM_MY_TEAM_BASE_FILTERS.project],
  actions: [IOM_MY_TEAM_BASE_ACTIONS.edit],
  canExport: true,
};

// Default role-based configuration for EOI module
export const ROLE_BASED_PERMISSIONS: RoleBasedConfig = {
  [ROLES.SuperAdmin]: {
    ...ADMIN_INCENTIVE_STACK_MODULES,
    ...ADMIN_ROLE_NAV_LIST_MODULES,
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },
        { ...BASE_COLUMNS.batchDate, visible: true },
        { ...BASE_COLUMNS.startTime, visible: true },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },
        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.sequenceId, visible: false },          // hide
        { ...BASE_COLUMNS.email, visible: false },               // hide
        { ...BASE_COLUMNS.countryCode, visible: false },         // hide
        { ...BASE_COLUMNS.mobile, visible: false },              // hide
        { ...BASE_COLUMNS.dob, visible: false },                 // hide
        { ...BASE_COLUMNS.occupation, visible: false },          // hide
        { ...BASE_COLUMNS.industry, visible: false },            // hide
        { ...BASE_COLUMNS.companyName, visible: false },         // hide
        { ...BASE_COLUMNS.designation, visible: false },         // hide
        { ...BASE_COLUMNS.annualIncome, visible: false },        // hide
        { ...BASE_COLUMNS.companyAddress, visible: false },      // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.customerAddress, visible: false },     // hide
        { ...BASE_COLUMNS.pinCode, visible: false },             // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },      // hide
        { ...BASE_COLUMNS.restoreReason, visible: false },       // hide
        { ...BASE_COLUMNS.actions, visible: true },
        // { ...BASE_COLUMNS.leadStatus, visible: false },
      ],
      filters: [...BASE_FILTERS, FILTERS.approvalStatus, FILTERS.deletionStatus, FILTERS.rmUsers, FILTERS.dateRange],
      actions: ADMIN_EOI_ACTIONS,
      canCreate: false,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: false,
        cancellations: true,
        approveUnit: true,
      },
    },
    approvalUnitList: {
      columns: APPROVAL_UNIT_TABLE_COLUMNS,
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    eoiManager: {
      columns: [
        { ...EOI_MANAGER_BASE_COLUMNS.campaignName },
        { ...EOI_MANAGER_BASE_COLUMNS.city },
        { ...EOI_MANAGER_BASE_COLUMNS.phaseLabel },
        { ...EOI_MANAGER_BASE_COLUMNS.countCollected },
        { ...EOI_MANAGER_BASE_COLUMNS.startDate },
        { ...EOI_MANAGER_BASE_COLUMNS.endDate },
        { ...EOI_MANAGER_BASE_COLUMNS.status },
        { ...EOI_MANAGER_BASE_COLUMNS.Action },
      ],
      filters: [EOI_MANAGER_BASE_FILTERS.projectStatus, EOI_MANAGER_BASE_FILTERS.city],
      actions: [EOI_MANAGER_BASE_ACTIONS.edit, EOI_MANAGER_BASE_ACTIONS.export, EOI_MANAGER_BASE_ACTIONS.createLeadsOnSFDC, EOI_MANAGER_BASE_ACTIONS.convertLeadsOnSFDC],
      canCreate: true,
    },
    channelPartners: {
      columns: [
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpType },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.campaignName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.noOfVouchers },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.voucherValue },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.amountCollected },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.lastCollectedDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdBy },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.status },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.actions },
      ],
      filters: [CHANNEL_PARTNERS_BASE_FILTERS.campaign, CHANNEL_PARTNERS_BASE_FILTERS.createdBy, CHANNEL_PARTNERS_BASE_FILTERS.cpType, CHANNEL_PARTNERS_BASE_FILTERS.dateRange,],
      actions: [CHANNEL_PARTNERS_BASE_ACTIONS.copyLink],
      canCreate: false,
      canExport: true,
    },
    bhkWiseSplit: {
      filters: [BHK_WISE_SPLIT_BASE_FILTERS.campaign, BHK_WISE_SPLIT_BASE_FILTERS.dateRange],
    },
    dailyTracker: {
      filters: [DAILY_TRACKER_BASE_FILTERS.campaign, DAILY_TRACKER_BASE_FILTERS.dateRange],
    },
    eoiLeaderboard: {
      columns: [
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cpName },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cpType },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.relationshipManager },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.campaignName },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.noOfVouchers },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.voucherValue },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.amountCollected },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.sourcingRm },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.userGroup },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.formLink },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.ffProgress },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cancellations },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.convertToBooking },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.lastCollectedDate },
      ],
      filters: [EOI_LEADERBOARD_BASE_FILTERS.campaign, EOI_LEADERBOARD_BASE_FILTERS.cpName, EOI_LEADERBOARD_BASE_FILTERS.rmName, EOI_LEADERBOARD_BASE_FILTERS.userGroup, EOI_LEADERBOARD_BASE_FILTERS.dateRange],
      actions: [],
      canCreate: true,
      canExport: true,
    },
    batchListing: {
      columns: [
        { ...BATCH_MANAGER_LIST_COLUMNS.batchName },
        { ...BATCH_MANAGER_LIST_COLUMNS.campaignName },
        { ...BATCH_MANAGER_LIST_COLUMNS.startDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.endDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotCount },
        { ...BATCH_MANAGER_LIST_COLUMNS.capacityPerSlot },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotDuration },
        { ...BATCH_MANAGER_LIST_COLUMNS.stage },
        { ...BATCH_MANAGER_LIST_COLUMNS.actions },
      ],
      filters: [],
      actions: [BATCH_LIST_ACTIONS.mapEois, BATCH_LIST_ACTIONS.notifyCx, BATCH_LIST_ACTIONS.editBatch, BATCH_LIST_ACTIONS.deleteBatch],
      canCreate: true,
    },
    batchSlotListing: {
      columns: BATCH_SLOT_LISTING_COLUMNS,
      filters: [],
      actions: [BATCH_PREVIEW_LISTING_ACTIONS.openBatch, BATCH_PREVIEW_LISTING_ACTIONS.lockBatch],
      canExport: true,
    },
    batchVoucherListing: {
      columns: [
        { ...BATCH_VOUCHER_LIST_COLUMNS.pridId },
        { ...BATCH_VOUCHER_LIST_COLUMNS.customerName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.closingRmName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status },
        { ...BATCH_VOUCHER_LIST_COLUMNS.action },
      ],
      filters: [],
      actions: [BATCH_VOUCHER_LIST_ACTIONS.moveTo, BATCH_VOUCHER_LIST_ACTIONS.notifyCx],
    },
    recentHistory: {
      columns: [
        { ...RECENT_HISTORY_BASE_COLUMNS.requestedDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.actionDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.about },
        { ...RECENT_HISTORY_BASE_COLUMNS.status },
        { ...RECENT_HISTORY_BASE_COLUMNS.expand },
      ],
    },
    // unit inventory listing
    unitInventory: {
      columns: [
        { ...UNIT_INVENTORY_BASE_COLUMNS.campaignName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.towerName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.floor },
        { ...UNIT_INVENTORY_BASE_COLUMNS.unitNumber },
        { ...UNIT_INVENTORY_BASE_COLUMNS.series },
        { ...UNIT_INVENTORY_BASE_COLUMNS.configuration },
        { ...UNIT_INVENTORY_BASE_COLUMNS.facing },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carParkType },
        { ...UNIT_INVENTORY_BASE_COLUMNS.noOfCarParks },
        { ...UNIT_INVENTORY_BASE_COLUMNS.areaSba },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carpetArea },
        { ...UNIT_INVENTORY_BASE_COLUMNS.agreementValue },
        { ...UNIT_INVENTORY_BASE_COLUMNS.status },
        { ...UNIT_INVENTORY_BASE_COLUMNS.action },
      ],
      filters: [UNIT_INVENTORY_BASE_FILTERS.campaign, UNIT_INVENTORY_BASE_FILTERS.tower, UNIT_INVENTORY_BASE_FILTERS.floor, UNIT_INVENTORY_BASE_FILTERS.series, UNIT_INVENTORY_BASE_FILTERS.configuration, UNIT_INVENTORY_BASE_FILTERS.facing, UNIT_INVENTORY_BASE_FILTERS.inventoryStatus],
      actions: [UNIT_INVENTORY_BASE_ACTIONS.updateStatus],
      canCreate: true,
      canExport: true,
      useTab: false,
    },
    // Bank Details Listing 
    bankDetails: {
      columns: [
        { ...BANK_DETAILS_BASE_COLUMNS.campaignname },
        { ...BANK_DETAILS_BASE_COLUMNS.accHolderName },
        { ...BANK_DETAILS_BASE_COLUMNS.bankName },
        { ...BANK_DETAILS_BASE_COLUMNS.accNumber },
        { ...BANK_DETAILS_BASE_COLUMNS.ifscCode },
        { ...BANK_DETAILS_BASE_COLUMNS.swiftCode },
        { ...BANK_DETAILS_BASE_COLUMNS.action },
      ],
      filters: [],
      actions: [BANK_DETAILS_BASE_ACTIONS.share],
    },
    sfdcLogs: {
      columns: SFDC_LOGS_COLUMNS,
      filters: SFDC_LOGS_FILTERS,
      actions: [SFDC_LOGS_BASE_ACTIONS.view],
      canExport: false,
      canRefresh: true,
    },
  },
  [ROLES.Admin]: {
    ...ADMIN_INCENTIVE_STACK_MODULES,
    ...ADMIN_ROLE_NAV_LIST_MODULES,
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },
        { ...BASE_COLUMNS.batchDate, visible: true },
        { ...BASE_COLUMNS.startTime, visible: true },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },
        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.sequenceId, visible: false },          // hide
        { ...BASE_COLUMNS.email, visible: false },               // hide
        { ...BASE_COLUMNS.countryCode, visible: false },         // hide
        { ...BASE_COLUMNS.mobile, visible: false },              // hide
        { ...BASE_COLUMNS.dob, visible: false },                 // hide
        { ...BASE_COLUMNS.occupation, visible: false },          // hide
        { ...BASE_COLUMNS.industry, visible: false },            // hide
        { ...BASE_COLUMNS.companyName, visible: false },         // hide
        { ...BASE_COLUMNS.designation, visible: false },         // hide
        { ...BASE_COLUMNS.annualIncome, visible: false },        // hide
        { ...BASE_COLUMNS.companyAddress, visible: false },      // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.customerAddress, visible: false },     // hide
        { ...BASE_COLUMNS.pinCode, visible: false },             // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },      // hide
        { ...BASE_COLUMNS.restoreReason, visible: false },       // hide
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.approvalStatus, FILTERS.deletionStatus, FILTERS.rmUsers, FILTERS.dateRange],
      actions: ADMIN_EOI_ACTIONS,
      canCreate: false,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: false,
        cancellations: true,
        approveUnit: true,
      },
    },
    approvalUnitList: {
      columns: APPROVAL_UNIT_TABLE_COLUMNS,
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    eoiManager: {
      columns: [
        { ...EOI_MANAGER_BASE_COLUMNS.campaignName },
        { ...EOI_MANAGER_BASE_COLUMNS.city },
        { ...EOI_MANAGER_BASE_COLUMNS.phaseLabel },
        { ...EOI_MANAGER_BASE_COLUMNS.countCollected },
        { ...EOI_MANAGER_BASE_COLUMNS.startDate },
        { ...EOI_MANAGER_BASE_COLUMNS.endDate },
        { ...EOI_MANAGER_BASE_COLUMNS.status },
        { ...EOI_MANAGER_BASE_COLUMNS.Action },
      ],
      filters: [EOI_MANAGER_BASE_FILTERS.projectStatus, EOI_MANAGER_BASE_FILTERS.city],
      actions: [EOI_MANAGER_BASE_ACTIONS.edit, EOI_MANAGER_BASE_ACTIONS.export, EOI_MANAGER_BASE_ACTIONS.createLeadsOnSFDC, EOI_MANAGER_BASE_ACTIONS.convertLeadsOnSFDC],
      canCreate: true,
    },
    channelPartners: {
      columns: [
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpType },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.campaignName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.noOfVouchers },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.voucherValue },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.amountCollected },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.lastCollectedDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdBy },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.status },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.actions },
      ],
      filters: [CHANNEL_PARTNERS_BASE_FILTERS.campaign, CHANNEL_PARTNERS_BASE_FILTERS.createdBy, CHANNEL_PARTNERS_BASE_FILTERS.cpType, CHANNEL_PARTNERS_BASE_FILTERS.dateRange,],
      actions: [CHANNEL_PARTNERS_BASE_ACTIONS.copyLink],
      canCreate: false,
      canExport: true,
    },
    bhkWiseSplit: {
      filters: [BHK_WISE_SPLIT_BASE_FILTERS.campaign, BHK_WISE_SPLIT_BASE_FILTERS.dateRange],
    },
    dailyTracker: {
      filters: [DAILY_TRACKER_BASE_FILTERS.campaign, DAILY_TRACKER_BASE_FILTERS.dateRange],
    },
    eoiLeaderboard: {
      columns: [
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cpName },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cpType },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.relationshipManager },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.campaignName },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.noOfVouchers },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.voucherValue },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.amountCollected },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.sourcingRm },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.userGroup },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.formLink },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.ffProgress },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cancellations },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.convertToBooking },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.lastCollectedDate },
      ],
      filters: [EOI_LEADERBOARD_BASE_FILTERS.campaign, EOI_LEADERBOARD_BASE_FILTERS.cpName, EOI_LEADERBOARD_BASE_FILTERS.rmName, EOI_LEADERBOARD_BASE_FILTERS.userGroup, EOI_LEADERBOARD_BASE_FILTERS.dateRange],
      actions: [],
      canCreate: true,
      canExport: true,
    },
    batchListing: {
      columns: [
        { ...BATCH_MANAGER_LIST_COLUMNS.batchName },
        { ...BATCH_MANAGER_LIST_COLUMNS.campaignName },
        { ...BATCH_MANAGER_LIST_COLUMNS.startDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.endDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotCount },
        { ...BATCH_MANAGER_LIST_COLUMNS.capacityPerSlot },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotDuration },
        { ...BATCH_MANAGER_LIST_COLUMNS.stage },
        { ...BATCH_MANAGER_LIST_COLUMNS.actions },
      ],
      filters: [],
      actions: [BATCH_LIST_ACTIONS.mapEois, BATCH_LIST_ACTIONS.notifyCx, BATCH_LIST_ACTIONS.editBatch, BATCH_LIST_ACTIONS.deleteBatch],
      canCreate: true,
    },
    batchSlotListing: {
      columns: BATCH_SLOT_LISTING_COLUMNS,
      filters: [],
      actions: [BATCH_PREVIEW_LISTING_ACTIONS.openBatch, BATCH_PREVIEW_LISTING_ACTIONS.lockBatch],
      canExport: true,
    },
    batchVoucherListing: {
      columns: [
        { ...BATCH_VOUCHER_LIST_COLUMNS.pridId },
        { ...BATCH_VOUCHER_LIST_COLUMNS.customerName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.closingRmName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status },
        { ...BATCH_VOUCHER_LIST_COLUMNS.action },
      ],
      filters: [],
      actions: [BATCH_VOUCHER_LIST_ACTIONS.moveTo, BATCH_VOUCHER_LIST_ACTIONS.notifyCx],
    },
    recentHistory: {
      columns: [
        { ...RECENT_HISTORY_BASE_COLUMNS.requestedDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.actionDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.about },
        { ...RECENT_HISTORY_BASE_COLUMNS.status },
        { ...RECENT_HISTORY_BASE_COLUMNS.expand },
      ],
    },
    // unit inventory listing
    unitInventory: {
      columns: [
        { ...UNIT_INVENTORY_BASE_COLUMNS.campaignName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.towerName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.floor },
        { ...UNIT_INVENTORY_BASE_COLUMNS.unitNumber },
        { ...UNIT_INVENTORY_BASE_COLUMNS.series },
        { ...UNIT_INVENTORY_BASE_COLUMNS.configuration },
        { ...UNIT_INVENTORY_BASE_COLUMNS.facing },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carParkType },
        { ...UNIT_INVENTORY_BASE_COLUMNS.noOfCarParks },
        { ...UNIT_INVENTORY_BASE_COLUMNS.areaSba },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carpetArea },
        { ...UNIT_INVENTORY_BASE_COLUMNS.agreementValue },
        { ...UNIT_INVENTORY_BASE_COLUMNS.status },
        { ...UNIT_INVENTORY_BASE_COLUMNS.action },
      ],
      filters: [UNIT_INVENTORY_BASE_FILTERS.campaign, UNIT_INVENTORY_BASE_FILTERS.tower, UNIT_INVENTORY_BASE_FILTERS.floor, UNIT_INVENTORY_BASE_FILTERS.series, UNIT_INVENTORY_BASE_FILTERS.configuration, UNIT_INVENTORY_BASE_FILTERS.facing, UNIT_INVENTORY_BASE_FILTERS.inventoryStatus],
      actions: [UNIT_INVENTORY_BASE_ACTIONS.updateStatus],
      canCreate: true,
      canExport: true,
      useTab: false,
    },
    // Bank Details Listing 
    bankDetails: {
      columns: [
        { ...BANK_DETAILS_BASE_COLUMNS.campaignname },
        { ...BANK_DETAILS_BASE_COLUMNS.accHolderName },
        { ...BANK_DETAILS_BASE_COLUMNS.bankName },
        { ...BANK_DETAILS_BASE_COLUMNS.accNumber },
        { ...BANK_DETAILS_BASE_COLUMNS.ifscCode },
        { ...BANK_DETAILS_BASE_COLUMNS.swiftCode },
        { ...BANK_DETAILS_BASE_COLUMNS.action },
      ],
      filters: [],
      actions: [BANK_DETAILS_BASE_ACTIONS.share]
    }
  },
  [ROLES.RM]: {
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },      
        { ...BASE_COLUMNS.batchDate, visible: true },      
        { ...BASE_COLUMNS.startTime, visible: true },      
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },      

        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.dob, visible: false },                 // hide
        { ...BASE_COLUMNS.occupation, visible: false },          // hide
        { ...BASE_COLUMNS.industry, visible: false },            // hide
        { ...BASE_COLUMNS.companyName, visible: false },         // hide
        { ...BASE_COLUMNS.designation, visible: false },         // hide
        { ...BASE_COLUMNS.annualIncome, visible: false },        // hide
        { ...BASE_COLUMNS.companyAddress, visible: false },      // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.customerAddress, visible: false },     // hide
        { ...BASE_COLUMNS.pinCode, visible: false },             // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },      // hide
        { ...BASE_COLUMNS.restoreReason, visible: false },       // hide
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.approvalStatus, FILTERS.rmUsers, FILTERS.dateRange],
      actions: RM_ACTIONS,
      canCreate: true,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: true,
        cancellations: true,
        approveUnit: true,
      },
    },
    approvalUnitList: {
      columns: hideActionsColumn(APPROVAL_UNIT_TABLE_COLUMNS),
    },
    recentHistory: {
      columns: [
        { ...RECENT_HISTORY_BASE_COLUMNS.requestedDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.actionDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.about },
        { ...RECENT_HISTORY_BASE_COLUMNS.status },
        { ...RECENT_HISTORY_BASE_COLUMNS.expand },
      ],
    },
    // EOI Records change source request history table columns
    ChangeSourceRecentHistory: {
      columns: [
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.requestedDate },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.reviewedDate },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.changeReason },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.reviewerRemark },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.status },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.expand },
      ],
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    bhkWiseSplit: {
      filters: [BHK_WISE_SPLIT_BASE_FILTERS.campaign, BHK_WISE_SPLIT_BASE_FILTERS.dateRange],
    },
    dailyTracker: {
      filters: [DAILY_TRACKER_BASE_FILTERS.campaign, DAILY_TRACKER_BASE_FILTERS.dateRange],
    },
    channelPartners: {
      columns: [
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpType },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.campaignName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.noOfVouchers },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.voucherValue },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.amountCollected },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.lastCollectedDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdBy },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.status },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.actions },
      ],
      filters: [CHANNEL_PARTNERS_BASE_FILTERS.campaign, CHANNEL_PARTNERS_BASE_FILTERS.createdBy, CHANNEL_PARTNERS_BASE_FILTERS.cpType, CHANNEL_PARTNERS_BASE_FILTERS.dateRange],
      actions: [CHANNEL_PARTNERS_BASE_ACTIONS.copyLink],
      canCreate: true,
      canExport: true,
    },
    eoiLeaderboard: {
      columns: [
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cpName },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cpType },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.relationshipManager },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.campaignName },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.noOfVouchers },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.voucherValue },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.amountCollected },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.sourcingRm },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.userGroup },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.ffProgress },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.formLink },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.cancellations },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.convertToBooking },
        { ...EOI_LEADERBOARD_BASE_COLUMNS.lastCollectedDate },
      ],
      filters: [EOI_LEADERBOARD_BASE_FILTERS.campaign, EOI_LEADERBOARD_BASE_FILTERS.cpName, EOI_LEADERBOARD_BASE_FILTERS.rmName, EOI_LEADERBOARD_BASE_FILTERS.userGroup, EOI_LEADERBOARD_BASE_FILTERS.dateRange],
      actions: [],
      canCreate: true,
      canExport: true,
    },
    unitInventory: {
      columns: [
        { ...UNIT_INVENTORY_BASE_COLUMNS.campaignName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.towerName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.floor },
        { ...UNIT_INVENTORY_BASE_COLUMNS.unitNumber },
        { ...UNIT_INVENTORY_BASE_COLUMNS.series },
        { ...UNIT_INVENTORY_BASE_COLUMNS.configuration },
        { ...UNIT_INVENTORY_BASE_COLUMNS.facing },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carParkType },
        { ...UNIT_INVENTORY_BASE_COLUMNS.noOfCarParks },
        { ...UNIT_INVENTORY_BASE_COLUMNS.areaSba },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carpetArea },
        { ...UNIT_INVENTORY_BASE_COLUMNS.agreementValue },
        { ...UNIT_INVENTORY_BASE_COLUMNS.status },
        { ...UNIT_INVENTORY_BASE_COLUMNS.action },
      ],
      filters: [UNIT_INVENTORY_BASE_FILTERS.campaign, UNIT_INVENTORY_BASE_FILTERS.tower, UNIT_INVENTORY_BASE_FILTERS.floor, UNIT_INVENTORY_BASE_FILTERS.series, UNIT_INVENTORY_BASE_FILTERS.configuration, UNIT_INVENTORY_BASE_FILTERS.facing, UNIT_INVENTORY_BASE_FILTERS.inventoryStatus],
      actions: [UNIT_INVENTORY_BASE_ACTIONS.mapUnitToVoucher],
      canCreate: false,
      canExport: false,
      useTab: true,
      unitInventoryTabs: { listView: true, towerView: true },
    },
    // Bank Details Listing 
    bankDetails: {
      columns: [
        { ...BANK_DETAILS_BASE_COLUMNS.campaignname },
        { ...BANK_DETAILS_BASE_COLUMNS.accHolderName },
        { ...BANK_DETAILS_BASE_COLUMNS.bankName },
        { ...BANK_DETAILS_BASE_COLUMNS.accNumber },
        { ...BANK_DETAILS_BASE_COLUMNS.ifscCode },
        { ...BANK_DETAILS_BASE_COLUMNS.swiftCode },
        { ...BANK_DETAILS_BASE_COLUMNS.action },
      ],
      filters: [],
      actions: [BANK_DETAILS_BASE_ACTIONS.share]
    },
    batchManager: {
      columns: BATCH_MANAGER_PREVIEW_GRID_COLUMNS,
      filters: [],
      actions: BATCH_MANAGER_PREVIEW_DEFAULT_ACTIONS,
      canCreate: true,
      canExport: true,
    },
    agreementManagement: {
      columns: [
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.projectName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.opportunityId },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.unitNo },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.applicantName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.numberOfApplicants },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentType },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentStatus },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.sentDate },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.signedAt },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.Action },
      ],
      filters: AGREEMENT_MANAGEMENT_ROLE_BASED_FILTERS,
      actions: [
        AGREEMENT_MANAGEMENT_ACTIONS.edit,
        AGREEMENT_MANAGEMENT_ACTIONS.download,
        AGREEMENT_MANAGEMENT_ACTIONS.viewLink,
      ],
      canCreate: true,
      canExport: false,
    },
  },
  [ROLES.FinanceAdmin]: {
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22

        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: FINANCE_FILTERS,
      actions: FINANCE_ACTIONS,
      canCreate: false,
      canExport: true,
    },
    financeRecordDetails: {
      columns: FINANCE_RECORD_DETAILS_COLUMNS,
      filters: [],
      actions: [],
      canCreate: false,
      canExport: true,
    },
  },
  [ROLES.MIS]: {
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },      
        { ...BASE_COLUMNS.batchDate, visible: true },      
        { ...BASE_COLUMNS.startTime, visible: true },      
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },

        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.sequenceId, visible: false },          // hide
        { ...BASE_COLUMNS.email, visible: false },               // hide
        { ...BASE_COLUMNS.countryCode, visible: false },         // hide
        { ...BASE_COLUMNS.mobile, visible: false },              // hide
        { ...BASE_COLUMNS.dob, visible: false },                 // hide
        { ...BASE_COLUMNS.occupation, visible: false },          // hide
        { ...BASE_COLUMNS.industry, visible: false },            // hide
        { ...BASE_COLUMNS.companyName, visible: false },         // hide
        { ...BASE_COLUMNS.designation, visible: false },         // hide
        { ...BASE_COLUMNS.annualIncome, visible: false },        // hide
        { ...BASE_COLUMNS.companyAddress, visible: false },      // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.customerAddress, visible: false },     // hide
        { ...BASE_COLUMNS.pinCode, visible: false },             // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },      // hide
        { ...BASE_COLUMNS.restoreReason, visible: false },       // hide
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.rmUsers],
      actions: MIS_ACTIONS,
      canCreate: false,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: true,
        cancellations: true,
        approveUnit: false,
      },
    },
    eoiManager: {
      columns: [
        { ...EOI_MANAGER_BASE_COLUMNS.campaignName },
        { ...EOI_MANAGER_BASE_COLUMNS.city },
        { ...EOI_MANAGER_BASE_COLUMNS.phaseLabel },
        { ...EOI_MANAGER_BASE_COLUMNS.countCollected },
        { ...EOI_MANAGER_BASE_COLUMNS.startDate },
        { ...EOI_MANAGER_BASE_COLUMNS.endDate },
        { ...EOI_MANAGER_BASE_COLUMNS.status },
        { ...EOI_MANAGER_BASE_COLUMNS.Action },
      ],
      filters: [EOI_MANAGER_BASE_FILTERS.projectStatus, EOI_MANAGER_BASE_FILTERS.city],
      actions: [EOI_MANAGER_BASE_ACTIONS.edit, EOI_MANAGER_BASE_ACTIONS.export],
      canCreate: true,
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    bhkWiseSplit: {
      filters: [BHK_WISE_SPLIT_BASE_FILTERS.campaign, BHK_WISE_SPLIT_BASE_FILTERS.dateRange],
    },
    dailyTracker: {
      filters: [DAILY_TRACKER_BASE_FILTERS.campaign, DAILY_TRACKER_BASE_FILTERS.dateRange],
    },
    // EOI Records change source request history table columns
    ChangeSourceRecentHistory: {
      columns: [
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.requestedDate },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.reviewedDate },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.changeReason },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.reviewerRemark },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.status },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.expand },
      ],
    },
    unitInventory: {
      columns: [
        { ...UNIT_INVENTORY_BASE_COLUMNS.campaignName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.towerName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.floor },
        { ...UNIT_INVENTORY_BASE_COLUMNS.unitNumber },
        { ...UNIT_INVENTORY_BASE_COLUMNS.series },
        { ...UNIT_INVENTORY_BASE_COLUMNS.configuration },
        { ...UNIT_INVENTORY_BASE_COLUMNS.facing },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carParkType },
        { ...UNIT_INVENTORY_BASE_COLUMNS.noOfCarParks },
        { ...UNIT_INVENTORY_BASE_COLUMNS.areaSba },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carpetArea },
        { ...UNIT_INVENTORY_BASE_COLUMNS.agreementValue },
        { ...UNIT_INVENTORY_BASE_COLUMNS.status },
        { ...UNIT_INVENTORY_BASE_COLUMNS.action },
      ],
      filters: [UNIT_INVENTORY_BASE_FILTERS.campaign, UNIT_INVENTORY_BASE_FILTERS.tower, UNIT_INVENTORY_BASE_FILTERS.floor, UNIT_INVENTORY_BASE_FILTERS.series, UNIT_INVENTORY_BASE_FILTERS.configuration, UNIT_INVENTORY_BASE_FILTERS.facing, UNIT_INVENTORY_BASE_FILTERS.inventoryStatus],
      actions: [UNIT_INVENTORY_BASE_ACTIONS.updateStatus],
      canExport: true,
      canCreate: true,
      useTab: false,
    },
    batchListing: {
      columns: [
        { ...BATCH_MANAGER_LIST_COLUMNS.batchName },
        { ...BATCH_MANAGER_LIST_COLUMNS.campaignName },
        { ...BATCH_MANAGER_LIST_COLUMNS.startDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.endDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotCount },
        { ...BATCH_MANAGER_LIST_COLUMNS.capacityPerSlot },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotDuration },
        { ...BATCH_MANAGER_LIST_COLUMNS.stage },
      ],
      filters: [],
      actions: [],

    },
    batchSlotListing: {
      columns: hideActionsColumn(BATCH_SLOT_LISTING_COLUMNS),
      filters: [],
      actions: [],
      canExport: true,
    },
    batchVoucherListing: {
      columns: [
        { ...BATCH_VOUCHER_LIST_COLUMNS.pridId },
        { ...BATCH_VOUCHER_LIST_COLUMNS.customerName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.closingRmName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status },
      ],
      filters: [],
      actions: [],
    },
  },
  [ROLES.SALES_BH]: {
    eoi: {
      columns: [
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },
        { ...BASE_COLUMNS.paidVoucherId, visible: true },
        { ...BASE_COLUMNS.stdEoiId, visible: true },
        { ...BASE_COLUMNS.preEoiId, visible: true },
        { ...BASE_COLUMNS.prefillBookingForm, visible: true },
        { ...BASE_COLUMNS.preferredUnit, visible: true },
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },
        { ...BASE_COLUMNS.opportunityId, visible: true },
        { ...BASE_COLUMNS.customerQueueId, visible: false },
        { ...BASE_COLUMNS.sequenceId, visible: false },
        { ...BASE_COLUMNS.customerName, visible: true },
        { ...BASE_COLUMNS.email, visible: false },
        { ...BASE_COLUMNS.mobile, visible: false },
        { ...BASE_COLUMNS.campaignName, visible: true },
        { ...BASE_COLUMNS.primarySource, visible: true },
        { ...BASE_COLUMNS.cpName, visible: true },
        { ...BASE_COLUMNS.referrerName, visible: true },
        { ...BASE_COLUMNS.referrerProjectName, visible: true },
        { ...BASE_COLUMNS.referrerUnitNo, visible: true },
        { ...BASE_COLUMNS.typologyPreference, visible: true },
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.voucherCount, visible: true },
        // { ...BASE_COLUMNS.leadStatus, visible: false },
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },
        { ...BASE_COLUMNS.formStatus, visible: true },
        { ...BASE_COLUMNS.paymentStatus, visible: true },
        { ...BASE_COLUMNS.financeStatus, visible: true },
        { ...BASE_COLUMNS.createdAt, visible: true },
        { ...BASE_COLUMNS.sourcingRm, visible: true },
        { ...BASE_COLUMNS.closingRm, visible: true },
        { ...BASE_COLUMNS.amountPaid, visible: true },
        { ...BASE_COLUMNS.finalPaidDate, visible: true },
        { ...BASE_COLUMNS.chronology, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },
        { ...BASE_COLUMNS.restoreReason, visible: false },
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.approvalStatus, FILTERS.rmUsers],
      actions: [...SALES_ACTIONS, { ...ACTIONS.approveUnit, approveUnitTabOnly: true }],
      canCreate: false,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: false,
        cancellations: false,
        approveUnit: true,
      },
    },
    approvalUnitList: {
      columns: APPROVAL_UNIT_TABLE_COLUMNS,
    },
  },
  [ROLES.BIS]: {
    ...BIS_INCENTIVE_STACK_VIEW_ONLY,
    ...BIS_MASTER_LIST_VIEW_ONLY,
    eoi: {
      columns: [
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },
        { ...BASE_COLUMNS.paidVoucherId, visible: true },
        { ...BASE_COLUMNS.stdEoiId, visible: true },
        { ...BASE_COLUMNS.preEoiId, visible: true },
        { ...BASE_COLUMNS.prefillBookingForm, visible: true },
        { ...BASE_COLUMNS.preferredUnit, visible: true },
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },
        { ...BASE_COLUMNS.opportunityId, visible: true },
        { ...BASE_COLUMNS.customerQueueId, visible: false },
        { ...BASE_COLUMNS.sequenceId, visible: false },
        { ...BASE_COLUMNS.customerName, visible: true },
        { ...BASE_COLUMNS.email, visible: false },
        { ...BASE_COLUMNS.mobile, visible: false },
        { ...BASE_COLUMNS.campaignName, visible: true },
        { ...BASE_COLUMNS.primarySource, visible: true },
        { ...BASE_COLUMNS.cpName, visible: true },
        { ...BASE_COLUMNS.referrerName, visible: true },
        { ...BASE_COLUMNS.referrerProjectName, visible: true },
        { ...BASE_COLUMNS.referrerUnitNo, visible: true },
        { ...BASE_COLUMNS.typologyPreference, visible: true },
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.voucherCount, visible: true },
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },
        { ...BASE_COLUMNS.formStatus, visible: true },
        { ...BASE_COLUMNS.paymentStatus, visible: true },
        { ...BASE_COLUMNS.financeStatus, visible: true },
        { ...BASE_COLUMNS.createdAt, visible: true },
        { ...BASE_COLUMNS.sourcingRm, visible: true },
        { ...BASE_COLUMNS.closingRm, visible: true },
        { ...BASE_COLUMNS.amountPaid, visible: true },
        { ...BASE_COLUMNS.finalPaidDate, visible: true },
        { ...BASE_COLUMNS.chronology, visible: false },
        { ...BASE_COLUMNS.requestedDate, visible: true },
        { ...BASE_COLUMNS.reviewDate, visible: true },
        { ...BASE_COLUMNS.sourceChangeStatus, visible: true },
        { ...BASE_COLUMNS.deletionReason, visible: false },
        { ...BASE_COLUMNS.restoreReason, visible: false },
        { ...BASE_COLUMNS.batchName, visible: true },      
        { ...BASE_COLUMNS.batchDate, visible: true },      
        { ...BASE_COLUMNS.startTime, visible: true },      
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.dateRange],
      actions: BIS_EOI_ACTIONS,
      canCreate: false,
      canExport: false,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: true,
        cancellations: true,
        approveUnit: false,
      },
    },
    financeRecordDetails: {
      columns: hideActionsColumn(FINANCE_RECORD_DETAILS_COLUMNS),
      filters: [],
      actions: [],
      canCreate: false,
      canExport: false,
    },
    recentHistory: {
      columns: [
        { ...RECENT_HISTORY_BASE_COLUMNS.requestedDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.actionDate },
        { ...RECENT_HISTORY_BASE_COLUMNS.about },
        { ...RECENT_HISTORY_BASE_COLUMNS.status },
        { ...RECENT_HISTORY_BASE_COLUMNS.expand },
      ],
    },
    ChangeSourceRecentHistory: {
      columns: [
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.requestedDate },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.reviewedDate },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.changeReason },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.reviewerRemark },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.status },
        { ...CHANGE_SOURCE_RECENT_HISTORY_BASE_COLUMNS.expand },
      ],
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: false,
    },
    unitInventory: {
      columns: [
        { ...UNIT_INVENTORY_BASE_COLUMNS.campaignName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.towerName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.floor },
        { ...UNIT_INVENTORY_BASE_COLUMNS.unitNumber },
        { ...UNIT_INVENTORY_BASE_COLUMNS.series },
        { ...UNIT_INVENTORY_BASE_COLUMNS.configuration },
        { ...UNIT_INVENTORY_BASE_COLUMNS.facing },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carParkType },
        { ...UNIT_INVENTORY_BASE_COLUMNS.noOfCarParks },
        { ...UNIT_INVENTORY_BASE_COLUMNS.areaSba },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carpetArea },
        { ...UNIT_INVENTORY_BASE_COLUMNS.agreementValue },
        { ...UNIT_INVENTORY_BASE_COLUMNS.status },
        { ...UNIT_INVENTORY_BASE_COLUMNS.action },
      ],
      filters: [UNIT_INVENTORY_BASE_FILTERS.campaign, UNIT_INVENTORY_BASE_FILTERS.tower, UNIT_INVENTORY_BASE_FILTERS.floor, UNIT_INVENTORY_BASE_FILTERS.series, UNIT_INVENTORY_BASE_FILTERS.configuration, UNIT_INVENTORY_BASE_FILTERS.facing, UNIT_INVENTORY_BASE_FILTERS.inventoryStatus],
      actions: [UNIT_INVENTORY_BASE_ACTIONS.updateStatus],
      canCreate: true,
      canExport: true,
      useTab: false,
    },
    batchListing: {
      columns: [
        { ...BATCH_MANAGER_LIST_COLUMNS.batchName },
        { ...BATCH_MANAGER_LIST_COLUMNS.campaignName },
        { ...BATCH_MANAGER_LIST_COLUMNS.startDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.endDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotCount },
        { ...BATCH_MANAGER_LIST_COLUMNS.capacityPerSlot },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotDuration },
        { ...BATCH_MANAGER_LIST_COLUMNS.stage },
      ],
      filters: [],
      actions: [],

    },
    batchSlotListing: {
      columns: hideActionsColumn(BATCH_SLOT_LISTING_COLUMNS),
      filters: [],
      actions: [],
      canExport: true,
    },
    batchVoucherListing: {
      columns: [
        { ...BATCH_VOUCHER_LIST_COLUMNS.pridId },
        { ...BATCH_VOUCHER_LIST_COLUMNS.customerName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.closingRmName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status },
      ],
      filters: [],
      actions: [],
    },
  },
  [ROLES.PROJECT_HEAD]: {
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },      
        { ...BASE_COLUMNS.batchDate, visible: true },      
        { ...BASE_COLUMNS.startTime, visible: true },      
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },

        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.sequenceId, visible: false },          // hide
        { ...BASE_COLUMNS.dob, visible: false },                 // hide
        { ...BASE_COLUMNS.occupation, visible: false },          // hide
        { ...BASE_COLUMNS.industry, visible: false },            // hide
        { ...BASE_COLUMNS.companyName, visible: false },         // hide
        { ...BASE_COLUMNS.designation, visible: false },         // hide
        { ...BASE_COLUMNS.annualIncome, visible: false },        // hide
        { ...BASE_COLUMNS.companyAddress, visible: false },      // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.customerAddress, visible: false },     // hide
        { ...BASE_COLUMNS.pinCode, visible: false },             // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },      // hide
        { ...BASE_COLUMNS.restoreReason, visible: false },       // hide
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.approvalStatus, FILTERS.rmUsers],
      actions: [
        ...PROJECT_HEAD,
        { ...ACTIONS.editEOI, visible: (row: any) => !!row?.hasBuddyRMPermission },
        { ...ACTIONS.manageSfdcOpportunity, visible: (row: any) => !!row?.hasBuddyRMPermission },
        { ...ACTIONS.mapAndConvertEOI, visible: (row: any) => (Boolean(row?.opportunityId) || Boolean(row?.preferredUnit)) && !!row?.hasBuddyRMPermission },
        { ...ACTIONS.approveUnit, approveUnitTabOnly: true }
      ],
      canCreate: false,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: false,
        cancellations: true,
        approveUnit: true,
      },
    },
    approvalUnitList: {
      columns: APPROVAL_UNIT_TABLE_COLUMNS,
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    bhkWiseSplit: {
      filters: [BHK_WISE_SPLIT_BASE_FILTERS.campaign, BHK_WISE_SPLIT_BASE_FILTERS.dateRange],
    },
    dailyTracker: {
      filters: [DAILY_TRACKER_BASE_FILTERS.campaign, DAILY_TRACKER_BASE_FILTERS.dateRange],
    },
    bankDetails: {
      columns: [
        { ...BANK_DETAILS_BASE_COLUMNS.campaignname },
        { ...BANK_DETAILS_BASE_COLUMNS.accHolderName },
        { ...BANK_DETAILS_BASE_COLUMNS.bankName },
        { ...BANK_DETAILS_BASE_COLUMNS.accNumber },
        { ...BANK_DETAILS_BASE_COLUMNS.ifscCode },
        { ...BANK_DETAILS_BASE_COLUMNS.swiftCode },
        { ...BANK_DETAILS_BASE_COLUMNS.action },
      ],
      filters: [],
      actions: [BANK_DETAILS_BASE_ACTIONS.share]
    },
    unitInventory: {
      columns: [
        { ...UNIT_INVENTORY_BASE_COLUMNS.campaignName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.towerName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.floor },
        { ...UNIT_INVENTORY_BASE_COLUMNS.unitNumber },
        { ...UNIT_INVENTORY_BASE_COLUMNS.series },
        { ...UNIT_INVENTORY_BASE_COLUMNS.configuration },
        { ...UNIT_INVENTORY_BASE_COLUMNS.facing },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carParkType },
        { ...UNIT_INVENTORY_BASE_COLUMNS.noOfCarParks },
        { ...UNIT_INVENTORY_BASE_COLUMNS.areaSba },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carpetArea },
        { ...UNIT_INVENTORY_BASE_COLUMNS.agreementValue },
        { ...UNIT_INVENTORY_BASE_COLUMNS.status },
        { ...UNIT_INVENTORY_BASE_COLUMNS.action },
      ],
      filters: [UNIT_INVENTORY_BASE_FILTERS.campaign, UNIT_INVENTORY_BASE_FILTERS.tower, UNIT_INVENTORY_BASE_FILTERS.floor, UNIT_INVENTORY_BASE_FILTERS.series, UNIT_INVENTORY_BASE_FILTERS.configuration, UNIT_INVENTORY_BASE_FILTERS.facing, UNIT_INVENTORY_BASE_FILTERS.inventoryStatus],
      actions: [UNIT_INVENTORY_BASE_ACTIONS.updateStatus],
      canCreate: false,
      canExport: false,
      useTab: true,
    },
    agreementManagement: {
      columns: [
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.projectName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.opportunityId },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.unitNo },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.applicantName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.numberOfApplicants },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentType },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentStatus },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.sentDate },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.signedAt },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.Action },
      ],
      filters: AGREEMENT_MANAGEMENT_ROLE_BASED_FILTERS,
      actions: [
        AGREEMENT_MANAGEMENT_ACTIONS.edit,
        AGREEMENT_MANAGEMENT_ACTIONS.download,
        AGREEMENT_MANAGEMENT_ACTIONS.viewLink,
      ],
      canCreate: true,
      canExport: false,
    },
  },
  [ROLES.CRM]: {
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },      
        { ...BASE_COLUMNS.batchDate, visible: true },      
        { ...BASE_COLUMNS.startTime, visible: true },      
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },

        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.sequenceId, visible: false },          // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.rmUsers],
      actions: CRM_ACTIONS,
      canCreate: false,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: false,
        cancellations: true,
        approveUnit: false,
      },
    },
    financeRecordDetails: {
      columns: FINANCE_RECORD_DETAILS_COLUMNS,
      filters: [],
      actions: [],
      canCreate: false,
      canExport: false,
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    bhkWiseSplit: {
      filters: [BHK_WISE_SPLIT_BASE_FILTERS.campaign, BHK_WISE_SPLIT_BASE_FILTERS.dateRange],
    },
    dailyTracker: {
      filters: [DAILY_TRACKER_BASE_FILTERS.campaign, DAILY_TRACKER_BASE_FILTERS.dateRange],
    },
    batchListing: {
      columns: [
        { ...BATCH_MANAGER_LIST_COLUMNS.batchName },
        { ...BATCH_MANAGER_LIST_COLUMNS.campaignName },
        { ...BATCH_MANAGER_LIST_COLUMNS.startDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.endDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotCount },
        { ...BATCH_MANAGER_LIST_COLUMNS.capacityPerSlot },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotDuration },
        { ...BATCH_MANAGER_LIST_COLUMNS.stage },
      ],
      filters: [],
      actions: [],

    },
    batchSlotListing: {
      columns: hideActionsColumn(BATCH_SLOT_LISTING_COLUMNS),
      filters: [],
      actions: [],
      canExport: true,
    },
    batchVoucherListing: {
      columns: [
        { ...BATCH_VOUCHER_LIST_COLUMNS.pridId },
        { ...BATCH_VOUCHER_LIST_COLUMNS.customerName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.closingRmName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status },
      ],
      filters: [],
      actions: [],
    },
    agreementManagement: {
      columns: [
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.projectName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.opportunityId },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.unitNo },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.applicantName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.numberOfApplicants },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentType },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentStatus },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.sentDate },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.signedAt },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.internalSignatory },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.internalSignatorySignature },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.rmName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.Action },
      ],
      filters: AGREEMENT_MANAGEMENT_BASE_FILTERS,
      actions: [
        AGREEMENT_MANAGEMENT_ACTIONS.signNow,
        AGREEMENT_MANAGEMENT_ACTIONS.edit,
        AGREEMENT_MANAGEMENT_ACTIONS.download,
        AGREEMENT_MANAGEMENT_ACTIONS.viewLink,
      ],
      canCreate: true,
      canExport: true,
    },
    iomManagement: {
      ...IOM_MANAGEMENT_DEFAULT,
      canRefresh: true,
    },
  },
  [ROLES.SALES_RSH]: {
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },      
        { ...BASE_COLUMNS.batchDate, visible: true },      
        { ...BASE_COLUMNS.startTime, visible: true },      
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },

        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.sequenceId, visible: false },          // hide
        { ...BASE_COLUMNS.dob, visible: false },                 // hide
        { ...BASE_COLUMNS.occupation, visible: false },          // hide
        { ...BASE_COLUMNS.industry, visible: false },            // hide
        { ...BASE_COLUMNS.companyName, visible: false },         // hide
        { ...BASE_COLUMNS.designation, visible: false },         // hide
        { ...BASE_COLUMNS.annualIncome, visible: false },        // hide
        { ...BASE_COLUMNS.companyAddress, visible: false },      // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.customerAddress, visible: false },     // hide
        { ...BASE_COLUMNS.pinCode, visible: false },             // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },      // hide
        { ...BASE_COLUMNS.restoreReason, visible: false },       // hide
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.approvalStatus, FILTERS.rmUsers, FILTERS.dateRange],
      actions: [...SALES_RSH_ACTIONS, { ...ACTIONS.approveUnit, approveUnitTabOnly: true }],
      canCreate: false,
      canExport: true,
      useTab: true,
      eoiRecordsTabs: {
        changeRequest: false,
        cancellations: true,
        approveUnit: true,
      },
    },
    approvalUnitList: {
      columns: APPROVAL_UNIT_TABLE_COLUMNS,
    },
    channelPartners: {
      columns: [
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpType },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.campaignName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.noOfVouchers },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.voucherValue },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.amountCollected },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.lastCollectedDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdBy },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.status },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.actions },
      ],
      filters: [CHANNEL_PARTNERS_BASE_FILTERS.campaign, CHANNEL_PARTNERS_BASE_FILTERS.createdBy, CHANNEL_PARTNERS_BASE_FILTERS.cpType, CHANNEL_PARTNERS_BASE_FILTERS.dateRange],
      actions: [CHANNEL_PARTNERS_BASE_ACTIONS.copyLink],
      canCreate: false,
      canExport: true,
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    // Bank details
    bankDetails: {
      columns: [
        { ...BANK_DETAILS_BASE_COLUMNS.campaignname },
        { ...BANK_DETAILS_BASE_COLUMNS.accHolderName },
        { ...BANK_DETAILS_BASE_COLUMNS.bankName },
        { ...BANK_DETAILS_BASE_COLUMNS.accNumber },
        { ...BANK_DETAILS_BASE_COLUMNS.ifscCode },
        { ...BANK_DETAILS_BASE_COLUMNS.swiftCode },
        { ...BANK_DETAILS_BASE_COLUMNS.action },
      ],
      filters: [],
      actions: [BANK_DETAILS_BASE_ACTIONS.share]
    },
    batchListing: {
      columns: [
        { ...BATCH_MANAGER_LIST_COLUMNS.batchName },
        { ...BATCH_MANAGER_LIST_COLUMNS.campaignName },
        { ...BATCH_MANAGER_LIST_COLUMNS.startDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.endDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotCount },
        { ...BATCH_MANAGER_LIST_COLUMNS.capacityPerSlot },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotDuration },
        { ...BATCH_MANAGER_LIST_COLUMNS.stage },
      ],
      filters: [],
      actions: [],

    },
    batchSlotListing: {
      columns: hideActionsColumn(BATCH_SLOT_LISTING_COLUMNS),
      filters: [],
      actions: [],
      canExport: true,
    },
    batchVoucherListing: {
      columns: [
        { ...BATCH_VOUCHER_LIST_COLUMNS.pridId },
        { ...BATCH_VOUCHER_LIST_COLUMNS.customerName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.closingRmName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status },
      ],
      filters: [],
      actions: [],
    },
    agreementManagement: {
      columns: [
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.projectName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.opportunityId },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.unitNo },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.applicantName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.numberOfApplicants },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentType },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentStatus },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.sentDate },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.signedAt },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.Action },
      ],
      filters: AGREEMENT_MANAGEMENT_ROLE_BASED_FILTERS,
      actions: [
        AGREEMENT_MANAGEMENT_ACTIONS.edit,
        AGREEMENT_MANAGEMENT_ACTIONS.download,
        AGREEMENT_MANAGEMENT_ACTIONS.viewLink,
      ],
      canCreate: true,
      canExport: false,
    },
  },
  [ROLES.SALES_TL]: {
    eoi: {
      columns: [
        // Ordered columns
        { ...BASE_COLUMNS.uniqueReferenceId, visible: true },    // 1
        { ...BASE_COLUMNS.paidVoucherId, visible: true },          // 2
        { ...BASE_COLUMNS.sfdcEnquiryId, visible: true },          // 3
        { ...BASE_COLUMNS.sfdcLeadStatus, visible: true },         // 4
        { ...BASE_COLUMNS.customerName, visible: true },         // 5
        { ...BASE_COLUMNS.campaignName, visible: true },         // 6
        { ...BASE_COLUMNS.primarySource, visible: true },        // 7
        { ...BASE_COLUMNS.cpName, visible: true },               // 8
        { ...BASE_COLUMNS.referrerName, visible: true },         // 9
        { ...BASE_COLUMNS.typologyPreference, visible: true },   // 10
        { ...BASE_COLUMNS.voucherCount, visible: true },         // 11
        { ...BASE_COLUMNS.formStatus, visible: true },           // 12
        { ...BASE_COLUMNS.paymentStatus, visible: true },        // 13
        { ...BASE_COLUMNS.financeStatus, visible: true },        // 14
        { ...BASE_COLUMNS.checkerRemarks, visible: true },       // 15
        { ...BASE_COLUMNS.amountPayable, visible: true },        // 16
        { ...BASE_COLUMNS.amountPaid, visible: true },           // 17
        { ...BASE_COLUMNS.sourcingRm, visible: true },           // 18
        { ...BASE_COLUMNS.closingRm, visible: true },            // 19
        { ...BASE_COLUMNS.createdAt, visible: true },            // 20
        { ...BASE_COLUMNS.finalPaidDate, visible: true },        // 21
        { ...BASE_COLUMNS.chronology, visible: true },           // 22
        { ...BASE_COLUMNS.opportunityId, visible: true },          // 23
        { ...BASE_COLUMNS.preferredUnit, visible: true },        // 24
        { ...BASE_COLUMNS.preEoiId, visible: true },             // 25
        { ...BASE_COLUMNS.stdEoiId, visible: true },             // 26
        { ...BASE_COLUMNS.typologyPrefEoi, visible: true },      // 27
        { ...BASE_COLUMNS.batchName, visible: true },      
        { ...BASE_COLUMNS.batchDate, visible: true },      
        { ...BASE_COLUMNS.startTime, visible: true },      
        { ...BATCH_VOUCHER_LIST_COLUMNS.status, visible: true },

        { ...BASE_COLUMNS.prefillBookingForm, visible: false },  // hide
        { ...BASE_COLUMNS.customerQueueId, visible: false },     // hide
        { ...BASE_COLUMNS.sequenceId, visible: false },          // hide
        { ...BASE_COLUMNS.dob, visible: false },                 // hide
        { ...BASE_COLUMNS.occupation, visible: false },          // hide
        { ...BASE_COLUMNS.industry, visible: false },            // hide
        { ...BASE_COLUMNS.companyName, visible: false },         // hide
        { ...BASE_COLUMNS.designation, visible: false },         // hide
        { ...BASE_COLUMNS.annualIncome, visible: false },        // hide
        { ...BASE_COLUMNS.companyAddress, visible: false },      // hide
        { ...BASE_COLUMNS.residentStatus, visible: false },      // hide
        { ...BASE_COLUMNS.cpType, visible: false },              // hide
        { ...BASE_COLUMNS.referrerProjectName, visible: false }, // hide
        { ...BASE_COLUMNS.referrerUnitNo, visible: false },      // hide
        { ...BASE_COLUMNS.customerAddress, visible: false },     // hide
        { ...BASE_COLUMNS.pinCode, visible: false },             // hide
        { ...BASE_COLUMNS.unitPreference, visible: false },
        { ...BASE_COLUMNS.deletionReason, visible: false },      // hide
        { ...BASE_COLUMNS.restoreReason, visible: false },       // hide
        { ...BASE_COLUMNS.actions, visible: true },
      ],
      filters: [...BASE_FILTERS, FILTERS.rmUsers, FILTERS.dateRange],
      actions: [
        ...SALES_TL_ACTIONS,
        { ...ACTIONS.editEOI, visible: (row: any) => !!row?.hasBuddyRMPermission },
        { ...ACTIONS.mapAndConvertEOI, visible: (row: any) => (Boolean(row?.opportunityId) || Boolean(row?.preferredUnit)) && !!row?.hasBuddyRMPermission },
      ],
      canCreate: false,
      canExport: true,
      useTab: false,
    },
    channelPartners: {
      columns: [
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.cpType },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.campaignName },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.noOfVouchers },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.voucherValue },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.amountCollected },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.lastCollectedDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdBy },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.createdDate },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.status },
        { ...CHANNEL_PARTNERS_BASE_COLUMNS.actions },
      ],
      filters: [CHANNEL_PARTNERS_BASE_FILTERS.campaign, CHANNEL_PARTNERS_BASE_FILTERS.createdBy, CHANNEL_PARTNERS_BASE_FILTERS.cpType, CHANNEL_PARTNERS_BASE_FILTERS.dateRange],
      actions: [CHANNEL_PARTNERS_BASE_ACTIONS.copyLink],
      canCreate: false,
      canExport: true,
    },
    eoiDashboard: {
      columns: [
        { ...EOI_DASHBOARD_BASE_COLUMNS.campaign },
        { ...EOI_DASHBOARD_BASE_COLUMNS.collectedEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.paidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.partiallyPaidEoiCollectedCounts },
        { ...EOI_DASHBOARD_BASE_COLUMNS.inProgressEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.totalEoiAmountCollected },
        { ...EOI_DASHBOARD_BASE_COLUMNS.allotedIdCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.activeEoiCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingMISCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingCRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingFINCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.pendingRMCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.cancellationCount },
        { ...EOI_DASHBOARD_BASE_COLUMNS.channelPartner },
        { ...EOI_DASHBOARD_BASE_COLUMNS.loyalty },
        { ...EOI_DASHBOARD_BASE_COLUMNS.purvaChampion },
        { ...EOI_DASHBOARD_BASE_COLUMNS.direct },
        { ...EOI_DASHBOARD_BASE_COLUMNS.digital },
      ],
      filters: [
        EOI_DASHBOARD_BASE_FILTERS.viewBy,
        EOI_DASHBOARD_BASE_FILTERS.campaign,
        EOI_DASHBOARD_BASE_FILTERS.unitType,
        EOI_DASHBOARD_BASE_FILTERS.dateRange,
      ],
      actions: [],
      canExport: true,
    },
    unitInventory: {
      columns: [
        { ...UNIT_INVENTORY_BASE_COLUMNS.campaignName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.towerName },
        { ...UNIT_INVENTORY_BASE_COLUMNS.floor },
        { ...UNIT_INVENTORY_BASE_COLUMNS.unitNumber },
        { ...UNIT_INVENTORY_BASE_COLUMNS.series },
        { ...UNIT_INVENTORY_BASE_COLUMNS.configuration },
        { ...UNIT_INVENTORY_BASE_COLUMNS.facing },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carParkType },
        { ...UNIT_INVENTORY_BASE_COLUMNS.noOfCarParks },
        { ...UNIT_INVENTORY_BASE_COLUMNS.areaSba },
        { ...UNIT_INVENTORY_BASE_COLUMNS.carpetArea },
        { ...UNIT_INVENTORY_BASE_COLUMNS.agreementValue },
        { ...UNIT_INVENTORY_BASE_COLUMNS.status },
        { ...UNIT_INVENTORY_BASE_COLUMNS.action },
      ],
      filters: [UNIT_INVENTORY_BASE_FILTERS.campaign, UNIT_INVENTORY_BASE_FILTERS.tower, UNIT_INVENTORY_BASE_FILTERS.floor, UNIT_INVENTORY_BASE_FILTERS.series, UNIT_INVENTORY_BASE_FILTERS.configuration, UNIT_INVENTORY_BASE_FILTERS.facing, UNIT_INVENTORY_BASE_FILTERS.inventoryStatus],
      actions: [UNIT_INVENTORY_BASE_ACTIONS.updateStatus],
      canCreate: false,
      canExport: false,
      useTab: true,
    },
    // Bank details
    bankDetails: {
      columns: [
        { ...BANK_DETAILS_BASE_COLUMNS.campaignname },
        { ...BANK_DETAILS_BASE_COLUMNS.accHolderName },
        { ...BANK_DETAILS_BASE_COLUMNS.bankName },
        { ...BANK_DETAILS_BASE_COLUMNS.accNumber },
        { ...BANK_DETAILS_BASE_COLUMNS.ifscCode },
        { ...BANK_DETAILS_BASE_COLUMNS.swiftCode },
        { ...BANK_DETAILS_BASE_COLUMNS.action },
      ],
      filters: [],
      actions: [BANK_DETAILS_BASE_ACTIONS.share]
    },
    agreementManagement: {
      columns: [
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.projectName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.opportunityId },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.unitNo },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.applicantName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.numberOfApplicants },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentType },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentName },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.documentStatus },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.sentDate },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.signedAt },
        { ...AGREEMENT_MANAGEMENT_BASE_COLUMNS.Action },
      ],
      filters: AGREEMENT_MANAGEMENT_ROLE_BASED_FILTERS,
      actions: [
        AGREEMENT_MANAGEMENT_ACTIONS.edit,
        AGREEMENT_MANAGEMENT_ACTIONS.download,
        AGREEMENT_MANAGEMENT_ACTIONS.viewLink,
      ],
      canCreate: true,
      canExport: false,
    },
  },
  [ROLES.GRE]: {
    batchListing: {
      columns: [
        { ...BATCH_MANAGER_LIST_COLUMNS.batchName },
        { ...BATCH_MANAGER_LIST_COLUMNS.campaignName },
        { ...BATCH_MANAGER_LIST_COLUMNS.startDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.endDate },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotCount },
        { ...BATCH_MANAGER_LIST_COLUMNS.capacityPerSlot },
        { ...BATCH_MANAGER_LIST_COLUMNS.slotDuration },
        { ...BATCH_MANAGER_LIST_COLUMNS.stage },
      ],
      filters: [],
      actions: [],
    },
    batchSlotListing: {
      columns: hideActionsColumn(BATCH_SLOT_LISTING_COLUMNS),
      filters: [],
      actions: [],
      canExport: true,
    },
    batchVoucherListing: {
      columns: [
        { ...BATCH_VOUCHER_LIST_COLUMNS.pridId },
        { ...BATCH_VOUCHER_LIST_COLUMNS.customerName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.closingRmName },
        { ...BATCH_VOUCHER_LIST_COLUMNS.status },
      ],
      filters: [],
      actions: [],
    },
    batchViewRecords: {
      columns: [
        { ...BASE_COLUMNS.uniqueReferenceId },
        { ...BASE_COLUMNS.paidVoucherId },
        { ...BASE_COLUMNS.stdEoiId, visible: true },
        { ...BASE_COLUMNS.preEoiId, visible: true },
        { ...BASE_COLUMNS.customerName },
        { ...BATCH_PREVIEW_LISTING_COLUMNS.sequence },
        { ...BATCH_PREVIEW_LISTING_COLUMNS.date },
        { ...BATCH_PREVIEW_LISTING_COLUMNS.startTime },
        { ...BATCH_PREVIEW_LISTING_COLUMNS.headCount },
        { ...BASE_COLUMNS.closingRm },
        { ...BASE_COLUMNS.sourcingRm },
        { ...BASE_COLUMNS.attendance },
      ],
      filters: [],
      actions: [],
      canCreate: false,
      canExport: false,
    },
  },
  [ROLES.CRM_TL]: {
    iomManagement: {
      ...IOM_MANAGEMENT_DEFAULT,
      columns: [
        ...IOM_MANAGEMENT_DEFAULT_COLUMNS,
        { ...IOM_LISTING_BASE_COLUMNS.crmCreatedByName },
        IOM_MANAGEMENT_ACTION_COLUMN,
      ],
      actions: IOM_CRM_TL_ACTIONS,
      useTab: true,
      iomManagementTabs: { myTeam: true },
    },
    iomMyTeam: IOM_MY_TEAM_DEFAULT,
  },
  [ROLES.CRM_HEAD]: {
    iomManagement: {
      ...IOM_MANAGEMENT_DEFAULT,
      columns: [
        ...IOM_MANAGEMENT_DEFAULT_COLUMNS,
        { ...IOM_LISTING_BASE_COLUMNS.crmCreatedByName },
        { ...IOM_LISTING_BASE_COLUMNS.crmVerifiedByName },
        IOM_MANAGEMENT_ACTION_COLUMN,
      ],
      actions: IOM_CRM_HEAD_ACTIONS,
    },
  },
  [ROLES.FINANCE_USER]: {
    iomManagement: {
      ...IOM_MANAGEMENT_DEFAULT,
      columns: [
        ...IOM_MANAGEMENT_DEFAULT_COLUMNS,
        { ...IOM_LISTING_BASE_COLUMNS.crmCreatedByName },
        { ...IOM_LISTING_BASE_COLUMNS.crmVerifiedByName },
        { ...IOM_LISTING_BASE_COLUMNS.crmApprovedByName },
        IOM_MANAGEMENT_ACTION_COLUMN,
      ],
      actions: IOM_FINANCE_USER_ACTIONS,
    },
  },
  [ROLES.FINANCE_HEAD]: {
    iomManagement: {
      ...IOM_MANAGEMENT_DEFAULT,
      columns: [
        ...IOM_MANAGEMENT_DEFAULT_COLUMNS,
        { ...IOM_LISTING_BASE_COLUMNS.crmCreatedByName },
        { ...IOM_LISTING_BASE_COLUMNS.crmVerifiedByName },
        { ...IOM_LISTING_BASE_COLUMNS.crmApprovedByName },
        { ...IOM_LISTING_BASE_COLUMNS.financeVerifiedByName },
        IOM_MANAGEMENT_ACTION_COLUMN,
      ],
      actions: IOM_FINANCE_HEAD_ACTIONS,
    },
  },
  [ROLES.LOYALTY]: {
    iomManagement: {
      ...IOM_MANAGEMENT_DEFAULT,
      columns: [
        ...IOM_MANAGEMENT_DEFAULT_COLUMNS,
        { ...IOM_LISTING_BASE_COLUMNS.crmCreatedByName },
        { ...IOM_LISTING_BASE_COLUMNS.crmVerifiedByName },
        { ...IOM_LISTING_BASE_COLUMNS.crmApprovedByName },
        { ...IOM_LISTING_BASE_COLUMNS.financeVerifiedByName },
        { ...IOM_LISTING_BASE_COLUMNS.financeApprovedByName },
        IOM_MANAGEMENT_ACTION_COLUMN,
      ],
      actions: [
        { ...IOM_BASE_ACTIONS.view }, 
        { ...IOM_BASE_ACTIONS.addLoyaltyPoints },
        { ...IOM_BASE_ACTIONS.closeInvoice },
      ],
    },
    iomInvoice: {
      columns: [
        { ...INVOICE_LISTING_BASE_COLUMNS.invoiceNumber },
        { ...INVOICE_LISTING_BASE_COLUMNS.invoiceRequestedAt },
        { ...INVOICE_LISTING_BASE_COLUMNS.iomCount },
        { ...INVOICE_LISTING_BASE_COLUMNS.sumOfIomAmount },
        { ...INVOICE_LISTING_BASE_COLUMNS.amountWithGst },
        { ...INVOICE_LISTING_BASE_COLUMNS.entity },
        { ...INVOICE_LISTING_BASE_COLUMNS.invoiceStatus },
      ],
    }
  },
};

// Fallback configuration for unknown roles
export const DEFAULT_PERMISSIONS: ModulePermissions = {
  columns: [
    BASE_COLUMNS.uniqueReferenceId,
    BASE_COLUMNS.paidVoucherId,
    BASE_COLUMNS.sfdcEnquiryId,
    BASE_COLUMNS.customerName,
    BASE_COLUMNS.campaignName,
    BASE_COLUMNS.voucherCount,
    // BASE_COLUMNS.leadStatus,
    BASE_COLUMNS.sfdcLeadStatus,
    BASE_COLUMNS.formStatus,
    BASE_COLUMNS.paymentStatus,
    BASE_COLUMNS.financeStatus,
    BASE_COLUMNS.createdAt,
    BASE_COLUMNS.sourcingRm,
    BASE_COLUMNS.closingRm,
    BASE_COLUMNS.amountPaid,
    BASE_COLUMNS.finalPaidDate,
    BASE_COLUMNS.chronology,
    BASE_COLUMNS.actions,
  ],
  filters: FINANCE_FILTERS,
  actions: FINANCE_ACTIONS,
  canCreate: false,
  canExport: true,
  canRefresh: false,
  useTab: false,
};

/**
 * Get role-based permissions for a specific role and module
 * @param role - User role
 * @param module - Module name (e.g., 'eoi')
 * @returns Module permissions or default permissions
 */
export function getRoleBasedPermissions(
  role: string | null | undefined,
  module: string
): ModulePermissions {
  // Handle null/undefined role
  if (!role) {
    console.warn('No role provided, using default permissions');
    return DEFAULT_PERMISSIONS;
  }

  // Get role permissions
  const rolePermissions = ROLE_BASED_PERMISSIONS[role];
  if (!rolePermissions) {
    console.warn(`Role "${role}" not found in permissions config, using default permissions`);
    return DEFAULT_PERMISSIONS;
  }

  // Get module permissions
  const modulePermissions = rolePermissions[module];
  if (!modulePermissions) {
    console.warn(`Module "${module}" not found for role "${role}", using default permissions`);
    return DEFAULT_PERMISSIONS;
  }

  return modulePermissions;
}

/**
 * Check if a user has permission for a specific action
 * @param role - User role
 * @param module - Module name
 * @param permission - Permission type
 * @returns boolean
 */
export function hasPermission(
  role: string | null | undefined,
  module: string,
  permission: 'canCreate' | 'canExport' | 'canRefresh' | 'canViewAll' | 'useTab'
): boolean {
  const permissions = getRoleBasedPermissions(role, module);
  if (permission === 'useTab') {
    return permissions.useTab === true;
  }
  return permissions[permission] ?? false;
}

/**
 * Get filtered actions based on row data and user role
 * @param role - User role
 * @param module - Module name
 * @param rowData - Row data for condition checks
 * @returns Filtered actions
 */
export function getFilteredActions(
  role: string | null | undefined,
  module: string,
  rowData?: any,
  listContext?: { eoiListTab?: string }
): RoleAction[] {
  const permissions = getRoleBasedPermissions(role, module);

  let actions = permissions?.actions ?? [];

  if (module === 'eoi') {
    const tab = listContext?.eoiListTab;
    if (tab === 'approveUnit') {
      actions = actions.filter((a) => a.approveUnitTabOnly === true);
    } else {
      actions = actions.filter((a) => !a.approveUnitTabOnly);
    }
  }

  return actions.filter((action) => {
    if (action.visible && rowData != null) {
      if (!action.visible(rowData)) {
        return false;
      }
    }
    if (action.condition && rowData) {
      return action.condition(rowData);
    }
    return true;
  });
}


/**
 * Check if an action is disabled based on row data
 * @param action - The action to check
 * @param rowData - Row data for condition checks
 * @returns boolean indicating if action is disabled
 */
export function isActionDisabled(
  action: RoleAction | undefined,
  rowData?: any,
  role?: any,
  context?: RoleActionContext
): boolean {
  if (!action) return false;

  if (typeof action.disabled === 'boolean') return action.disabled;
  if (typeof action.disabled === 'function') return action.disabled(rowData, role, context);

  return false;
}

/**
 * Get actions with their disabled state resolved for a specific row
 * @param role - User role
 * @param module - Module name
 * @param rowData - Row data for condition checks
 * @returns Actions with disabled state resolved
 */
export function getActionsWithDisabledState(
  role: string | null | undefined,
  module: string,
  rowData?: any,
  listContext?: { eoiListTab?: string },
  context?: RoleActionContext
): (RoleAction & { isDisabled: boolean })[] {
  const actions = getFilteredActions(role, module, rowData, listContext) ?? [];

  return actions.map((action) => ({
    ...action,
    isDisabled: isActionDisabled(action, rowData, role, context),
  }));
}


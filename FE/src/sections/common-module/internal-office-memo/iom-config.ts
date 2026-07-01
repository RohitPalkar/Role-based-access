import type { Dayjs } from 'dayjs';
import type { IomDropdownOption } from 'src/types/admin/services/common';

import { IomStatus, MyTeamStatus, PointsAdjustmentType } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

const col = uiText.internalOfficeMemo.columns;

type DropdownOption = { value: string; label: string };

export const mapProjectDropdownOptions = (items?: IomDropdownOption[]): DropdownOption[] =>
  items?.map((item) => ({
    value: String(item.value),
    label: item.label,
  })) ?? [];

export const mapInvoiceStatusDropdownOptions = (items?: IomDropdownOption[]): DropdownOption[] =>
  items?.map((item) => ({
    value: String(item.value),
    label: item.label,
  })) ?? [];

export const mapIomStatusDropdownOptions = (items?: IomDropdownOption[]): DropdownOption[] =>
  items?.map((item) => ({
    value: String(item.value ?? ''),
    label: item.label,
  })) ?? [];

export interface ReferralSplitRatio {
  referee: number;
  referrer: number;
}

export interface IomTableRowItem {
  id: number | string;
  iomNo?: string | null;
  bookingId?: number;
  projectId?: number;
  salesOrderId?: string | null;
  ageing?: number | null;
  projectName?: string;
  unitNo?: string;
  customerName?: string;
  saleValue?: number;
  saleValueCollectedPercentage?: string | number;
  saleValueAmountCollected?: number;
  brokeragePercentage?: string;
  totalBrokerageAmount?: number;
  referrerPoints?: number;
  refereePoints?: number;
  referralPointsEdited?: boolean;
  referralClassification?: string;
  statusCode?: string;
  statusLabel?: string;
  iomCreatedAt?: string | null;
  iomPdfAvailable?: boolean;
  pdfBasePath?: string;
  pdflink?: string | null;
  crmCreatedByName?: string | null;
  crmVerifiedByName?: string | null;
  crmApprovedByName?: string | null;
  financeVerifiedByName?: string | null;
  financeApprovedByName?: string | null;
  pointsAllottedByName?: string | null;
  crmVerifiedBy?: number | null;
  referralPointsAdjustment?: number;
  referralSplitType?: string;
  referralSplitRatio?: ReferralSplitRatio;
  loyaltyPointClassification?: string;
  thresholdPaymentReceivedAt?: string | null;
  referralPointsEditedAt?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  invoiceRequestedAt?: string | null;
  invoiceDate?: string | null;
  invoiceCreatedBy?: string | null;
  invoiceUpdatedBy?: string | null;
  invoiceCreatedAt?: string | null;
  invoiceUpdatedAt?: string | null;
  invoiceReqNumber?: string | null;
  pointsUpdatedAt?: string | null;
}

export type IomTableFilters = {
  search: string;
  iomStatus: string[];
  project: string[];
  invoiceStatus: string[];
  pointsClassification: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
};

// IOM Listing
export const IOM_LISTING_BASE_COLUMNS = {
  salesOrderId: {
    id: 'salesOrderId',
    label: col.salesOrderId,
    width: 150,
    visible: true,
    disableToggle: true,
  },
  projectName: {
    id: 'projectName',
    label: col.project,
    width: 150,
    visible: true,
    disableToggle: true,
  },
  unitNo: {
    id: 'unitNo',
    label: col.unit,
    width: 150,
    visible: true,
    disableToggle: true,
  },
  customerName: {
    id: 'customerName',
    label: col.customer,
    width: 250,
    visible: true,
    disableToggle: true,
  },
  saleValue: {
    id: 'saleValue',
    label: col.saleValue,
    width: 120,
    visible: true,
  },
  saleValueCollectedPercentage: {                   // % of SV Collected
    id: 'saleValueCollectedPercentage',
    label: col.percentageCollected,
    width: 160,
    visible: true,
  },
  saleValueAmountCollected: {                       // Amount Collected
    id: 'saleValueAmountCollected',
    label: col.amountCollected,
    width: 150,
    visible: false,
  },
  thresholdPaymentReceivedAt: {                     // 15% Date
    id: 'thresholdPaymentReceivedAt',
    label: col.fifteenPercentDate,
    width: 140,
    visible: true,
  },
  totalBrokerageAmount: {                           // Referral Points
    id: 'totalBrokerageAmount',
    label: col.referralPts,
    width: 140,
    visible: true,
  },
  referralPointsEdited: {                         // Referral Points Edited
    id: 'referralPointsEdited',
    label: col.referralPointsEdited,
    width: 180,
    visible: true,
  },
  referralSplitType: {                              // Points Adjustment
    id: 'referralSplitType',
    label: col.pointsAdjustment,
    width: 160,
    visible: true,
  },
  loyaltyPointClassification: {                     // Points Classification
    id: 'loyaltyPointClassification',
    label: col.pointsClassification,
    width: 160,
    visible: true,
  },
  pointsUpdatedAt: {                                 // Points Updated
    id: 'pointsUpdatedAt',
    label: col.pointsUpdated,
    width: 140,
    visible: true,
  },
  invoiceReqNumber: {                                 // Points Updated
    id: 'invoiceReqNumber',
    label: col.invoiceReqNumber,
    width: 140,
    visible: true,
  },
  invoiceStatus: {
    id: 'invoiceStatus',
    label: col.invoiceStatus,
    width: 150,
    visible: true,
    disableToggle: true,
  },
  ageing: {
    id: 'ageing',
    label: col.ageing,
    width: 100,
    visible: true,
  },
  invoiceNumber: {
    id: 'invoiceNumber',
    label: col.invoiceNo,
    width: 150,
    visible: true,
  },
  invoiceDate: {
    id: 'invoiceDate',
    label: col.invoiceDate,
    width: 140,
    visible: true,
  },
  statusLabel: {
    id: 'statusLabel',
    label: col.status,
    width: 250,
    visible: true,
    disableToggle: true,
  },
  iomCreatedAt: {                                    // IOM Date
    id: 'iomCreatedAt',
    label: col.iomDate,
    width: 140,
    visible: true,
    disableToggle: true,
  },
  iomNo: {
    id: 'iomNo',
    label: col.iomNumber,
    width: 180,
    visible: true,
    disableToggle: true,
  },
  crmCreatedByName: {
    id: 'crmCreatedByName',
    label: col.createdBy,
    width: 140,
    visible: true,
    disableToggle: true,
  },
  crmVerifiedByName: {
    id: 'crmVerifiedByName',
    label: col.verifiedBy,
    width: 140,
    visible: true,
    disableToggle: true,
  },
  crmApprovedByName: {
    id: 'crmApprovedByName',
    label: col.approvedBy,
    width: 140,
    visible: true,
    disableToggle: true,
  },
  financeVerifiedByName: {
    id: 'financeVerifiedByName',
    label: col.financeVerifiedBy,
    width: 140,
    visible: true,
    disableToggle: true,
  },
  financeApprovedByName: {
    id: 'financeApprovedByName',
    label: col.financeApprovedBy,
    width: 150,
    visible: true,
    disableToggle: true,
  },
  action: {
    id: 'action',
    label: col.action,
    width: 100,
    visible: true,
    disableToggle: true,
  },
};

export const IOM_BASE_FILTERS = {
  iomStatus: { id: 'iomStatus', label: 'IOM Status', type: 'select' as const },
  project: { id: 'project', label: 'Project', type: 'select' as const },
  invoiceStatus: { id: 'invoiceStatus', label: 'Invoice Status', type: 'select' as const },
  pointsClassification: {
    id: 'pointsClassification',
    label: 'Points Classification',
    type: 'select' as const,
  },
  dateRange: { id: 'dateRange', label: 'Date Range', type: 'date' as const },
};

export const IOM_BASE_ACTIONS = {
  view: { id: 'view', label: uiText.internalOfficeMemo.actions.view },
  generateIOM: { id: 'generateIOM', label: uiText.internalOfficeMemo.actions.generateIOM },
  verifyIOM: { id: 'verifyIOM', label: uiText.internalOfficeMemo.actions.verifyIOM },
  verifyGeneratedIOM: {
    id: 'verifyGeneratedIOM',
    label: uiText.internalOfficeMemo.actions.verifyGeneratedIOM,
  },
  addLoyaltyPoints: {
    id: 'addLoyaltyPoints',
    label: uiText.internalOfficeMemo.actions.addLoyaltyPoints,
  },
  closeInvoice: {
    id: 'closeInvoice',
    label: uiText.internalOfficeMemo.actions.closeInvoice,
  },
};

export type IOMListingResponse = {
  data: IomTableRowItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type InvoiceTableFilters = {
  search: string;
};

export interface InvoiceTableRowItem {
  id: number | string;
  invoiceNumber?: string | null;
  invoiceRequestedAt?: string | null;
  iomCount?: number | null;
  sumOfIomAmount?: number | null;
  amountWithGst?: number | string | null;
  entity?: string | null;
  invoiceStatus?: string | null;
}

export const INVOICE_LISTING_BASE_COLUMNS = {
  invoiceNumber: {
    id: 'invoiceNumber',
    label: col.invoiceNo,
    width: 150,
    visible: true,
    disableToggle: true,
  },
  invoiceRequestedAt: {
    id: 'invoiceRequestedAt',
    label: col.requestedDate,
    width: 140,
    visible: true,
  },
  iomCount: {
    id: 'iomCount',
    label: col.iomCount,
    width: 120,
    visible: true,
  },
  sumOfIomAmount: {
    id: 'sumOfIomAmount',
    label: col.sumOfIomAmount,
    width: 160,
    visible: true,
  },
  amountWithGst: {
    id: 'amountWithGst',
    label: col.amountWithGst,
    width: 150,
    visible: true,
  },
  entity: {
    id: 'entity',
    label: col.entity,
    width: 200,
    visible: true,
  },
  invoiceStatus: {
    id: 'invoiceStatus',
    label: col.invoiceStatus,
    width: 150,
    visible: true,
    disableToggle: true,
  },
};


// ----------------------- Generate IOM types & mock -----------------------

export interface IomPartyDetails {
  customer_name: string;
  project_name: string;
  project_location: string;
  unit_number: string;
  bp_code: string;
  booking_date: string;
}

export interface IomSignatory {
  name: string;
  role: string;
  signature?: string;
}

export interface IomPaymentDetails {
  basic_sale_price: number;
  brokerage: string;
  brokerage_amt: string;
  total_amt: string;
  points_adjustment_type: string | null;
  /**
   * Raw `referralSplitType` value returned by the API (`"1:1"` / `"2:0"` /
   * `"0:2"` / `"other"` / empty). Used by the form to decide whether the
   * Points Adjustment Type dropdown is locked (fixed options) or editable
   * (empty / `other`). Kept separately from `points_adjustment_type` which is
   * normalized to the `PointsAdjustmentType` enum value.
   */
  original_referral_split_type?: string | null;
  pts_to_referer: number;
  pts_to_referee: number;
  pts_referer_amount: number;
  pts_referee_amount: number;
  approval_proof_url?: string | null;
  is_basic_sale_price_edited?: boolean;
  is_brokerage_edited?: boolean;
  is_points_adjustment_edited?: boolean;
  is_deviation?: boolean;
}

export type IomSubmitAction = 'draft' | 'submit' | 'resubmit';

export interface IomDetailsResponse {
  iom_id: string;
  iom_no?: string | null;
  status?: IomStatus;
  status_id?: string | number | null;
  mode?: string;
  referer_details: IomPartyDetails;
  referee_details: IomPartyDetails;
  payment_details: IomPaymentDetails;
  sap_source: string;
  sfdc_source: string;
  agreement_date: string;
  refer_paid: number;
  referee_paid: number;
  /** Brand asset path returned at the root of the IOM details API
   * (e.g. `brands/91636PurvaLand Maste.jpeg`). Resolved against
   * `VITE_S3_BASE_URL` for display. */
  brand?: string | null;
  prepared_by?: IomSignatory;
  verified_by?: IomSignatory;
  approved_by?: IomSignatory;
  finance_verified_by?: IomSignatory;
  finance_approved_by?: IomSignatory;
}

export interface SubmitIomPayload {
  iomId: string;
  basicSalePrice: number;
  brokeragePercent: number;
  pointsAdjustmentType: PointsAdjustmentType;
  pointsRatio: { referrer: number; referee: number };
  approvalProofUrl?: string | null;
  action: IomSubmitAction;
  deviation: boolean;
  // Edit-tracking flags (mock keys – align with API spec when finalized).
  isBasicSalePriceEdited?: boolean;
  isBrokerageEdited?: boolean;
  isPointsAdjustmentEdited?: boolean;
}

export interface IomEditedFlags {
  basicSalePrice?: boolean;
  brokerage?: boolean;
  pointsAdjustmentType?: boolean;
}

/**
 * Payload for the PATCH `/iom/{id}` API used by CRM / CRM TL when submitting
 * an IOM for approval. The endpoint expects flat fields (no nested ratio
 * object) with edit-tracking flags and computed point amounts.
 */
export interface SubmitIomPatchPayload {
  salePriceEdited: boolean;
  brokeragePercentageEdited: boolean;
  referralPointsRatioEdited: boolean;
  salePrice: number;
  brokeragePercentage: number;
  /** `"referrer:referee"` (e.g. `"1:1"`) for the fixed split types, or the
   * literal `"other"` whenever `Other` is selected (with or without the
   * brokerage-adjustment deviation). */
  referralPointsRatio: string;
  totalBrokerageAmount: number;
  /** Per-side computed points. Zeroed when `Other` is selected with the
   * brokerage-adjustment deviation. */
  referrerPoints: number;
  refereePoints: number;
  /** Per-side ratio percentages (e.g. 1 / 1 for `1:1`). Both `null` when
   * `Other` is selected with the brokerage-adjustment deviation. */
  referrerRatio: number | null;
  refereeRatio: number | null;
  /** Backend reuses this field to persist the Approval Proof file path. */
  referralPointsEditReason?: string;
  action: IomSubmitAction;
  deviation: boolean;
}

export interface DeleteApprovalProofPayload {
  iomId: string;
  approvalProofUrl: string;
}

export interface RejectIomPayload {
  iomId: string;
  reason: string;
}

export const IOM_DETAILS_SAMPLE: IomDetailsResponse = {
  iom_id: 'IOM00154',
  status: IomStatus.IOM_TO_BE_CREATED,
  referer_details: {
    customer_name: 'Ganesh G',
    project_name: 'Project A',
    project_location: 'Location 1',
    unit_number: 'A1024',
    bp_code: 'BP-210923',
    booking_date: '12/05/2026',
  },
  referee_details: {
    customer_name: 'John Doe',
    project_name: 'Project B',
    project_location: 'Location 12',
    unit_number: 'A10299',
    bp_code: 'BP-210978',
    booking_date: '11/07/2026',
  },
  payment_details: {
    basic_sale_price: 12000000,
    brokerage: '2',
    brokerage_amt: '240000',
    total_amt: '12240000',
    points_adjustment_type: PointsAdjustmentType.ONE_ONE,
    original_referral_split_type: PointsAdjustmentType.ONE_ONE,
    pts_to_referer: 1,
    pts_to_referee: 1,
    pts_referer_amount: 120000,
    pts_referee_amount: 120000,
    approval_proof_url: null,
    is_basic_sale_price_edited: false,
    is_brokerage_edited: false,
    is_points_adjustment_edited: false,
  },
  sap_source: 'Purva Privilege',
  sfdc_source: 'Purva Privilege',
  agreement_date: '11/01/2025',
  refer_paid: 80,
  referee_paid: 80,
};
// -------------------------------------------------------------------------------------------------------
//  My Team Table Handling

const myTeamCol = uiText.internalOfficeMemo.myTeam.columns;

export interface IomMyTeamRowItem {
  userId: number;
  empId: string;
  name: string;
  email: string;
  role: string;
  currentStatus?: string;
  statusLabel: string;
  projects: {
    id: number;
    name: string;
  }[];
  allocatedIomsCount: number;
  unavailableFrom?: string;
  unavailableTo?: string;
}

export type IomMyTeamListingResponse = {
  data: IomMyTeamRowItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const IOM_MY_TEAM_BASE_COLUMNS = {
  empId: {
    id: 'empId',
    label: myTeamCol.empId,
    width: 120,
    visible: true,
    disableToggle: true,
  },
  name: {
    id: 'name',
    label: myTeamCol.name,
    width: 180,
    visible: true,
    disableToggle: true,
  },
  email: {
    id: 'email',
    label: myTeamCol.email,
    width: 300,
    visible: true,
    disableToggle: true,
  },
  project: {
    id: 'project',
    label: myTeamCol.project,
    width: 180,
    visible: true,
  },
  allocatedIomsCount: {
    id: 'allocatedIomsCount',
    label: myTeamCol.iomsAllotted,
    width: 140,
    visible: true,
  },
  statusLabel: {
    id: 'statusLabel',
    label: myTeamCol.status,
    width: 140,
    visible: true,
    disableToggle: true,
  },
  unavailableFrom: {
    id: 'unavailableFrom',
    label: myTeamCol.fromDateTime,
    width: 180,
    visible: true,
  },
  unavailableTo: {
    id: 'unavailableTo',
    label: myTeamCol.toDateTime,
    width: 180,
    visible: true,
  },
  action: {
    id: 'action',
    label: myTeamCol.action,
    width: 80,
    visible: true,
    disableToggle: true,
  },
};

export type IomMyTeamTableFilters = {
  search: string;
  status: string | null;
  project: string[];
};

export const IOM_MY_TEAM_BASE_FILTERS = {
  status: { id: 'status', label: myTeamCol.status, type: 'select' as const },
  project: { id: 'project', label: myTeamCol.project, type: 'select' as const },
};

export const IOM_MY_TEAM_STATUS_OPTIONS = Object?.values(MyTeamStatus)?.map((status) => ({
  label: status,
  value: status,
}));

export const IOM_MY_TEAM_BASE_ACTIONS = {
  edit: { id: 'edit', label: uiText.internalOfficeMemo.myTeam.actions.edit },
};

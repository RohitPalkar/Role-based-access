import type { CreateRazorpayOrderPayload } from 'src/utils/payment';

import { toast } from 'sonner';

import { buildQueryString, mapArrayToLabelValue } from 'src/utils/helper';
import {
  type ApiMutationResult,
  normalizeApiMutationResponse,
} from 'src/utils/normalize-api-mutation-response';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { eoiRoutes } from '../EoiRoutes';
import { GET, POST, PATCH } from '../axiosInstance';

export const fetchEOIListing = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.EOI_LIST}?${queryString}` : route.EOI_LIST;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const apiResponse = response.response;
      const rawData = apiResponse?.response?.data || {};
      const rawRecords = rawData?.result || [];

      return {
        data: rawRecords,
        total: rawData?.total || 0,
        page: rawData?.page || 1,
        pageSize: rawData?.pageSize || 10,
        pageCount: rawData?.pageCount || 1,
      };
    }

    throw new Error('Failed to fetch EOI listing');
  } catch (error: any) {
    console.error('EOI service error:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching EOI listing';
    throw new Error(message);
  }
};

export interface CampaignOption {
  name: string;
  value: number;
  sfdcProjectName: string;
}

export interface DropdownOption {
 sfdcCPId?:any; 
  label: string;
  value: number | string
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface UnitTypeOption {
  label: string;
  value: string;
}
export interface PrimarySourceOptions {
  value: string;
  hasSecondary: boolean;
  requiresAdditionalData: boolean;
}

export interface CreateVoucherEOI {
  firstName: string;
  lastName: string;
  emailId: string;
  countryCode: string;
  contactNumber: string;
  campaignId: number;
  primarySource: string;
  secondarySource?: string;
  sfdcEnquiryId?:string;
  sourceAdditionalData?: {
    name?: string;
    email?: string;
    countryCode?: string;
    contactNumber?: string;
    project?: number;
    unit?: string;
    referredBy?: string;
    employeeName?: string;
    employeeId?: string;
    campaignId?: number;
    uniqueRefId?: string;
  };
}

export interface Transaction {
  paymentMode: string;
  paidAmount: number;
  paymentDetails: {
    method: string;
    transactionNumber?: string;
    chequeNumber?: string;
    drawnOn: string;
    branchName: string;
    accountNumber: string;
    paymentProof: any;
    status: string;
    date: string;
    gatewayPaymentId: string;
    isPaid: boolean;
  };
}

export interface Payment {
  id: number | null;
  paymentMode: string;
  paidAmount: number;
  date: string;
  status: string;
  paymentDetails: {
    method: string;
    transactionNumber?: string;
    chequeNumber?: string;
    drawnOn: string;
    branchName?: string;
    accountNumber?: string;
    paymentProof: any;
    gatewayPaymentId?: string;
    chequeDepositSlip?: any;
    isPhysicalPaymentProof?: boolean;
    lastFourDigits?: string;
  };
}

export interface KycApplicantDetails {
  panNumber?: string;
  panImage?: string[];
  aadhaarNumber?: string;
  aadhaarImage?: string[];
}

export interface UpdateVoucherEOI {
  isCreateForm?: boolean;
  residentStatus?: string;
  eoiDetails?: {
    eoiType?: string;
    eoiAmount?: number;
    typology?: string;
  };

  paymentDetails: {
    amountPayable: number;
    payments: Payment[];

    recoveryAccountDetails?: {
      payeeName?: string;
      bankName?: string;
      ifscCode?: string;
      accountNumber?: string;
      accountType?: string;
      cancelledCheque?: any;
    };
  };

  kycDetails?: {
    applicant1?: KycApplicantDetails;
    applicant2?: KycApplicantDetails;
  };
}


export interface ReferralVoucherPayload {
  campaignId: number;
  uniqueRefId: string;
}

export interface MappedUnit {
  id: string;
  voucherId: number;
  source: string;
  sfdcTowerId: string;
  towerName: string;
  floor: string;
  inventoryUnitId: string;
  sfdcUnitId: string;
  unitNumber: string;
  configuration: string;
  facing: string;
  areaSBA: number;
}

export interface MapAndConvertResponse {
  campaignId: number;
  campaignName: string;
  sdfcProjectName: string;
  mappedUnit?: MappedUnit | null;
  towers: {
    name: string;
    value: string;
  }[];
}

export interface MapAndConvertPayload {
  voucherId: number;
  sfdcTowerId: string;
  towerName: string;
  floor: number;
  facing: string;
  sfdcUnitId: string;
  inventoryUnitId: string;
  unitNumber: string;
  configuration: string;
  areaSBA: number;
  changeUnit?: boolean;
}

export interface CreateSourceChangeRequestPayload {
  voucherId?: number;
  id?: number;
  currentData?: {
    uniqueReferenceId?: string;
    secondarySource?: string;
    firstName?: string;
    lastName?: string;
    emailId?: string;
    countryCode?: string;
    contactNumber?: string;
    primarySource?: string;
    channelPartner?: string;
    sourceDetails?: any;
  };
  newData?: {
    uniqueReferenceId?: string;
    secondarySource?: string;
    firstName?: string;
    lastName?: string;
    emailId?: string;
    countryCode?: string;
    contactNumber?: string;
    primarySource?: string;
    channelPartner?: string;
    sourceDetails?: any;
  };
  reason?: string;
  reviewerRemark?:  string;
  targetEnquiryId?: string;
  targetPRID?: string;
  changeSource?: string;
  swappedFields?: string[];
  status?: string;
  approvalProof?: any;
  
}

// Approve / Reject change source request payload
export interface SourceChangeRequestPayload {
  id: string;
  voucherId: number;
  status: string;
  approvalProof?: string;
  remark: string;
}

export interface GetVoucherByEnquiryParams {
  enqRefNo: string;
  campaignName: string;
  sfdcProjectName?: string;
  // isChangeRequest?: boolean;
}

export const fetchEOICampaigns = async (params?: { showAll?: boolean; showBuddyCampaigns?: boolean }): Promise<CampaignOption[]> => {
  try {
    let url = route.EOI_CAMPAIGNS;
    const queryParams: string[] = [];

    if (params?.showAll) {
      queryParams.push('showAll=true');
    }

    if (params?.showBuddyCampaigns) {
      queryParams.push('showBuddyCampaigns=true');
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    const response = await GET(url);

    if (response?.status === 200) {
      const apiResponse = response.response;
      const rawData = apiResponse?.response?.data || [];

      // Transform to dropdown options
      return rawData?.map((item: any) => ({
        name: item?.campaignName,
        value: item?.id,
        sfdcProjectName: item?.sfdcProjectName
      }));
    }
    throw new Error('Failed to fetch EOI campaigns');
  } catch (error: any) {
    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching campaigns';
    throw new Error(message);
  }
};

export const getEOIPrimarySource = async (): Promise<PrimarySourceOptions[]> => {
  try {
    const response = await GET(route.GET_PRIMARY_SOURCE);

    if (response?.status === 200) {
      const apiResponse = response.response;
      const rawData = apiResponse?.response?.data || [];

      // Transform to dropdown options
      return rawData.map((item: any) => ({
        name: item.value,
        value: item.value,
      }));
    }

    throw new Error('Failed to fetch EOI campaigns');
  } catch (error: any) {
    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching campaigns';
    throw new Error(message);
  }
};

export const createVoucherEOI = async (voucherData: CreateVoucherEOI): Promise<ApiMutationResult> => {
  try {
    const response = await POST(route.CREATE_VOUCHER_EOI, voucherData);
    if (response?.status === 200 || response?.status === 201) {
      return normalizeApiMutationResponse(response.response);
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    const beMsg = error?.response?.data?.errors?.message;
    if (beMsg != null) {
      throw new Error(Array.isArray(beMsg) ? beMsg[0] : beMsg);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error || 'Something went wrong'));
  }
};

// Cancel EOI using POST with payload { voucherId, Reason }
export interface CancelEOIPayload {
  voucherId: number | string;
  remarks: string;
}
// Specific wrappers
export const cancelEOIService = (payload: EOIPayload) =>
  eoiActionService(route.CANCEL_EOI, payload, 'Failed to cancel EOI');

export const approveCancellationService = (payload: ApproveCancellationPayload) =>
  eoiActionService(route.APPROVE_CANCELLATION, payload as EOIPayload, 'Failed to approve cancellation');

export const deleteRestoreService = (payload: EOIPayload) =>
  eoiActionService(route.DELETE_RESTORE_VOUCHER, payload, 'Failed to delete voucher');
export const convertEOIService = (payload: EOIPayload) =>
  eoiActionService(route.EOI_CONVERTED, payload, 'Failed to convert EOI');

// src/services/eoi-service.ts
export interface EOIPayload {
  voucherId: number | string;
  remarks: string;
}

export interface RefundDocumentsPayload {
  refundChequeCopy: string[];
  depositSlip: string[];
  acknowledgementForm: string[];
}

export interface ApproveCancellationPayload extends EOIPayload {
  action?: string;
  refundDocuments?: RefundDocumentsPayload;
}

// Generic reusable EOI action service
export const eoiActionService = async (
  endpoint: string,
  payload: EOIPayload,
  defaultErrorMessage: string
) => {
  try {
    const response = await POST(endpoint, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response.response?.data ?? response?.response?.response?.data;
    }
    throw new Error(defaultErrorMessage);
  } catch (error: any) {
    const be = error?.response?.data;
    const message = be?.errors.message || be?.errors?.message?.[0] || defaultErrorMessage;
    throw new Error(message);
  }
};

export const updateVoucher = async (id: number, payload: UpdateVoucherEOI): Promise<ApiMutationResult> => {
  try {
    const response = await PATCH(`${route.UPDATE_VOUCHER_EOI}${id}`, payload);
    if (response?.status === 200 || response?.status === 201) {
      return normalizeApiMutationResponse(response.response);
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    const beMsg = error?.response?.data?.errors?.message;
    if (beMsg != null) {
      throw new Error(Array.isArray(beMsg) ? beMsg[0] : beMsg);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error || 'Something went wrong'));
  }
};

export const getVoucherById = async (id: number, queryParams?: {maskEmailMobile?: boolean}) => {
  try {
    const queryString = buildQueryString(queryParams || {})
    const response = await GET(`${route.GET_VOUCHER_EOI}${id}${queryString ? `?${queryString}` : ""}`);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const sendEoiLink = async (id: number) => {
  try {
    const response = await GET(`${route.SEND_EOI_FORM_LINK}${id}`);
    if (response?.status === 200 || response?.status === 201) {
      return response;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};
export interface ASSIGN_CLOSING_RM_PAYLOAD {
  id: number | string;
  closingRmId: number;
  sourcingRmId: number;
}
export const ASSIGN_CLOSING_RM = async (payload: ASSIGN_CLOSING_RM_PAYLOAD) => {
  try {
    const response = await POST(route.ASSIGN_CLOSING_RM, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }
    throw new Error('Failed to assign closing RM');
  } catch (error: any) {
    const be = error?.response?.data;
    const message = be?.errors?.message || be?.message || 'Failed to assign closing RM';

    throw new Error(message);
  }
};
export const exportVouchersReports = async (payload: {
  page: number;
  limit: number;
  search: string;
  userId: string;
  brandId: string;
  projectIds: string;
  unitStatus: string;
  incentiveStatus: string;
  startDate: string;
  endDate: string;
}) => {
  try {
    const queryParams = new URLSearchParams(payload as any).toString();
    const response = await GET(`${eoiRoutes.EXPORT_VOUCHERS_REPORTS}?${queryParams}`);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', path);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};

export interface DeletePaymentDetailsPayload {
  voucherId: any;
  paymentId: any;
}

export const deletePaymentDetails = async (payload: DeletePaymentDetailsPayload) => {
  try {
    const response = await POST(route.DELETE_PAYMENT_DETAILS, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response.response?.data ?? response?.response?.response?.data;
    }
    throw new Error('Failed to delete payment details');
  } catch (error: any) {
    const be = error?.response?.data;
    const message = be?.errors?.message || be?.message || 'Failed to delete payment details';

    throw new Error(message);
  }
};

export interface RefundPaymentPayload {
  voucherId: string | number;
  refundDate: string;
  refundTransactionId: string;
  internalRefNumber?: string;
  comments?: string;
  paidAmount: string;
}

export const updateRefundPayment = async (payload: RefundPaymentPayload) => {
  try {
    const response = await PATCH(route.REFUND_PAYMENT, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response.response?.data ?? response?.response?.response?.data;
    }
    throw new Error('Failed to update refund payment');
  } catch (error: any) {
    const be = error?.response?.data;
    const message = be?.errors?.message || be?.message || 'Failed to update refund payment';

    throw new Error(message);
  }
};

export interface UpdateVoucherStatusPayload {
  voucherId: number;
  voucherStatus: string;
  checkerRemarks: string;
}

export const updateVoucherStatus = async (payload: UpdateVoucherStatusPayload) => {
  try {
    const response = await PATCH(eoiRoutes.UPDATE_VOUCHER_STATUS, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response.response?.data ?? response?.response?.response?.data;
    }
    throw new Error('Failed to update voucher status');
  } catch (error: any) {
    const be = error?.response?.data;
    const message = be?.errors?.message || be?.message || 'Failed to update voucher status';

    throw new Error(message);
  }
};

// types/eoiCampaignDetails.ts
export interface CampaignDetailsResponse {
  success: boolean;
  response: {
    statusCode: number;
    message: string;
    data: CampaignDetails;
  };
  errors: any;
}

export interface CampaignDetails {
  id: number;
  campaignName: string;
  enquiryInitials: string;
  phase: string[];
  status: string;
  brandId: Brand;
  cityIds: City[];
  developmentTypeIds: DevelopmentType[];
  inventoryTypeIds: InventoryType[];
  pushToSfdc: boolean;
  sfdcProjectName: string | null;
  inventoryDetails: InventoryDetail[];
  accountDetails: AccountDetails;
  eoiFormType: string;
  eoiStartDate: string;
  eoiEndDate: string;
  eoiType: string[];
  stdEoiAmount: string;
  preEoiAmount: string;
  eoiTermsAndCondition: string;
  voucherFormType: string | null;
  voucherAmount: string | null;
  voucherStartDate: string | null;
  voucherEndDate: string | null;
  voucherTermsAndCondition: string | null;
  /** When present, voucher/EOI amounts are resolved from inventoryDetails by typology */
  voucherAmountType?: string | null;
  stdEoiAmountType?: string | null;
  preEoiAmountType?: string | null;
  /** Payment gateways for online payment: e.g. ["Razorpay"], ["Easebuzz"], or ["Razorpay", "Easebuzz"] */
  availableGateways?: string[];
}

export interface Brand {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
}

export interface DevelopmentType {
  id: number;
  name: string;
}

export interface InventoryType {
  id: number;
  name: string;
}

export interface InventoryDetail {
  type: string;
  minSBA: number;
  maxSBA: number;
  minPrice: number;
  maxPrice: number;
  /** BHK-wise voucher amount (when voucherAmountType is BHK Wise) */
  voucherAmt?: number | string | null;
  /** BHK-wise standard EOI amount */
  standardEOIAmt?: number | string | null;
  /** BHK-wise preferential EOI amount */
  preferentialEOIAmt?: number | string | null;
}

export interface AccountDetails {
  bankName: string;
  ifscCode: string;
  accountName: string;
  accountNumber: string;
}

export const getCampaignDetailsID = async (id: number): Promise<CampaignDetails> => {
  try {
    const response = await GET(`${route.GET_EOI_CAMPAIGN_BY_ID}${id}`);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data as CampaignDetails;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const fetchEOIUnitTypes = async (id: number): Promise<UnitTypeOption[]> => {
  try {
    const response = await GET(`${route.EOI_UNIT_TYPES}/${id}`);
    const rawData = response?.response?.response?.data || [];
    return rawData?.map((item: any) => ({
      label: item?.name,
      value: item?.value,
    }));
  } catch (error) {
    throw new Error(error?.response?.data?.errors?.message || 'Oops! Something went wrong.');
  }
};

export const eoiExportAsPDF = async (voucherId: string) => {
  try {
    const response = await GET(`${eoiRoutes.EOI_EXPORT_AS_PDF}/${voucherId}`);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;
    const fileResponse = await fetch(fileUrl);
    const blob = await fileResponse.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = path?.split('/').pop() || 'voucher-form.pdf';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};

export const fetchReferredVoucher = async (payload: ReferralVoucherPayload) => {
  try {
    const query = new URLSearchParams({
      campaignId: String(payload.campaignId),
      uniqueRefId: payload.uniqueRefId,
    }).toString();

    const response = await GET(`${route.FETCH_VOUCHER}?${query}`);
    
    if (response?.response?.response?.statusCode === 200) {
      return response.response.response.data;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const getVoucherByEnquiry = async (params: GetVoucherByEnquiryParams) => {
  try {
    const queryString = buildQueryString(params);

    const url = queryString
      ? `${eoiRoutes.GET_VOUCHER_BY_ENQUIRY}?${queryString}`
      : eoiRoutes.GET_VOUCHER_BY_ENQUIRY;

    const response = await GET(url);

    if (response?.status === 200 || response?.status === 201) {
      const root = response.response as Record<string, any> | undefined;
      return (
        root?.response?.response?.data ??
        root?.response?.data ??
        root?.data
      );
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};


export const getVoucherByPaymentRefId = async (prid: string, campaignId: number) => {
  try {
    const response = await GET(`${eoiRoutes.GET_VOUCHER_BY_PAYMENT_REF_ID}?prid=${prid}&campaignId=${campaignId}`);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const fetchCPName = async (
  campaignId?: number | string | Array<number | string>
): Promise<DropdownOption[]> => {
  try {
    const params: Record<string, string> = {};

    if (campaignId) {
      params.campaignId = Array.isArray(campaignId) ? campaignId.join(',') : String(campaignId);
    }

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${route.CP_NAME_LIST}?${queryString}` : route.CP_NAME_LIST;
    const res = await GET(url);
    if (res?.status === 200) {
      return (
        mapArrayToLabelValue(res?.response?.response?.data, 'cpName', 'id', ['sfdcCPId'] as any) ||
        []
      );
    }
    throw new Error('Failed to fetch CP Names');
  } catch (error: any) {
    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching cp names';
    throw new Error(message);
  }
};

export const getEOIProjects = async () => {
  try {
    const response = await GET(route.GET_PROJECTS_LIST);
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};


export const createRazorpayOrderService = async (
  payload: CreateRazorpayOrderPayload
) => {
  try {
    const response = await POST(route.CREATE_RAZORPAY_ORDER, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.data ?? response?.response?.response?.data;
    }

    throw new Error('Order creation failed');
  } catch (error: any) {
    const be = error?.response?.data;
    const message =
      be?.errors?.message ||
      be?.message ||
      'Failed to create Razorpay order';

    throw new Error(message);
  }
};
export const verifyVoucherPaymentService = async (payload: any) => {
  try {
    const response = await POST(route.VOUCHER_PAYMENT_VERIFY, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response.response?.data ?? response?.response?.response?.data;
    }
    throw new Error('Payment verification failed');
  } catch (error: any) {
    const be = error?.response?.data;
    const message = be?.errors?.message || be?.message || 'Failed to verify payment';
    throw new Error(message);
  }
};

export const fetchMapConvertById = async (id: number) => {
  try {
    const response = await GET(`${route.GET_MAP_CONVERT_BY_ID}${id}`);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const fetchFloorDropdown = async (payload: { projectName: string; tower: string; campaignId: number }) => {
  try {
    const query = new URLSearchParams(payload as any).toString();
    const response = await GET(`${eoiRoutes.FLOOR_DROPDOWN}?${query}`);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const fetchUnitDropdown = async (payload: { projectName: string; tower: string; floor: string; campaignId: number }) => {
  try {
    const query = new URLSearchParams(payload as any).toString();
    const response = await GET(`${eoiRoutes.UNIT_DROPDOWN}?${query}`);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const createMapAndConvert = async (payload: MapAndConvertPayload) => {
  try {
    const response = await POST(eoiRoutes.CREATE_MAP_AND_CONVERT, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.message;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message || 'Something went wrong'
    );
  }
};


export const eoiExportBookingForm = async (oppId: string) => {
  try {
    const response = await GET(`${eoiRoutes.EXPORT_BOOKING_FORM_PDF}/${oppId}`);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;
    const fileResponse = await fetch(fileUrl);
    const blob = await fileResponse.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = path?.split('/').pop() || 'booking-form.pdf';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};


// fetch source change request by id
export const fetchSourceChangeRequestById = async (id?: string, voucherId?: string) => {
  try {
   let url = route.FETCH_SOURCE_CHANGE_REQUEST_BY_ID;

    const params = new URLSearchParams();

    if (id) {
      params.append('id', id);
    }

    if (voucherId) {
      params.append('voucherId', voucherId);
    }

    const queryString = params.toString();

    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await GET(url);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const createSourceChangeRequest = async (payload: CreateSourceChangeRequestPayload) => {
  try {
    const response = await POST(eoiRoutes.CREATE_SOURCE_CHANGE_REQUEST, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error?.response?.data?.errors?.message || 'Something went wrong');
  }
};


// Approve / Reject Chane source request

export const approveOrRejectSourceChangeRequest = async (payload: SourceChangeRequestPayload) => {
  try {
    const response = await PATCH(eoiRoutes.APPROVE_REJECT_SOURCE_CHANGE_REQUEST, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message || 'Something went wrong'
    );
  }
};

export interface ManageSfdcOpportunityPayload {
  voucherId: number;
  sfdcEnquiryId: string;
  opportunityId: string;
}

export const manageSfdcOpportunity = async (payload: ManageSfdcOpportunityPayload) => {
  try {
    const response = await POST(eoiRoutes.MANAGE_SFDC_OPPORTUNITY, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response ?? response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error?.response?.data?.errors?.message || 'Something went wrong');
  }
};

/** GET `inventory-unit/approval-requests` — Approve Unit tab listing (same auth as other EOI calls). */
export const fetchInventoryUnitApprovalRequests = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const base = route.APPROVAL_REQUESTS_LIST;
  const url = queryString ? `${base}?${queryString}` : base;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const envelope = response.response as Record<string, unknown> | undefined;
      // { success, response: { data: { result, total } } } or flatter shapes
      const inner = envelope?.response as Record<string, unknown> | undefined;
      const rawData =
        (inner?.data as Record<string, unknown> | undefined) ??
        (envelope?.data as Record<string, unknown> | undefined) ??
        {};
      const rawRecords =
        rawData?.result ??
        rawData?.data ??
        rawData?.requests ??
        (Array.isArray(rawData) ? rawData : []);
      const listRaw = Array.isArray(rawRecords) ? rawRecords : [];

      const list = listRaw;

      const pagination = rawData?.pagination as Record<string, unknown> | undefined;
      let total = list.length;
      if (rawData?.total != null) {
        total = Number(rawData.total);
      } else if (pagination?.total != null) {
        total = Number(pagination.total);
      }

      let page = 1;
      if (rawData?.page != null) {
        page = Number(rawData.page);
      } else if (pagination?.page != null) {
        page = Number(pagination.page);
      }

      let pageSize = 10;
      if (rawData?.pageSize != null) {
        pageSize = Number(rawData.pageSize);
      } else if (pagination?.limit != null) {
        pageSize = Number(pagination.limit);
      } else if (pagination?.pageSize != null) {
        pageSize = Number(pagination.pageSize);
      }

      let pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      if (rawData?.pageCount != null) {
        pageCount = Number(rawData.pageCount);
      } else if (pagination?.totalPages != null) {
        pageCount = Number(pagination.totalPages);
      }

      return {
        data: list,
        total,
        page,
        pageSize,
        pageCount,
      };
    }

    throw new Error('Failed to fetch unit approval requests');
  } catch (error: any) {
    console.error('Unit approval requests listing error:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching unit approval requests';
    throw new Error(message);
  }
};

export const fetchChangeSourceListing = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.SOURCE_CHANGE_REQUEST_LIST}?${queryString}` : route.SOURCE_CHANGE_REQUEST_LIST;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const sourceChangeData = response.response?.response?.data || {};
      return {
        data: sourceChangeData?.requests || [],
        total: sourceChangeData?.pagination?.total || 0,
        page: sourceChangeData?.pagination?.page || 1,
        pageSize: sourceChangeData?.pagination?.limit || 10,
        pageCount: sourceChangeData?.pagination?.totalPages || 1,
      };
    }

    throw new Error('Failed to fetch change request request listing');
  } catch (error: any) {
    console.error('Failed to fetch change request request listing:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching change request request listing';
    throw new Error(message);
  }
};

export interface EOITabCountsResponse {
  changeRequestCount: number;
  cancellationCount: number;
  approveUnitCount: number;
}

export const fetchEOITabCounts = async (params?: { search?: string }): Promise<EOITabCountsResponse> => {
  const queryParams: Record<string, string> = {};
  if (params?.search) {
    queryParams.search = params.search;
  }
  const queryString = new URLSearchParams(queryParams).toString();
  const url = queryString ? `${route.EOI_TAB_COUNTS}?${queryString}` : route.EOI_TAB_COUNTS;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const data = response.response?.response?.data || response.response?.data || {};
      return {
        changeRequestCount: data?.changeRequestCount ?? data?.change_source_count ?? 0,
        cancellationCount: data?.cancellationCount ?? data?.cancellation_count ?? 0,
        approveUnitCount: data?.approveUnitCount ?? data?.approve_unit_count ?? 0,
      };
    }

    throw new Error('Failed to fetch EOI tab counts');
  } catch (error: any) {
    console.error('EOI tab counts error:', error);
    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching tab counts';
    throw new Error(message);
  }
};

export const approveUnit = async (id: string) => {
  try {
    const response = await PATCH(`${route.APPROVE_UNIT}${id}`, {});

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw error.response?.data?.errors?.message || 'Something went wrong';
  }
};

export const rejectUnit = async (id: string, rejectedReason: string) => {
  try {
    const response = await PATCH(`${route.REJECT_UNIT}${id}`, { rejectedReason });

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw error.response?.data?.errors?.message || 'Something went wrong';
  }
};

// Service to fetch Pre-Booking Docs in EOI Records
export const fetchPreBookingDocuments = async (voucherId: number) => {
  try {
    const response = await GET(`${route.EOI_GET_PRE_BOOKING_DOCUMENTS}/${voucherId}`);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message || 'Failed to fetch booking documents'
    );
  }
};

export type UpdateAgreementDetailsPayload = {
  agreementValue: number;
  bookingAmount: number | null;
};

export const updateAgreementDetails = async (
  id: number,
  payload: UpdateAgreementDetailsPayload
): Promise<ApiMutationResult> => {
  try {
    const response = await PATCH(`${route.SUBMIT_PRE_BOOKING_DOCUMENTS}${id}`, payload);

    if (response?.status === 200 || response?.status === 201) {
      return normalizeApiMutationResponse(response.response);
    }

    throw new Error('Unexpected response status');
  } catch (error: any) {
    const beMsg = error?.response?.data?.errors?.message;

    if (beMsg != null) {
      throw new Error(Array.isArray(beMsg) ? beMsg[0] : beMsg);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(String(error || 'Something went wrong'));
  }
};

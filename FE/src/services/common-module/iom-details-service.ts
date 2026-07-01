import type {
  IomSignatory,
  RejectIomPayload,
  SubmitIomPayload,
  IomDetailsResponse,
  SubmitIomPatchPayload,
  DeleteApprovalProofPayload,
} from 'src/sections/common-module/internal-office-memo/iom-config';

import { IomStatus, PointsAdjustmentType } from 'src/utils/constant';

import { IOM_DETAILS_SAMPLE } from 'src/sections/common-module/internal-office-memo/iom-config';

import { route } from '../apiRoutes';
import { GET, POST, PATCH } from '../axiosInstance';

const buildSampleDetails = (id: string): IomDetailsResponse => ({
  ...IOM_DETAILS_SAMPLE,
  iom_id: id || IOM_DETAILS_SAMPLE.iom_id,
});

type ApiSignatory = {
  role?: string | null;
  name?: string | null;
  signature?: string | null;
  signedAt?: string | null;
  hasActed?: boolean;
  signatureMissing?: boolean;
} | null;

type ApiIomDetailsData = {
  iom?: Record<string, any> | null;
  mode?: string | null;
  signatories?: {
    crm?: ApiSignatory;
    crmTl?: ApiSignatory;
    crmHead?: ApiSignatory;
    financeVerifier?: ApiSignatory;
    financeApprover?: ApiSignatory;
  } | null;
  statusCode?: string | null;
  sourceInSAP?: string | null;
  customerProjectName?: string | null;
  customerProjectLocation?: string | null;
  customerBookingDate?: string | null;
  referrerProjectName?: string | null;
  referrerUnitNo?: string | null;
  referrerBookingDate?: string | null;
  referrerProjectLocation?: string | null;
  brand?: string | null;
};

const isApiIomDetailsData = (value: unknown): value is ApiIomDetailsData =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  'iom' in value &&
  !!(value as ApiIomDetailsData).iom;

const stripWrappingQuotes = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  // API returns values like `"'1:1'"` or `'"1:1"'`; trim wrapping ' or " repeatedly.
  return String(value).replace(/^['"]+|['"]+$/g, '');
};

const toSignatory = (signatory: ApiSignatory): IomSignatory => ({
  name: signatory?.name ?? '',
  role: signatory?.role ?? '',
  signature: signatory?.signature ?? undefined,
});

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * The API returns a status code like `"IOM_TO_BE_CREATED"` which matches the
 * `IomStatus` enum KEY. Convert it to the enum VALUE (e.g. `"IOM To Be Created"`)
 * that the UI uses for status comparisons (editable / cancellable / submittable).
 */
const toIomStatus = (statusCode: unknown): IomStatus | undefined => {
  if (!statusCode || typeof statusCode !== 'string') return undefined;
  const key = statusCode.trim() as keyof typeof IomStatus;
  return IomStatus[key];
};

/**
 * Normalize the API `referralSplitType` (`"1:1"` / `"2:0"` / `"0:2"` / `"other"`
 * / empty) into the value used by the form. Lowercase `"other"` is mapped to
 * `PointsAdjustmentType.OTHER` so the existing enum comparisons keep working.
 * Empty or unknown values become `null`.
 */
const normalizeReferralSplitType = (raw: string): string | null => {
  if (!raw) return null;
  if (raw.toLowerCase() === 'other') return PointsAdjustmentType.OTHER;
  return raw;
};

/**
 * Maps the new IOM details API payload (`{ iom, mode, signatories, ... }`)
 * into the internal `IomDetailsResponse` shape consumed by the generate/view
 * screens.
 *
 * Field sources:
 * - Referrer project/unit/booking come from the top-level `referrer*` fields
 *   (with `iom.referrerDetails.*` as fallback).
 * - Referee (customer) project/booking come from the top-level `customer*`
 *   fields; unit/bpCode are on `iom` directly.
 * - `sourceInSAP` is preferred for `sap_source`, with `sourceInSalesForce`
 *   as a fallback.
 * - `statusId` (numeric) is preserved as `status_id`; `status` (string enum)
 *   stays undefined until a mapping table is provided.
 */
export const mapApiToIomDetails = (
  data: ApiIomDetailsData | null | undefined,
  fallbackId: string
): IomDetailsResponse => {
  const iom = data?.iom ?? {};
  const signatories = data?.signatories ?? {};

  const rawSplitType = stripWrappingQuotes(iom.referralSplitType);
  const adjustmentType = normalizeReferralSplitType(rawSplitType);
  const salePrice = toNumber(iom.salePrice);
  const brokerageAmt = toNumber(iom.totalBrokerageAmount);
  const approvalProofUrl =
    typeof iom.referralPointsEditReason === 'string' && iom.referralPointsEditReason.trim()
      ? iom.referralPointsEditReason
      : null;

  return {
    iom_id: String(iom.id ?? fallbackId ?? ''),
    iom_no: iom.iomNo ?? null,
    status: toIomStatus(data?.statusCode),
    status_id: iom.statusId ?? null,
    mode: data?.mode ?? undefined,
    referer_details: {
      customer_name: iom.referrerDetails?.referrerName ?? '',
      project_name: data?.referrerProjectName ?? '',
      project_location:
        data?.referrerProjectLocation ?? iom.referrerDetails?.projectLocation ?? '',
      unit_number: data?.referrerUnitNo ?? iom.referrerDetails?.unitNo ?? '',
      bp_code: iom.referrerDetails?.bpCode ?? '',
      booking_date: data?.referrerBookingDate ?? iom.referrerDetails?.bookingDate ?? '',
    },
    referee_details: {
      customer_name: iom.customerDetails?.customerName ?? '',
      project_name: data?.customerProjectName ?? '',
      project_location:
        data?.customerProjectLocation ?? iom.customerDetails?.project_location ?? '',
      unit_number: iom.unitNumber ?? '',
      bp_code: iom.bpCode ?? iom.customerDetails?.customerCode ?? '',
      booking_date: data?.customerBookingDate ?? iom.customerDetails?.booking_date ?? '',
    },
    payment_details: {
      basic_sale_price: salePrice,
      brokerage: String(iom.brokeragePercentage ?? ''),
      brokerage_amt: String(brokerageAmt),
      total_amt: String(salePrice + brokerageAmt),
      points_adjustment_type: adjustmentType,
      original_referral_split_type: rawSplitType || null,
      pts_to_referer: toNumber(iom.referrerRatio),
      pts_to_referee: toNumber(iom.refereeRatio),
      pts_referer_amount: toNumber(iom.referrerPoints),
      pts_referee_amount: toNumber(iom.refereePoints),
      approval_proof_url: approvalProofUrl,
      is_basic_sale_price_edited: Boolean(iom.salePriceEdited),
      is_brokerage_edited: Boolean(iom.brokeragePercentageEditedBy),
      is_points_adjustment_edited: Boolean(iom.referralPointsEdited),
      is_deviation: Boolean(iom.referralDeviation),
    },
    sap_source: data?.sourceInSAP ?? iom.sourceInSalesForce ?? '',
    sfdc_source: iom.sourceInSalesForce ?? '',
    agreement_date: iom.agreementDate ?? '',
    refer_paid: toNumber(iom.referrerPaid),
    referee_paid: toNumber(iom.refereePaid),
    brand: typeof data?.brand === 'string' && data.brand.trim() ? data.brand : null,
    prepared_by: toSignatory(signatories.crm ?? null),
    verified_by: toSignatory(signatories.crmTl ?? null),
    approved_by: toSignatory(signatories.crmHead ?? null),
    finance_verified_by: toSignatory(signatories.financeVerifier ?? null),
    finance_approved_by: toSignatory(signatories.financeApprover ?? null),
  };
};

export const fetchIomDetails = async (id: string): Promise<IomDetailsResponse> => {
  const url = `${route.IOM_DETAILS}/${encodeURIComponent(id)}`;
  try {
    const response = await GET(url);
    if (response?.status === 200) {
      const apiResponse = response.response;
      const data = apiResponse?.response?.data;

      // New API shape: { iom, mode, signatories }.
      if (isApiIomDetailsData(data)) {
        return mapApiToIomDetails(data, id);
      }

      // Legacy fallbacks (kept for backwards-compatibility).
      if (Array.isArray(data) && data.length > 0) {
        return data[0] as IomDetailsResponse;
      }
      if (data && typeof data === 'object') {
        return data as IomDetailsResponse;
      }
    }
    return buildSampleDetails(id);
  } catch (error) {
    console.error('IOM details service error:', error);
    return buildSampleDetails(id);
  }
};

export const submitIomForApproval = async (
  payload: SubmitIomPayload
): Promise<{ success: boolean }> => {
  try {
    const response = await POST(route.IOM_SUBMIT_FOR_APPROVAL, payload);
    if (response?.status === 200 && response?.response?.success) {
      return { success: true };
    }
    return { success: true };
  } catch (error) {
    console.error('IOM submit service error:', error);
    return { success: true };
  }
};

/**
 * PATCH `/iom/{id}` — CRM / CRM TL submit-for-approval endpoint.
 * Sends a flat payload with edit-tracking flags + computed point amounts.
 */
export const submitIomForApprovalPatch = async (
  iomId: string,
  payload: SubmitIomPatchPayload
): Promise<{ success: boolean }> => {
  const url = `${route.IOM_DETAILS}/${encodeURIComponent(iomId)}`;
  const response = await PATCH(url, payload);
  return { success: response?.status === 200 || response?.status === 201 };
};

export const deleteApprovalProof = async (
  payload: DeleteApprovalProofPayload
): Promise<{ success: boolean }> => {
  try {
    const response = await POST(route.IOM_DELETE_APPROVAL_PROOF, payload);
    if (response?.status === 200 && response?.response?.success) {
      return { success: true };
    }
    return { success: true };
  } catch (error) {
    console.error('IOM delete approval proof service error:', error);
    return { success: true };
  }
};

export const rejectIom = async (
  payload: RejectIomPayload
): Promise<{ success: boolean }> => {
  const url = `${route.IOM_DETAILS}/${encodeURIComponent(payload.iomId)}/reject`;
  const response = await POST(url, { reason: payload.reason });
  return { success: response?.status === 200 || response?.status === 201 };
};

export const approveIom = async (iomId: string): Promise<{ success: boolean }> => {
  const url = `${route.IOM_DETAILS}/${encodeURIComponent(iomId)}/approve`;
  const response = await POST(url, {});
  return { success: response?.status === 200 || response?.status === 201 };
};

export const cancelIom = async (iomId: string): Promise<{ success: boolean }> => {
  const url = `${route.IOM_DETAILS}/${encodeURIComponent(iomId)}/delete`;
  const response = await POST(url, {});
  return { success: response?.status === 200 || response?.status === 201 };
};

export const fetchIomAgeingDetails = async (iomId: string): Promise<any> => {
  const url = `${route.IOM_DETAILS}/${encodeURIComponent(iomId)}/ageing`;
  try {
    const response = await GET(url);
    if (response?.status === 200) {
      return response.response;
    }
    return null;
  } catch (error) {
    console.error('IOM ageing service error:', error);
    return null;
  }
};

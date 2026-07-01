import type { TransactionListResponse, UpdateTransactionPayload } from 'src/types/finance-admin/eoi-finance-record-details';

import { toast } from 'sonner';

import { downloadSampleExcelFromApiResponse } from 'src/utils/download-sample-excel';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { eoiRoutes } from '../EoiRoutes';
import { GET, POST, PATCH } from '../axiosInstance';



// Fetch transactions list for a specific voucher
export const fetchTransactionsList = async (
  id: string | number,
  params: Record<string, any> = {}
): Promise<TransactionListResponse> => {
  // Filter out empty/null parameters (excluding id since it goes in the URL path)
  const filteredParams: Record<string, any> = {};
  
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  
  // Include id in the URL path, and other params as query parameters
  const baseUrl = `${route.EOI_LIST_TRANSACTIONS}/${id}`;
  const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const apiResponse = response.response;
      const rawData = apiResponse?.response?.data || {};
      return rawData
    }

    throw new Error('Failed to fetch transactions list');
  } catch (error: any) {
    console.error('Transactions service error:', error);

    const message =
      error?.response?.data?.message || error?.message || 'Error while fetching transactions list';
    throw new Error(message);
  }
};

// Update transaction (verify, reverse, or reject)
export const updateTransaction = async (
  transactionId: number,
  payload: UpdateTransactionPayload
) => {
  try {
    const response = await PATCH(`${route.EOI_UPDATE_TRANSACTION}${transactionId}`, payload);
    
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data || response?.response?.data;
    }
    
    throw new Error('Failed to update transaction');
  } catch (error: any) {
    console.error('Update transaction service error:', error);
    
    const message =
      error?.response?.data?.errors?.message ||
      error?.response?.data?.message ||
      error?.message ||
      'Failed to update transaction';
    
    throw new Error(message);
  }
};

export type FinanceBulkJobRowFailure = {
  row?: number;
  /** Prefer `reasons`; some APIs send a single `reason` string instead. */
  reasons?: string[];
  reason?: string;
};

export type FinanceBulkJobReturnValue = {
  totalRows?: number;
  successCount?: number;
  failureCount?: number;
  failures?: FinanceBulkJobRowFailure[];
};

export type FinanceBulkJobStatusData = {
  jobId?: string;
  state?: string;
  name?: string;
  progress?: number;
  failedReason?: string | null;
  message?: string;
  /** Same level as `data` in API envelope (e.g. "Bulk transaction job status retrieved"). */
  apiResponseMessage?: string;
  fileName?: string;
  key?: string;
  returnvalue?: FinanceBulkJobReturnValue | Record<string, unknown>;
  [key: string]: unknown;
};

/** One line per failed reason (row repeated if multiple reasons). */
export function financeBulkJobFailureSummaryLines(job: FinanceBulkJobStatusData): string[] {
  const rv = job.returnvalue as FinanceBulkJobReturnValue | undefined;
  if (!rv?.failures?.length) {
    return [];
  }
  return rv.failures.flatMap((f) => {
    const rowLabel = f.row != null ? String(f.row) : '?';
    let reasons = Array.isArray(f.reasons)
      ? f.reasons.map((r) => String(r).trim()).filter(Boolean)
      : [];
    if (reasons.length === 0 && typeof f.reason === 'string' && f.reason.trim() !== '') {
      reasons = [f.reason.trim()];
    }
    if (reasons.length === 0) {
      return [`Row ${rowLabel}: Processing failed.`];
    }
    return reasons.map((r) => `Row ${rowLabel}: ${r}`);
  });
}

function mergeBulkJobStatusData(
  data: FinanceBulkJobStatusData,
  outerMessage: string | undefined
): FinanceBulkJobStatusData {
  const trimmed =
    typeof outerMessage === 'string' && outerMessage.trim() !== '' ? outerMessage.trim() : '';
  return trimmed ? { ...data, apiResponseMessage: trimmed } : { ...data };
}

/** GET bulk-update job status (progress 0–100, state completed | failed | …). */
export const fetchFinanceBulkJobStatus = async (
  jobId: string
): Promise<FinanceBulkJobStatusData> => {
  const res = await GET(eoiRoutes.FINANCE_BULK_JOB_STATUS(jobId));
  const raw = res?.response as {
    success?: boolean;
    response?: { statusCode?: number; message?: string; data?: FinanceBulkJobStatusData };
    errors?: { message?: string };
    message?: string;
    data?: FinanceBulkJobStatusData;
    statusCode?: number;
  };

  // Flat body: { statusCode: 200, message: "…", data: { jobId, state, … } }
  if (
    raw?.data != null &&
    typeof raw.data === 'object' &&
    (raw.statusCode === 200 || res.status === 200)
  ) {
    return mergeBulkJobStatusData(raw.data, raw.message);
  }

  // Wrapped: { success: true, response: { message, data } }
  if (raw?.success && raw?.response?.data != null) {
    return mergeBulkJobStatusData(raw.response.data, raw.response.message);
  }

  if (raw?.success === false) {
    throw new Error(
      raw?.errors?.message || raw?.message || 'Failed to fetch bulk job status'
    );
  }

  const inner = raw?.response;
  if (!inner?.data) {
    throw new Error(inner?.message || raw?.message || 'Invalid bulk job status response');
  }

  return mergeBulkJobStatusData(inner.data, inner.message);
};

export const downloadSampleFinanceExcel = async () => {
  try {
    const response = await GET(route.DOWNLOAD_SAMPLE_FINANCE_DOCUMENT);
    return downloadSampleExcelFromApiResponse(response);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const exportFinanceTxnList = async (payload: Record<string, any>) => {
   try {
    const queryParams = new URLSearchParams(payload as any).toString();
    const response = await GET(`${route.EXPORT_EOI_FINANCE_LIST}?${queryParams}`);
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

export const uploadPaymentReceipt = async ({
  id,
  payload,
}: {
  id: number;
  payload: { receiptImage: string };
}) => {
  try {
    const response = await POST(`${route.UPLOAD_RECEIPT}${id}`, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response.response;
    }

    throw new Error('Failed to upload receipt');
  } catch (error: any) {
    const be = error?.response?.data;

    const message =
      be?.errors?.message ||
      be?.message ||
      'Failed to upload receipt';

    throw new Error(message);
  }
};
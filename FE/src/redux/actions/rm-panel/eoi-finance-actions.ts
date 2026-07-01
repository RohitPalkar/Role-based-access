import type { TransactionListResponse, UpdateTransactionPayload } from 'src/types/finance-admin/eoi-finance-record-details';

import axios from 'axios';
import { toast } from 'sonner';
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';

import { EOIFinanceStatus } from 'src/utils/constant';

import { POST } from 'src/services/axiosInstance';
import { eoiRoutes } from 'src/services/EoiRoutes';
import {
  updateTransaction,
  exportFinanceTxnList,
  uploadPaymentReceipt,
  fetchTransactionsList,
  fetchFinanceBulkJobStatus,
  type FinanceBulkJobStatusData,
} from 'src/services/rm-panel/eoi-finance-service';

export interface FinanceTxnFileUploadPayload {
  key: string;
  presignedUrl: string;
  file: File;
  fileId: any;
  /** Map S3 upload bytes to 0..max (default 100). Use with job polling so the bar continues after save. */
  s3ProgressMaxPercent?: number;
}

const FINANCE_JOB_POLL_MS = 1500;
/** Wait before the first `.../jobs/:jobId` request so the queue can register. */
const FINANCE_JOB_FIRST_POLL_DELAY_MS = 1000;

/**
 * S3 byte progress maps to 0..this value; bulk job progress maps the remainder to 100.
 * Keeps the bar monotonic (no jump from “almost done” back to 0 when polling starts).
 */
export const FINANCE_TXN_S3_PROGRESS_MAX_PERCENT = 1;
const FINANCE_JOB_MAX_POLLS = 100;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Thrown from job poll / S3 / save when the server responds with 500 or 504 so the UI can offer reset. */
export type FinanceTxnRecoverableHttpReject = {
  recoverableHttp: true;
  httpStatus: 500 | 504;
  message: string;
};

export function isFinanceTxnRecoverableHttpReject(
  value: unknown
): value is FinanceTxnRecoverableHttpReject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as FinanceTxnRecoverableHttpReject;
  return (
    v.recoverableHttp === true && (v.httpStatus === 500 || v.httpStatus === 504) && typeof v.message === 'string'
  );
}

function toRecoverableHttpRejectFromAxios(e: any): FinanceTxnRecoverableHttpReject | null {
  const status = e?.response?.status as number | undefined;
  if (status !== 500 && status !== 504) {
    return null;
  }
  const data = e?.response?.data;
  const message =
    data?.errors?.message ||
    data?.message ||
    e?.message ||
    'Something went wrong. Please try again.';
  return { recoverableHttp: true, httpStatus: status, message: String(message) };
}

// Fetch transactions list
export const fetchTransactionsListAction = createAsyncThunk<
  TransactionListResponse,
  { id: string | number; params?: Record<string, any> },
  { rejectValue: string }
>('eoiFinance/fetchTransactionsList', async ({ id, params = {} }, { rejectWithValue }) => {
  try {
    return await fetchTransactionsList(id, params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching transactions list');
  }
});

// Update transaction (verify, reverse, reject)
export const updateTransactionAction = createAsyncThunk<
  any,
  { transactionId: number; payload: UpdateTransactionPayload },
  { rejectValue: string }
>('eoiFinance/updateTransaction', async ({ transactionId, payload }, { rejectWithValue }) => {
  try {
    const response = await updateTransaction(transactionId, payload);
    const statusMap = {
      [EOIFinanceStatus.VERIFIED]: EOIFinanceStatus.VERIFIED,
      [EOIFinanceStatus.REVERSED]: EOIFinanceStatus.REVERSED,
      [EOIFinanceStatus.REJECTED]: EOIFinanceStatus.REJECTED,
    };

    const actionText = statusMap[payload.status] ?? '';
                   
    toast.success(`Transaction ${actionText} successfully`);
    
    return response;
  } catch (error: any) {
    const message = error.message || error || 'Failed to update transaction';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const financeTxnProgress = createAction<{ fileId: any; progress: number }>(
  'financeTxn/financeTxnProgress'
);

/** Removes tracked progress for a file so the UI leaves the "uploading" state after errors. */
export const financeTxnUploadProgressClear = createAction<{ fileId: string }>(
  'financeTxn/financeTxnUploadProgressClear'
);

export const uploadFinanceTxnFile = createAsyncThunk<
  Response,
  FinanceTxnFileUploadPayload,
  { rejectValue: any }
>('uploadFinanceTxnFile', async (payload, thunkAPI) => {
  try {
    const res = await axios.put(payload.presignedUrl, payload.file, {
      headers: {
        'Content-Type': payload.file.type,
      },
      onUploadProgress: (progressEvent: any) => {
        const maxPct = payload.s3ProgressMaxPercent ?? 100;
        const ratio = Math.min(
          1,
          progressEvent.total > 0 ? progressEvent.loaded / progressEvent.total : 0
        );
        const progress = Math.min(maxPct, Math.round(ratio * maxPct));
        thunkAPI.dispatch(financeTxnProgress({ fileId: payload.fileId, progress }));
      },
    });

    if (res.status === 200) {
      return res.data;
    }
    return thunkAPI.rejectWithValue('Upload failed with unexpected status');
  } catch (error: any) {
    const recoverable = toRecoverableHttpRejectFromAxios(error);
    if (recoverable) {
      return thunkAPI.rejectWithValue(recoverable);
    }
    return thunkAPI.rejectWithValue(error.response?.data || 'Upload failed');
  }
});

function messageFromPollFailure(e: any): string {
  const recoverable = toRecoverableHttpRejectFromAxios(e);
  if (recoverable) {
    return recoverable.message;
  }
  if (!e?.response) {
    const code = e?.code as string | undefined;
    const msg = e?.message as string | undefined;
    if (code === 'ERR_NETWORK' || msg === 'Network Error') {
      return 'Could not verify your upload (network error or blocked request, e.g. CORS). Please try again or contact support.';
    }
    if (msg && typeof msg === 'string') {
      return msg;
    }
    return 'Failed to verify upload status. Please try again.';
  }
  const data = e?.response?.data;
  const fromBody =
    data?.errors?.message ||
    data?.message ||
    (typeof data === 'string' ? data : undefined);
  if (fromBody) {
    return String(fromBody);
  }
  if (e?.message) {
    return String(e.message);
  }
  return 'Failed to verify upload status. Please try again.';
}

export const pollFinanceBulkJobUntilDone = createAsyncThunk<
  FinanceBulkJobStatusData,
  { fileId: string; jobId: string; jobProgressBasePercent?: number },
  { rejectValue: FinanceTxnRecoverableHttpReject | string }
>(
  'finance/pollFinanceBulkJobUntilDone',
  async ({ fileId, jobId, jobProgressBasePercent = 0 }, { dispatch, signal, rejectWithValue }) => {
    if (signal.aborted) {
      return rejectWithValue('Cancelled');
    }
    const base = Math.min(100, Math.max(0, jobProgressBasePercent));
    await sleep(FINANCE_JOB_FIRST_POLL_DELAY_MS);
    if (signal.aborted) {
      return rejectWithValue('Cancelled');
    }

    /* Sequential polling: each request must complete before the next interval. */
    let pollAttempt = 0;
    /* eslint-disable no-await-in-loop */
    while (pollAttempt < FINANCE_JOB_MAX_POLLS) {
      if (signal.aborted) {
        return rejectWithValue('Cancelled');
      }

      try {
        const data = await fetchFinanceBulkJobStatus(jobId);
        const raw = Number(data.progress);
        const jobPct = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
        const mapped =
          base >= 100
            ? 100
            : Math.min(100, Math.round(base + (jobPct / 100) * (100 - base)));
        dispatch(financeTxnProgress({ fileId, progress: mapped }));

        const st = (data.state || '').toLowerCase();
        if (st === 'completed' || st === 'failed') {
          return data;
        }
      } catch (e: any) {
        const recoverable = toRecoverableHttpRejectFromAxios(e);
        if (recoverable) {
          return rejectWithValue(recoverable);
        }
        return rejectWithValue(messageFromPollFailure(e));
      }

      await sleep(FINANCE_JOB_POLL_MS);
      pollAttempt += 1;
    }
    /* eslint-enable no-await-in-loop */

    return rejectWithValue(
      'Job processing is taking longer than expected. Please check transaction list later.'
    );
  }
);

export const saveFinanceTxnDocument = createAsyncThunk(
  'finance/saveFinanceTxnDocument',
  async (
    payload: {
      fileName: string;
      key: string;
      campaignId?: number;
    },
    thunkAPI: any
  ) => {
    try {
      const res = await POST(eoiRoutes.SAVE_FINACE_TXN_DOCUMENT, payload);
      const inner = res?.response?.response as
        | { statusCode?: number; message?: string; data?: { jobId?: string | number } }
        | undefined;
      const accepted =
        res?.response?.success ||
        inner?.statusCode === 201 ||
        inner?.statusCode === 202;
      if (accepted && inner) {
        return inner;
      }
      return thunkAPI.rejectWithValue('Request was not successful');
    } catch (error: any) {
      const recoverable = toRecoverableHttpRejectFromAxios(error);
      if (recoverable) {
        return thunkAPI.rejectWithValue(recoverable);
      }
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const downloadFinanceTxnList = createAsyncThunk(
  'financeTxn/downloadFinanceTxnList',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try {
      const response = await exportFinanceTxnList(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || 'Oops! Something went wrong.');
    }
  }
);

export const uploadReceipt = createAsyncThunk(
  'finance/uploadReceipt',
  async (
    { id, payload }: { id: number; payload: { receiptImage: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await uploadPaymentReceipt({ id, payload });
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);
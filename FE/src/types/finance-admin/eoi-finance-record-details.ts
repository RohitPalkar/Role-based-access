import type { Dayjs } from "dayjs";
import type { EOIFinanceStatus } from "src/utils/constant";

export type FinanceRecordTableFilters = {
    search: string;
    projectIds: any,
    paymentStatus: string,
    startDate: null | Dayjs;
    endDate: null | Dayjs;
}
// Transaction list response interface
export interface FinanceRecordTableItem {
  id: number;
  srNo: number;
  paymentMode: string;
  date: string;
  transactionId: string;
  paidAmount: number;
  realisationDate?: string;
  receiptNo?: number;
  comments?: string;
  paymentProof?: any;
  chequeDepositSlip?: any;
  receiptImage?: string;
  status: string;
}

export interface TransactionListResponse {
  referenceId: string;
  result: FinanceRecordTableItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// Update transaction payload interface
export interface UpdateTransactionPayload {
  comments: string;
  receiptNo?: string;
  realisationDate?: string;
  status: EOIFinanceStatus.VERIFIED | EOIFinanceStatus.REVERSED | EOIFinanceStatus.REJECTED;
}
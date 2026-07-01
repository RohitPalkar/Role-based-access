import type { PayloadAction } from '@reduxjs/toolkit';
import type { FinanceRecordTableItem } from 'src/types/finance-admin/eoi-finance-record-details';

import { createSlice } from '@reduxjs/toolkit';

import {
  financeTxnProgress,
  saveFinanceTxnDocument,
  updateTransactionAction,
  fetchTransactionsListAction,
  financeTxnUploadProgressClear,
} from '../../actions/rm-panel/eoi-finance-actions';

interface UploadState {
  progress: number;
}
// Define the state interface
export interface EoiFinanceState {
  transactionsList: FinanceRecordTableItem[];
  referenceId:string;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
  updating: boolean;
  updateError: string | null;
  financeTxnUploads: Record<string, UploadState>;
}

// Define the initial state
const initialState: EoiFinanceState = {
  transactionsList: [],
  referenceId: '',
  total: 0,
  page: 1,
  pageSize: 10,
  pageCount: 1,
  loading: false,
  error: null,
  updating: false,
  updateError: null,
  financeTxnUploads: {},
};

// Create the slice
const eoiFinanceSlice = createSlice({
  name: 'eoiFinance',
  initialState,
  reducers: {
    // Clear error states
    clearErrors: (state) => {
      state.error = null;
      state.updateError = null;
    },
    // Reset the entire state
    resetState: () => initialState,
    // Update a specific transaction in the list
    updateTransactionInList: (state, action: PayloadAction<{ id: number; updates: Partial<FinanceRecordTableItem> }>) => {
      const { id, updates } = action.payload;
      const index = state.transactionsList.findIndex((transaction: { id: number; }) => transaction.id === id);
      if (index !== -1) {
        state.transactionsList[index] = { ...state.transactionsList[index], ...updates };
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch transactions list
    builder
      .addCase(fetchTransactionsListAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionsListAction.fulfilled, (state, action) => {
        state.loading = false;
        state.transactionsList = action.payload.result;
        state.referenceId = action.payload.referenceId;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.pageCount = action.payload.pageCount;
        state.error = null;
      })
      .addCase(fetchTransactionsListAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch transactions';
        state.transactionsList = [];
        state.referenceId = '';

        state.total = 0;
      });

    // Update transaction
    builder
      .addCase(updateTransactionAction.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateTransactionAction.fulfilled, (state) => {
        state.updating = false;
        state.updateError = null;
        // The transaction will be updated in the list via the component logic
        // or by triggering a refresh of the transactions list
      })
      .addCase(updateTransactionAction.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload || 'Failed to update transaction';
      });
      builder
        .addCase(financeTxnProgress, (state, action) => {
          const { fileId, progress } = action.payload;
          if (!state.financeTxnUploads[fileId]) {
            state.financeTxnUploads[fileId] = { progress: 0 };
          }
          state.financeTxnUploads[fileId].progress = progress;
        })
        .addCase(financeTxnUploadProgressClear, (state, action) => {
          delete state.financeTxnUploads[action.payload.fileId];
        })
        .addCase(saveFinanceTxnDocument.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(saveFinanceTxnDocument.fulfilled, (state) => {
          state.loading = false;
        })
        .addCase(saveFinanceTxnDocument.rejected, (state, action) => {
          state.loading = false;
          state.financeTxnUploads = {};
          const p = action.payload as any;
          if (p && typeof p === 'object' && p.recoverableHttp && p.message) {
            state.error = String(p.message);
          } else if (typeof p === 'string') {
            state.error = p;
          } else {
            state.error = p?.errors?.message ?? p?.message ?? 'Failed to save document';
          }
        });
  },
});

// Export actions
export const { clearErrors, resetState, updateTransactionInList } = eoiFinanceSlice.actions;

// Export reducer
export default eoiFinanceSlice.reducer;
// src/redux/slices/admin/log-history.ts

import type { PayloadAction } from '@reduxjs/toolkit';

import { createSlice } from '@reduxjs/toolkit';

import { fetchLogHistory } from '../../actions/finance-admin/log-history-action';

import type { ILogHistoryResponse } from '../../../types/finance-admin/log-history';

// Define the initial state
interface LogHistoryState {
  logHistory: ILogHistoryResponse[];
  loading: boolean;
  error: string | null;
  totalCount: number | null;
}

const initialState: LogHistoryState = {
  logHistory: [],
  loading: false,
  error: null,
  totalCount: null,
};

// Create a thunk to fetch incentives

// Create a slice
const logHistorySlice = createSlice({
  name: 'logHistory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogHistory.fulfilled, (state, action: PayloadAction<ILogHistoryResponse>) => {
        state.loading = false;
        // @ts-ignore
        state.logHistory = action.payload.structures.logs;
        state.totalCount = action.payload.total;
      })
      .addCase(fetchLogHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export the reducer
export default logHistorySlice.reducer;

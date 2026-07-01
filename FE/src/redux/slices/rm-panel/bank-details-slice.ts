import type { BankDetailsListData } from 'src/services/rm-panel/bank-details-service';

import { createSlice } from '@reduxjs/toolkit';

import { fetchBankDetailsList } from 'src/redux/actions/rm-panel/bank-details-actions';

interface BankDetailsListState {
  bankDetailsList: BankDetailsListData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: BankDetailsListState = {
  bankDetailsList: [],
  total: 0,
  page: 1,
  pageSize: 0,
  pageCount: 0,
  loading: false,
  error: null,
};

const bankDetailsSlice = createSlice({
  name: 'bankDetails',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBankDetailsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchBankDetailsList.fulfilled, (state, action) => {
        state.loading = false;
        state.bankDetailsList = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.pageCount = action.payload.pageCount;
      })

      .addCase(fetchBankDetailsList.rejected, (state, action) => {
        state.loading = false;
        state.bankDetailsList = [];
        state.error = action.payload ?? 'Failed to fetch bank details data';
      });
  },
});

export default bankDetailsSlice.reducer;

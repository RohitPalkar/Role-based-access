// src/store/report-slice.ts
import type { IReportsResponse } from 'src/types/admin/services/reports';

import { createSlice } from '@reduxjs/toolkit';

import { fetchReports } from '../../actions/admin/reports-actions';

interface ReportState {
  reports: IReportsResponse[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reports: [],
  loading: false,
  error: null,
};

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        // @ts-ignore
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch reports';
      });
  },
});

export default reportSlice.reducer;

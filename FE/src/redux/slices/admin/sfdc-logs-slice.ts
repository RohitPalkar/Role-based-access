import { createSlice } from '@reduxjs/toolkit';

import { fetchSFDCLogById, fetchSFDCLogsList } from 'src/redux/actions/admin/sfdc-logs-actions';

type SFDCLogsState = {
  sfdcLogs: {
    total: number;
    logs: any[];
  };
  sfdcLogById: any | null;
  loading: boolean;
  error: string | null;
};

const initialState: SFDCLogsState = {
  sfdcLogs: {
    total: 0,
    logs: [],
  },
  sfdcLogById: null,
  loading: false,
  error: null,
};

const sfdcLogsSlice = createSlice({
  name: 'sfdcLogsHistory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSFDCLogsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSFDCLogsList.fulfilled, (state, action) => {
        state.loading = false;
        state.sfdcLogs = action.payload;
      })
      .addCase(fetchSFDCLogsList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      .addCase(fetchSFDCLogById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSFDCLogById.fulfilled, (state, action) => {
        state.loading = false;
        state.sfdcLogById = action.payload;
      })
      .addCase(fetchSFDCLogById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default sfdcLogsSlice.reducer;
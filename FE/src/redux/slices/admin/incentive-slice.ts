import type { PayloadAction } from '@reduxjs/toolkit';
import type { Regions, Incentive, IncentiveResponse } from 'src/types/admin/services/incetive';

import { createSlice } from '@reduxjs/toolkit';

import { fetchIncentives, fetchRegionOptions } from 'src/redux/actions/admin/incentive-actions';

interface IncentiveState {
  incentiveLists: Incentive[];
  regionOptions: Regions[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: IncentiveState = {
  incentiveLists: [],
  regionOptions: [],
  total: 5,
  loading: false,
  error: null,
};

const incentiveSlice = createSlice({
  name: 'incentives',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncentives.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncentives.fulfilled, (state, action: PayloadAction<IncentiveResponse>) => {
        state.loading = false;
        state.error = null;
        state.incentiveLists = Array.isArray(action?.payload?.policies) ? action.payload.policies : [];
        state.total = action?.payload?.total || 0;
      })
      .addCase(fetchIncentives.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch incentives';
        state.incentiveLists = [];
        state.total = 0;
      });

    builder
      .addCase(fetchRegionOptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRegionOptions.fulfilled, (state, action: PayloadAction<Regions[]>) => {
        state.loading = false;
        state.regionOptions = action.payload;
      })
      .addCase(fetchRegionOptions.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.loading = false;
        state.error = action.payload || 'Something went wrong';
      });
  },
});

export default incentiveSlice.reducer;

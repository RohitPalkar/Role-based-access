import type { PayloadAction } from '@reduxjs/toolkit';
import type { Data } from 'src/types/admin/services/incentive-slabs';

import { createSlice } from '@reduxjs/toolkit';

import { fetchIncentiveSlabs } from 'src/redux/actions/incentive-dashboard/incentive-slab-action';

interface IncentiveState {
  incentiveSlabs: Data;
  loading: boolean;
  error: string | null;
}

const initialState: IncentiveState = {
  incentiveSlabs: {
    brand: null,
    incentivePolicy: [],
    boosters: [],
  },
  loading: false,
  error: null,
};

const incentiveSlabsSlice = createSlice({
  name: 'incentiveSlabs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncentiveSlabs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncentiveSlabs.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.incentiveSlabs = action?.payload || {
          brand: null,
          incentivePolicy: [],
          boosters: [],
        };
      })
      .addCase(fetchIncentiveSlabs.rejected, (state, action) => {
        state.loading = false;
        state.error = (action?.payload as string) || action?.error?.message || 'Failed to load incentive slabs';
      });
  },
});

export default incentiveSlabsSlice.reducer;

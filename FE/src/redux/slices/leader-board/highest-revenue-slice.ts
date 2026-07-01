import type { PayloadAction } from '@reduxjs/toolkit';
import type { RevenueEntry, HighestRevenueState } from 'src/types/leader-board/highest-revenue';

import { createSlice } from '@reduxjs/toolkit';

import { getHighestRevenue } from 'src/redux/actions/leader-board/highest-revenue-action';

// Initial state
const initialState: HighestRevenueState = {
  revenue: [],
  loading: false,
  error: null,
};

// Create the slice
const highestRevenueSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getHighestRevenue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHighestRevenue.fulfilled, (state, action: PayloadAction<RevenueEntry[]>) => {
        state.loading = false;
        state.revenue = action.payload;
      })
      .addCase(getHighestRevenue.rejected, (state, action) => {
        state.loading = false;
        state.revenue = [];
        state.error = action.payload as string;
      });
  },
});

export default highestRevenueSlice.reducer;

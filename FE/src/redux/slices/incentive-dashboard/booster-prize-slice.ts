import type { BoosterPrizeState } from 'src/types/incentive-dashboard/booster-prize';

import { createSlice } from '@reduxjs/toolkit';

import getBoosterPrize from '../../actions/incentive-dashboard/booster-prize-action';

// Initial state
const initialState: BoosterPrizeState = {
  boosterPrize: [],
  loading: false,
  error: null,
};

// Slice
const boosterPrizeSlice = createSlice({
  name: 'boosterPrize',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getBoosterPrize.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBoosterPrize.fulfilled, (state, action) => {
        state.loading = false;
        state.boosterPrize = action.payload;
      })
      .addCase(getBoosterPrize.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default boosterPrizeSlice.reducer;

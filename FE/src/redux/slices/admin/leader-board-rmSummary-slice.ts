
import { createSlice } from '@reduxjs/toolkit';

import { fetchLeaderBoardRMSummary } from 'src/redux/actions/admin/leader-board-rmSummary-actions';

// ----------------------------------------------------------------------

type LeaderBoardRMSummaryState = {
  leaderBoardRMSummary: any;
  loading: boolean;
  error: string | null;
};

const initialState: LeaderBoardRMSummaryState = {
  leaderBoardRMSummary: [],
  loading: false,
  error: null,
};

const leaderBoardRMSummarySlice = createSlice({
  name: 'leaderBoardRMSummary',
  initialState,
  reducers: {
    clearLeaderBoardRMSummary: (state) => {
      state.leaderBoardRMSummary = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Leader Board Bookings
      .addCase(fetchLeaderBoardRMSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaderBoardRMSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.leaderBoardRMSummary = action.payload.leaderBoardRMSummary;
      })
      .addCase(fetchLeaderBoardRMSummary.rejected, (state, action) => {
        state.loading = false;
        state.leaderBoardRMSummary = [];
        state.error = action.error.message || 'Failed to fetch leader board bookings';
      });
  },
});

export const { clearLeaderBoardRMSummary } = leaderBoardRMSummarySlice.actions;

export default leaderBoardRMSummarySlice.reducer;
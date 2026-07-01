import type { LeaderboardCards, EOILeaderboardData } from 'src/services/rm-panel/eoi-leaderboard-service';

import { createSlice } from '@reduxjs/toolkit';

import { fetchEOILeaderboardList } from 'src/redux/actions/rm-panel/eoi-leaderboard-actions';

interface EOILeaderboardState {
  leaderboardList: EOILeaderboardData[];
  cards: LeaderboardCards | null;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: EOILeaderboardState = {
  leaderboardList: [],
  cards: null,
  total: 0,
  page: 1,
  pageSize: 0,
  pageCount: 0,
  loading: false,
  error: null,
};

const eoiLeaderboardSlice = createSlice({
  name: 'eoiLeaderboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEOILeaderboardList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchEOILeaderboardList.fulfilled, (state, action) => {
        state.loading = false;
        state.leaderboardList = action.payload.data;
        state.total = action.payload.total;
        state.cards = action.payload.cards;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.pageCount = action.payload.pageCount;
      })

      .addCase(fetchEOILeaderboardList.rejected, (state, action) => {
        state.loading = false;
        state.leaderboardList = [];
        state.error = action.payload ?? 'Failed to fetch leaderboard data';
      });
  },
});

export default eoiLeaderboardSlice.reducer;

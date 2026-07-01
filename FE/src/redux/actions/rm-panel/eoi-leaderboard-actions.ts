import type { LeaderboardCards, EOILeaderboardData } from 'src/services/rm-panel/eoi-leaderboard-service';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { fetchLeaderboardList, exportEOILeaderboardList } from 'src/services/rm-panel/eoi-leaderboard-service';

interface LeaderboardParams {
  data: EOILeaderboardData[];
  cards: LeaderboardCards;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const fetchEOILeaderboardList = createAsyncThunk<
  LeaderboardParams,
  Record<string, any>,
  { rejectValue: string }
>('fetchEOILeaderboardList', async (params, { rejectWithValue }) => {
  try {
    return await fetchLeaderboardList(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching leaderboard list');
  }
});

export const downloadEOILeaderboardList = createAsyncThunk(
  'eoiLeaderboard/downloadEOILeaderboardList',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try {
      const response = await exportEOILeaderboardList(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || 'Oops! Something went wrong.');
    }
  }
);
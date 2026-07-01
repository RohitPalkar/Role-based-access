import type { ILeaderBoardRMSummaryResponse } from 'src/types/admin/feature/leader-board-rmSummary';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { getLeaderBoardRMSummary, exportLeaderBoardRMSummary } from 'src/services/admin-services/leader-board-rmSummary-service';

// ----------------------------------------------------------------------

export const fetchLeaderBoardRMSummary = createAsyncThunk<ILeaderBoardRMSummaryResponse, any>(
  'leaderBoardRMSummary/fetchLeaderBoardRMSummary',
  async (payload: any, thunkAPI) => {
    try {
      const result = await getLeaderBoardRMSummary(payload);
      return { 
        leaderBoardRMSummary: result?.data || [], 
        total: result?.data?.total || 0,
        page: payload?.page || 1,
        limit: payload?.limit || 10
      };
    } catch (error: any) {
      console.error(error);
      return thunkAPI.rejectWithValue('Failed to fetch leader board bookings');
    }
  }
);
export const downloadLeaderBoardRMSummary = createAsyncThunk(
  'downloadLeaderBoardRMSummary',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await exportLeaderBoardRMSummary(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);
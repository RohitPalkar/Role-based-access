import type { IUserBookingsResponse } from 'src/types/admin/services/reports';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { getReports, getUserBookings } from '../../../services/admin-services/reports-service';

// Async thunk to fetch reports
export const fetchReports = createAsyncThunk(
  'incentiveReports/fetchReports',
  async ({ startDate, endDate, rmId }: { startDate: string | null; endDate: string | null; rmId?: string | null }) => {
    const response = await getReports(startDate, endDate, rmId);
    return response;
  }
);

export const fetchUserBookings = createAsyncThunk<IUserBookingsResponse, any>(
  'fetchUserBookings',
  // @ts-ignore
  async (payload: any, thunkAPI) => {
    try {
      const result = await getUserBookings(payload);
      return { bookings: result || [], total: result?.data?.total };
    } catch (error: any) {
      console.error(error);
      return thunkAPI.rejectWithValue('Failed to fetch incentives');
    }
  }
);

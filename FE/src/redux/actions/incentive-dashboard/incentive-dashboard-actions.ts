import type { IncentiveCardData } from 'src/services/incentive-dashboard-services/incentive-dashboard';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { fetchIncentiveCards, fetchIncentiveDashboard } from 'src/services/incentive-dashboard-services/incentive-dashboard';


// Async thunk for fetching incentive data
export const fetchIncentiveDashboardData = createAsyncThunk(
  'incentiveDashboard/fetchData',
  async (params: any, { rejectWithValue }) => {
    try {
      return await fetchIncentiveDashboard(params);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error fetching data');
    }
  }
);

export const fetchIncentiveCardData = createAsyncThunk<IncentiveCardData[], {rmId?: any; projectIds: any; year: string ; month: string  }>(
  'incentive/fetchIncentiveCards',
  async (filters: any) => {
    try {
      const res = await fetchIncentiveCards(filters);
      return res;
    } catch (error: any) {
      return (error?.message || 'Error fetching data');
    }
  }
);

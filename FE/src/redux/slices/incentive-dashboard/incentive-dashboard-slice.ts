import type { PayloadAction } from '@reduxjs/toolkit';
import type { IncentiveDashboardItem } from 'src/sections/rm-panel/incentive-dashboard/incentive-view/incentive-dashboard-table-view';

import { createSlice } from '@reduxjs/toolkit';

import {
  fetchIncentiveDashboardData,
} from 'src/redux/actions/incentive-dashboard/incentive-dashboard-actions';

interface Incentive {
  data: IncentiveDashboardItem[];
  total: number;
}

interface IncentiveState {
  incentiveData: IncentiveDashboardItem[];
  loading: boolean;
  error: string | null;
  incentiveCount: number;
  cards: IncentiveCardData[] | null;
  activeCardId: any | null;
}

const initialState: IncentiveState = {
  incentiveData: [],
  incentiveCount: 0,
  activeCardId: null,
  loading: false,
  error: null,
  cards: [],
};

export interface IncentiveCardData {
  type: string;
  id: number;
  title: string;
  amount: number;
  subtitle?: string;
  subtitleAmount: number;
  status: string;
  gradientColor: string;
}

const incentiveDashboardSlice = createSlice({
  name: 'incentiveDashboard',
  initialState,
  reducers: {
    // Add a regular reducer for setting a piece of state

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncentiveDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncentiveDashboardData.fulfilled, (state, action: PayloadAction<Incentive>) => {
        state.loading = false;
        state.incentiveData = action.payload.data;
        state.incentiveCount = action.payload.total;
      })
      .addCase(fetchIncentiveDashboardData.rejected, (state, action) => {
        state.incentiveData = [];
        state.incentiveCount = 0;
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch data';
      });
    
  },
});


export default incentiveDashboardSlice.reducer;

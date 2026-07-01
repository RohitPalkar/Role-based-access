import type {
  EOIDashboardCards,
  DailyTrackerResponse,
  EOIDashboardCampaign,
  InventoryWiseSplitListResponse,
} from 'src/services/admin-services/eoi-dashboard-service';

import { createSlice } from '@reduxjs/toolkit';

import { fetchDailyTracker, fetchEOIDashboardList, fetchInventoryWiseSplit } from 'src/redux/actions/admin/eoi-dashboard-actions';

interface EOIDashboardState {
  campaigns: EOIDashboardCampaign[];
  cards: EOIDashboardCards | null;
  limit: number;
  page: number;
  pages: number;
  total: number;
  loading: boolean;
  error: string | null;
  inventoryWiseSplit: InventoryWiseSplitListResponse | null;
    dailyTrackerData: DailyTrackerResponse | null;

}

const initialState: EOIDashboardState = {
  campaigns: [],
  cards: null,
  limit: 10,
  page: 1,
  pages: 1,
  total: 0,
  loading: false,
  error: null,
  inventoryWiseSplit: null,
  dailyTrackerData: null,
};

const eoiDashboardSlice = createSlice({
  name: 'eoiDashboard',
  initialState,
  reducers: {
    resetEOIDashboardList: (state) => {
      state.campaigns = [];
      state.cards = null;
      state.limit = 10;
      state.page = 1;
      state.pages = 1;
      state.total = 0;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEOIDashboardList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEOIDashboardList.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload?.campaigns || [];
        state.cards = action.payload?.cards || null;
        state.limit = action.payload?.limit || 10;
        state.page = action.payload?.page || 1;
        state.pages = action.payload?.pages || 1;
        state.total = action.payload?.total || 0;
      })
      .addCase(fetchEOIDashboardList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchInventoryWiseSplit.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchInventoryWiseSplit.fulfilled, (state, action) => {
        state.inventoryWiseSplit = action.payload;
      })
      .addCase(fetchInventoryWiseSplit.rejected, (state, action) => {
        state.error = action.payload as string;
        state.inventoryWiseSplit = null;
      })
       .addCase(fetchDailyTracker.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchDailyTracker.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyTrackerData = action.payload;
      })
      .addCase(fetchDailyTracker.rejected, (state, action) => {
        state.error = action.payload as string;
        state.dailyTrackerData = null;
      });
  },
});

export const { resetEOIDashboardList } = eoiDashboardSlice.actions;
export default eoiDashboardSlice.reducer;

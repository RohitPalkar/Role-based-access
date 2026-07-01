import type { GREDashboardListItem } from 'src/services/gre-dashboard-services/gre-dashboard.service';

import { createSlice } from '@reduxjs/toolkit';

import {
  fetchGREDashboardCardData,
  fetchGREDashboardTableData,
  fetchGREDashboardSingleItem,
} from 'src/redux/actions/gre/gre-action';

export interface GREDashboardTableData {
  data: GREDashboardListItem[];
  page: number;
  limit: number;
  totalCount: number;
}

export interface CRMState {
  cards: Array<{ id: number; title: string; value: number | string }>;
  table: {
    data: GREDashboardTableData | null; // <-- object, not just array
    total: number;
  };
  selectedItem: GREDashboardListItem | null;
  loading: boolean;
  error: string | null;
}

const initialState: CRMState = {
  cards: [],
  table: {
    data: null, // no data initially
    total: 0,
  },
  selectedItem: null,
  loading: false,
  error: null,
};

const greDashboardSlice = createSlice({
  name: 'crmDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // ------- Card Data -------
    builder.addCase(fetchGREDashboardCardData.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchGREDashboardCardData.fulfilled, (state, action) => {
      state.loading = false;
      state.cards = action.payload;
    });
    builder.addCase(fetchGREDashboardCardData.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ------- Table Data -------
    builder.addCase(fetchGREDashboardTableData.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchGREDashboardTableData.fulfilled, (state, action) => {
      state.loading = false;
      state.table = {
        data: action.payload.data, // { data: [...], page, limit, totalPages }
        total: action.payload.total, // backend total
      };
    });

    builder.addCase(fetchGREDashboardTableData.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ------- Single Item Data -------
    builder.addCase(fetchGREDashboardSingleItem.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchGREDashboardSingleItem.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedItem = action.payload;
    });
    builder.addCase(fetchGREDashboardSingleItem.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export default greDashboardSlice.reducer;

import type { PayloadAction } from "@reduxjs/toolkit";
import type { SemiCircleChartData, SemiCircleChartResponse } from "src/types/admin/services/rm-dashboard-chart-data";

import { createSlice } from "@reduxjs/toolkit";

import { fetchCurrentSalesChartData } from "src/redux/actions/incentive-dashboard/dashboard-charts-actions";




export interface semicircleChartDataState {
  semicircleChartData?: SemiCircleChartData;
  loading?: boolean;
  error?: string | null;
}
export const initialState: semicircleChartDataState = {
  semicircleChartData: {},
  loading: false,
  error: null,
};

const currentSalesChartSlice = createSlice({
  name: 'semicircleChartData',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentSalesChartData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentSalesChartData.fulfilled, (state, action: PayloadAction<SemiCircleChartResponse>) => {
        state.loading = false;
        state.semicircleChartData = action?.payload?.currentSalesChartData ?? {}
      })
      .addCase(fetchCurrentSalesChartData.rejected, (state, action) => {
        state.loading = false;
        state.semicircleChartData = {};
        state.error = (action.payload as string) || 'Failed to edit post';
      });
  },
});

export default currentSalesChartSlice.reducer;
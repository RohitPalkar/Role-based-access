import type { SemiCircleChartResponse } from "src/types/admin/services/rm-dashboard-chart-data";

import { createAsyncThunk } from "@reduxjs/toolkit";

import { getCurrentSalesData } from "src/services/incentive-dashboard-services/chart-data";


// Async thunk for fetching projects
export const fetchCurrentSalesChartData = createAsyncThunk<SemiCircleChartResponse, any>(
    'fetchCurrentSalesChartData',
    // @ts-ignore
    async (payload: any, thunkAPI) => {
        try {
            const result = await getCurrentSalesData(payload);
            return {
                currentSalesChartData: result
                // , total: result?.total
            };
        } catch (error: any) {
            console.error(error)
            return thunkAPI.rejectWithValue('Failed to fetch incentives');
        }
    }
);

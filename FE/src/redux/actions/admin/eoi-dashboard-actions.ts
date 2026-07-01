import type {
  DailyTrackerPayload,
  DailyTrackerResponse,
  EOIDashboardListPayload,
  InventoryWiseSplitListPayload,
  InventoryWiseSplitListResponse,
} from 'src/services/admin-services/eoi-dashboard-service';

import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  getDailyTracker,
  getEOIDashboardList,
  exportEOIDashboardList,
  getInventoryWiseSplitList,
} from 'src/services/admin-services/eoi-dashboard-service';

export const fetchEOIDashboardList = createAsyncThunk(
  'eoiDashboard/fetchEOIDashboardList',
  async (payload: EOIDashboardListPayload, { rejectWithValue }) => {
    try {
      const response = await getEOIDashboardList(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || 'Oops! Something went wrong.');
    }
  }
);

export const downloadEOIDashboardList = createAsyncThunk(
  'eoiDashboard/downloadEOIDashboardList',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try {
      const response = await exportEOIDashboardList(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || 'Oops! Something went wrong.');
    }
  }
);

export const fetchInventoryWiseSplit = createAsyncThunk<
  InventoryWiseSplitListResponse,
  InventoryWiseSplitListPayload,
  { rejectValue: string }
>('eoiDashboard/fetchInventoryWiseSplit', async (payload, { rejectWithValue }) => {
  try {
    const response = await getInventoryWiseSplitList(payload);
    return response;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Oops! Something went wrong.');
  }
});
export const fetchDailyTracker = createAsyncThunk<
  DailyTrackerResponse,
  DailyTrackerPayload,
  { rejectValue: string }
>('dailyTracker/fetchDailyTracker', async (payload, { rejectWithValue }) => {
  try {
    const response = await getDailyTracker(payload);
    return response;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Oops! Something went wrong.');
  }
});
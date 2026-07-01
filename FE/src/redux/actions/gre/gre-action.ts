import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  fetchGREDashboardList,
  fetchGREDashboardItem,
  type GREDashboardListItem,
  type GREDashboardListParams,
} from '../../../services/gre-dashboard-services/gre-dashboard.service';

// Fetch GRE Dashboard table data
export const fetchGREDashboardTableData = createAsyncThunk(
  'crmDashboard/fetchTableData',
  async (params: GREDashboardListParams | undefined, { rejectWithValue }) => {
    try {
      const res = await fetchGREDashboardList(params || {});
      return res;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error fetching GRE dashboard data');
    }
  }
);

// Fetch GRE Dashboard single item
export const fetchGREDashboardSingleItem = createAsyncThunk<GREDashboardListItem, string>(
  'crmDashboard/fetchSingleItem',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetchGREDashboardItem(id);
      return res;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error fetching GRE dashboard item');
    }
  }
);

// Mock card data function for compatibility (can be removed later when card API is available)
export const fetchGREDashboardCardData = createAsyncThunk(
  'crmDashboard/fetchCardData',
  async (filters: Record<string, any> | undefined, { rejectWithValue }) => {
    try {
      // Mock card data for now
      const mockCardData = [
        { id: 1, title: 'Total Enquiries', value: 150 },
        { id: 2, title: 'Active Projects', value: 12 },
        { id: 3, title: 'Pending Follow-ups', value: 34 },
        { id: 4, title: 'Completed', value: 56 },
      ];
      return mockCardData;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error fetching card data');
    }
  }
);

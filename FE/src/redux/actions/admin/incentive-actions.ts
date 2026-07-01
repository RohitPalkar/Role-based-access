import type { Regions, IncentiveResponse } from 'src/types/admin/services/incetive';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { getIncentiveList, getRegionOptions } from 'src/services/admin-services/incentive-srvice';

// Async thunk for fetching incentives
export const fetchIncentives = createAsyncThunk<IncentiveResponse, any>(
  'fetchIncentives',
  async (payload: any, { rejectWithValue }) => {
    try {
      const result = await getIncentiveList(payload);
      if (!result) {
        throw new Error('No data received from API');
      }
      return {
        policies: Array.isArray(result?.policies) ? result.policies : [],
        total: result?.total || 0 
      };
    } catch (error: any) {
      console.error('fetchIncentives error:', error);
      return rejectWithValue(error?.message || 'Failed to fetch incentives');
    }
  }
);

export const fetchRegionOptions = createAsyncThunk<Regions[], void, { rejectValue: string }>(
  'regions/fetchRegionOptions',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getRegionOptions();
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.errors?.message || 'Failed to fetch Regions'
      );
    }
  }
);

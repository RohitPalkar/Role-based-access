import { createAsyncThunk } from '@reduxjs/toolkit';

import { GET } from 'src/services/axiosInstance';

import { route } from '../../../services/apiRoutes';
import { GET_MASTER_DATA, GET_OPPORTUNITY_DETAILS } from '../types';

export const getOpportunityDetails = createAsyncThunk(
  GET_OPPORTUNITY_DETAILS,
  async (payload: any) => {
    try {
      const result = await GET(route.GET_OPPORTUNITY_DETAILS, payload);
      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result?.status };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  }
);
export const getMasterDataList = createAsyncThunk(GET_MASTER_DATA, async () => {
  try {
    const result = await GET(route.GET_MASTER_DATA);
    if (result.status === 200) {
      return { data: result?.response?.response?.data, error: null };
    }

    return { data: null, error: result?.status };
  } catch (error) {
    return { data: null, error: error?.message };
  }
});

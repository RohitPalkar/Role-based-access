import type { ICancellationsResponse, ITopPerformersResponse } from "src/types/leader-board/leader-board-top-performers-and-cancellations";

import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchTopPerformers, fetchCancellationData } from "src/services/leader-board-services/leader-board-service";


export const getTopPerformers = createAsyncThunk<ITopPerformersResponse, any>(
  'getTopPerformers',
  // @ts-ignore
  async (payload: any, thunkAPI) => {
    try {
      const result = await fetchTopPerformers(payload);
      return { topPerformers: result, total: result?.total };
    } catch (error: any) {
      console.error(error)
      return thunkAPI.rejectWithValue('Failed to fetch incentives');
    }
  }
);

export const getCancellations = createAsyncThunk<ICancellationsResponse, any>(
  'getCancellations',
  // @ts-ignore
  async (payload: any, thunkAPI) => {
    try {
      const result = await fetchCancellationData({...payload, limit: 10});
      return { cancellations: result, total: result?.total };
    } catch (error: any) {
      console.error(error)
      return thunkAPI.rejectWithValue('Failed to fetch incentives');
    }
  }
);

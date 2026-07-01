
import { createAsyncThunk } from '@reduxjs/toolkit';

import { getHistoryLogs } from '../../../services/finance-admin/log-history-service';

import type { ILogHistoryResponse } from '../../../types/finance-admin/log-history';


// Async thunk for fetching projects
export const fetchLogHistory = createAsyncThunk<ILogHistoryResponse, any>(
  'fetchLogHistory',
  // @ts-ignore
  async (payload: any,thunkAPI) => {
    try {
      const result = await getHistoryLogs(payload);  
      return { structures: result, total: result?.total };
    } catch (error: any) {
        console.error(error)
        return thunkAPI.rejectWithValue('Failed to fetch incentives');
    }
  }
);

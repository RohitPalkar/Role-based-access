import { createAsyncThunk } from '@reduxjs/toolkit';

import { fetchHighestRevenue } from 'src/services/leader-board-services/highest-revenue-services';

// Async thunk action for highest revenue fetching data
export const getHighestRevenue = createAsyncThunk(
  'leaderboard/getHighestRevenue',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchHighestRevenue();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

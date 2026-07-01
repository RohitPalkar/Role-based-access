import { createAsyncThunk } from '@reduxjs/toolkit';

import { fetchBoosterPrize } from 'src/services/incentive-dashboard-services/booster-prize-service';

// Async thunk for Booster Prize API call
const getBoosterPrize = createAsyncThunk(
  'boosterPrize/getBoosterPrize',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchBoosterPrize();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export default getBoosterPrize;

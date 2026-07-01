
import type { IIncentiveSlabResponse } from 'src/types/admin/services/incentive-slabs';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { getIncentiveSlabs } from 'src/services/incentive-dashboard-services/incentive-slab-service';

// Async thunk for fetching projects
export const fetchIncentiveSlabs = createAsyncThunk<IIncentiveSlabResponse, void>(
  'fetchIncentiveSlabs',
  // @ts-ignore
  async () => {
    try {
      const result = await getIncentiveSlabs();
      return result;
    } catch (error: any) {
      return { 
        brand: null,
        incentivePolicy: [],
        boosters: [],
        error: error?.message || 'Failed to fetch incentive slabs'
      };
    }
  }
);

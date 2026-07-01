import type { BrandsResponse } from 'src/types/admin/services/brands';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { getAllBrands, getBrandList } from 'src/services/admin-services/brand-srvice';

export const fetchBrands = createAsyncThunk<BrandsResponse, any>(
  'Brands/fetchBrands',
  async (payload: any) => {
    try {
      let result: any;
      result = await getBrandList(payload);
      if (payload.fetchAll) {
        result = await getAllBrands({});
      }

      return result;
    } catch (error: any) {
      return { data: null, error: error?.message };
    }
  }
);

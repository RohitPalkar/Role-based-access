import { createAsyncThunk } from '@reduxjs/toolkit';

import { route } from 'src/services/apiRoutes';
import { GET } from 'src/services/axiosInstance';

export const fetchVisitById = createAsyncThunk(
  'visit/fetchVisitById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await GET(`${route.GET_VISIT}?id=${id}`);
      return response?.response?.response?.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.errors?.message ?? 'Failed to fetch enquiry details.'
      );
    }
  }
);

export const fetchDropdownsByProject = createAsyncThunk(
  'visit/fetchDropdownsByProject',
  async (projectName: string, { rejectWithValue }) => {
    try {
      const response = await GET(`${route.GET_VISIT_DROPDOWN_OPTIONS}?name=${projectName}`);
      return response?.response?.response?.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.errors?.message ?? 'Failed to fetch dropdowns.'
      );
    }
  }
);
import type { BrandsResponse } from 'src/types/admin/services/brands';
import type { ProjectResponse } from 'src/types/admin/services/project';
import type { Company, IProject, CityResponse, IomDropdowns, IProjectPayload, IomDropdownType } from 'src/types/admin/services/common';

import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  getAllCities,
  getBrandLists,
  getUserGroups,
  getCompanyList,
  getIomDropdowns,
  getCityListByBrandId,
  getPhasesByBrandIdAndCityId,
  getProjectByBrandIdAndCityId,
  getUnmappedProjectByBrandIdAndCityId,
} from 'src/services/admin-services/common-services';

export const fetchCitiesByBrandId = createAsyncThunk<CityResponse, string>(
  'common/fetchCitiesByBrandId',
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await getCityListByBrandId(id);

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchBrands = createAsyncThunk<BrandsResponse>('common/fetchBrands', async () => {
  try {
    const result = await getBrandLists();

    return result;
  } catch (error: any) {
    return { data: null, error: error?.message };
  }
});

export const fetchProjectByBrandIdAndCityId = createAsyncThunk<ProjectResponse, any>(
  'common/fetchProjectByBrandIdAndCItyId',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await getProjectByBrandIdAndCityId(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchPhasesByBrandIdAndCityId = createAsyncThunk<ProjectResponse, any>(
  'common/fetchPhasesByBrandIdAndCityId',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await getPhasesByBrandIdAndCityId(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchAllCities = createAsyncThunk<CityResponse, any>(
  'common/fetchAllCities',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await getAllCities();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchUnmappedProjectByBrandIdAndCityId = createAsyncThunk<IProject[], any>(
  'common/fetchUnmappedProjectByBrandIdAndCityId',
  async (payload: IProjectPayload, { rejectWithValue }) => {
    try {
      const response = await getUnmappedProjectByBrandIdAndCityId(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchUserGroups = createAsyncThunk<any[], void>(
  'common/fetchUserGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getUserGroups();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchCompanies = createAsyncThunk<Company[], void>(
  'common/fetchCompanies',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCompanyList();

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchIomDropdowns = createAsyncThunk<IomDropdowns, IomDropdownType[]>(
  'common/fetchIomDropdowns',
  async (types, { rejectWithValue }) => {
    try {
      const response = await getIomDropdowns({ type: types });
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data || error.message || 'Something went wrong'
      );
    }
  }
);
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IBrandsItem } from 'src/types/admin/feature/brands';
import type { BrandsResponse } from 'src/types/admin/services/brands';
import type { ICity, Company, IProject, CityResponse, IomDropdowns } from 'src/types/admin/services/common';

import { createSlice } from '@reduxjs/toolkit';

import {
  fetchBrands,
  fetchAllCities,
  fetchCompanies,
  fetchUserGroups,
  fetchIomDropdowns,
  fetchCitiesByBrandId,
  fetchPhasesByBrandIdAndCityId,
  fetchProjectByBrandIdAndCityId,
  fetchUnmappedProjectByBrandIdAndCityId,
} from 'src/redux/actions/admin/common-actions';

interface ICommonState {
  cities: ICity[];
  companies: Company[];
  brands: IBrandsItem[];
  projects: any[];
  unMappedProjects: IProject[];
  phases: any[];
  userGroups: any[];
  iomDropdowns: IomDropdowns | null;
  loading: boolean;
  error: string | null;
}

const initialState: ICommonState = {
  cities: [],
  companies: [],
  brands: [],
  projects: [],
  unMappedProjects: [],
  phases: [],
  userGroups: [],
  iomDropdowns: null,
  loading: false,
  error: null,
};

const commonSlice = createSlice({
  name: 'common',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCitiesByBrandId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCitiesByBrandId.fulfilled, (state, action: PayloadAction<CityResponse>) => {
        state.loading = false;
        state.cities = action?.payload.cities || [];
      })
      .addCase(fetchCitiesByBrandId.rejected, (state, action) => {
        state.loading = false;
        state.cities = [];
        state.error = (action.payload as string) || 'Failed to fetch cities';
      });
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action: PayloadAction<BrandsResponse>) => {
        state.loading = false;
        state.brands = action?.payload?.brands || [];
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.brands = [];
        state.error = (action.payload as string) || 'Failed to fetch brands';
      });
    builder
      .addCase(fetchProjectByBrandIdAndCityId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectByBrandIdAndCityId.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.projects = action?.payload || [];
      })
      .addCase(fetchProjectByBrandIdAndCityId.rejected, (state, action) => {
        state.loading = false;
        state.projects = [];
        state.error = (action.payload as string) || 'Failed to fetch projects';
      });
    builder
      .addCase(fetchUnmappedProjectByBrandIdAndCityId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUnmappedProjectByBrandIdAndCityId.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.unMappedProjects = action?.payload || [];
        }
      )
      .addCase(fetchUnmappedProjectByBrandIdAndCityId.rejected, (state, action) => {
        state.loading = false;
        state.unMappedProjects = [];
        state.error = (action.payload as string) || 'Failed to fetch unmapped projects';
      });
    builder
      .addCase(fetchPhasesByBrandIdAndCityId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPhasesByBrandIdAndCityId.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.phases = action?.payload || [];
      })
      .addCase(fetchPhasesByBrandIdAndCityId.rejected, (state, action) => {
        state.loading = false;
        state.phases = [];
        state.error = (action.payload as string) || 'Failed to fetch phases';
      });

    builder
      .addCase(fetchAllCities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCities.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.cities = action?.payload || [];
      })
      .addCase(fetchAllCities.rejected, (state, action) => {
        state.loading = false;
        state.cities = [];
        state.error = (action.payload as string) || 'Failed to fetch cities';
      });

    builder
      .addCase(fetchUserGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserGroups.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.userGroups = action?.payload || [];
      })
      .addCase(fetchUserGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch user groups';
      });
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action: PayloadAction<Company[]>) => {
        state.loading = false;
        state.companies = action?.payload || [];
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.companies = [];
        state.error = (action.payload as string) || 'Failed to fetch companies';
      });

    builder
      .addCase(fetchIomDropdowns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIomDropdowns.fulfilled, (state, action: PayloadAction<IomDropdowns>) => {
        state.loading = false;
        state.iomDropdowns = action.payload;
      })
      .addCase(fetchIomDropdowns.rejected, (state, action) => {
        state.loading = false;
        state.iomDropdowns = null;
        state.error = (action.payload as string) || 'Failed to fetch iom dropdowns';
      });
  },
});

export default commonSlice.reducer;

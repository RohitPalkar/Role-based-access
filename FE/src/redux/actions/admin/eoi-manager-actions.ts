import type {
  EOICampaignListPayload,
  PushLeadsToSFDCPayload,
} from 'src/services/admin-services/eoi-manager-services';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { POST, PATCH } from 'src/services/axiosInstance';
import { eoiManagerRoutes } from 'src/services/eoiManagerRoutes';
import {
  getEOICampaign,
  pushLeadsToSFDC,
  getInventoryTypes,
  getEOICampaignList,
  getDevelopmentTypes,
  exportVouchersReports,
} from 'src/services/admin-services/eoi-manager-services';

export const fetchDevelopmentTypes = createAsyncThunk(
  'eoiManager/fetchDevelopmentTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getDevelopmentTypes();
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

export const fetchInventoryTypes = createAsyncThunk(
  'eoiManager/fetchInventoryTypes',
  async (params: {departmentIds?: number | string;} | undefined, { rejectWithValue }) => {
    try {
      const response = await getInventoryTypes(params?.departmentIds);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

export const createCampaign = createAsyncThunk(
  'eoiManager/createCampaign',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try {
      const response = await POST(eoiManagerRoutes.CREATE_CAMPAIGN, payload);
      return response?.response?.response?.message || 'Campaign created successfully.';
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.errors?.message || 'Oops! Something went wrong.'
      );
    }
  }
);

export const updateCampaign = createAsyncThunk(
  'eoiManager/updateCampaign',
  async ({ payload, id }: { payload: Record<string, any>; id: string }, { rejectWithValue }) => {
    try {
      const response = await PATCH(`${eoiManagerRoutes.UPDATE_CAMPAIGN}?id=${id}`, payload);
      return response?.response?.response?.message || 'Campaign updated successfully.';
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.errors?.message || 'Oops! Something went wrong.'
      );
    }
  }
);

export const getEOICampaignById = createAsyncThunk(
  'eoiManager/fetchcampaignById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await getEOICampaign(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

export const fetchEOICampaignList = createAsyncThunk(
  'eoiCampaign/fetchEOICampaignList',
  async (payload: EOICampaignListPayload, { rejectWithValue }) => {
    try {
      const response = await getEOICampaignList(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

export const downloadExportVouchersReports = createAsyncThunk(
  'downloadExportVouchersReports',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await exportVouchersReports(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const pushLeadsToSFDCAction = createAsyncThunk(
  'eoiCampaign/pushLeadsToSFDC',
  async (payload: PushLeadsToSFDCPayload, { rejectWithValue }) => {
    try {
      const response = await pushLeadsToSFDC(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

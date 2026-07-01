import type { ChannelPartnerData } from 'src/services/rm-panel/cp-listing-service';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { GET, POST } from 'src/services/axiosInstance'; // your axios instance
import { buildQueryParams } from 'src/utils/helper';

import { route } from 'src/services/apiRoutes';
import { exportCPReports, fetchChannelPartners } from 'src/services/rm-panel/cp-listing-service';

export const fetchChannelPartnersAction = createAsyncThunk<
  {
    data: ChannelPartnerData[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  },
  Record<string, any>,
  { rejectValue: string }
>('channelPartners/fetchChannelPartners', async (params, { rejectWithValue }) => {
  try {
    return await fetchChannelPartners(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching channel partners');
  }
});

export interface FetchCPListPayload {
  search: string;
}

export const fetchCPList = createAsyncThunk<
  { data: ChannelPartnerData[] | null; error: number | null }, // ✅ return type
  FetchCPListPayload
>('FETCH_CP_LIST', async (payload, { rejectWithValue }) => {
  try {
    const result = await GET(`${route.SEARCH_CP}${buildQueryParams(payload)}`);
    if (result.status === 200) {
      return { data: result?.response?.data, error: null };
    }
    return { data: null, error: result?.status };
  } catch (error: any) {
    const errorMessage =
      error?.message || 'Something went wrong. Please check your network or CORS settings.';
    return rejectWithValue({ message: errorMessage });
  }
});

export interface CreateChannelPartnerPayload {
  cpName: string;
  email: string;
  countryCode: string;
  contactNumber: string;
  campaignId: number;
  address: string;
  name?: string;
  rera?: string;
  gst?: string;
  panNumber?: string;
}

export const createChannelPartnerLinkAction = createAsyncThunk<
  any, // success response type (replace with backend response type if known)
  CreateChannelPartnerPayload,
  { rejectValue: string }
>('channelPartners/createLink', async (payload, { rejectWithValue }) => {
  try {
    const res = await POST(route.CREATE_CHANNEL_PARTNER_LINK, payload);
    if (res.status === 200 || res.status === 201) {
      return res.response;
    }
    return rejectWithValue(res?.message || 'Failed to create channel partner link');
  } catch (error: any) {
    return rejectWithValue(error?.response?.data?.errors || 'Something went wrong while creating link');
  }
});

export const downloadChannelPartnerReports = createAsyncThunk(
  'downloadChannelPartnerReports',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await exportCPReports(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);
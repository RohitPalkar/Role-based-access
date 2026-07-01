import type { UnitInventoryItemType } from 'src/redux/slices/rm-panel/unit-inventory-slice';
import type {
  BlockInventoryUnitPayload,
  UnitInventoryDropdownPayload,
  BlockInventoryUnitResponseData,
  UpdateInventoryPaymentMappingPayload,
} from 'src/services/rm-panel/unit-inventory-service';

import axios from 'axios';
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';

import { POST } from 'src/services/axiosInstance';
import { eoiRoutes } from 'src/services/EoiRoutes';
import {
  changeUnitStatus,
  fetchUnitInventory,
  getUnitInventoryById,
  fetchVoucherForMapping,
  exportUnitInventoryList,
  getUnitInventoryDropdowns,
  fetchMappedTransactionsByVoucherId,
  blockInventoryUnit as blockInventoryUnitRequest,
  releaseInventoryUnit as releaseInventoryUnitRequest,
  updateInventoryPaymentMapping as updateInventoryPaymentMappingRequest,
} from 'src/services/rm-panel/unit-inventory-service';

import { BOOKING_DATE_DOCUMENT } from '../types';

export interface UnitInvFileUploadPayload {
  key: string;
  presignedUrl: string;
  file: File;
  fileId: any;
}

export const fetchUnitInventoryThunk = createAsyncThunk<
  {
    data: UnitInventoryItemType[];
    total: number;
  },
  Record<string, any>,
  { rejectValue: string }
>('unitInventory/fetchunitInventoryList', async (params, { rejectWithValue }) => {
  try {
    return await fetchUnitInventory(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching unit inventory');
  }
});

export const updateUnitStatus = createAsyncThunk(
  'unitInventory/changeUnitStatus',
  async (payload: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const { id, status } = payload;
      const data = await changeUnitStatus(id, { status });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to update unit status');
    }
  }
);

export const unitInventoryUploadProgress = createAction<{ fileId: any; progress: number }>(
  'unitInventoryUpload/unitInventoryUploadProgress'
);

export const uploadUnitInventoryFile = createAsyncThunk<
  Response,
  UnitInvFileUploadPayload,
  { rejectValue: any }
>('uploadUnitInventoryFile', async (payload, thunkAPI) => {
  try {
    const res = await axios.put(payload.presignedUrl, payload.file, {
      headers: {
        'Content-Type': payload.file.type,
      },
      onUploadProgress: (progressEvent: any) => {
        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        thunkAPI.dispatch(unitInventoryUploadProgress({ fileId: payload.fileId, progress }));
      },
    });

    if (res.status === 200) {
      return res.data;
    }
    return thunkAPI.rejectWithValue('Upload failed with unexpected status');
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data || 'Upload failed');
  }
});

export const saveUnitInventoryDocument = createAsyncThunk(
  BOOKING_DATE_DOCUMENT,
  async (
    payload: {
      fileName: string;
      key: string;
    },
    thunkAPI: any
  ) => {
    try {
      const res = await POST(eoiRoutes.SAVE_UNIT_INVENTORY_DOCUMENT, payload);
      if (res?.response?.success) {
        return res?.response?.response;
      }
      return thunkAPI.rejectWithValue('Request was not successful');
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

export const fetchUnitInventoryDropdowns = createAsyncThunk(
  'unitInventory/fetchUnitInventoryDropdowns',
  async (
    payload: UnitInventoryDropdownPayload,
    { rejectWithValue }
  ) => {
    try {
      const data = await getUnitInventoryDropdowns(payload);
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to fetch unit inventory dropdowns'
      );
    }
  }
);

export const downloadUnitInventoryList = createAsyncThunk(
  'unitInventory/downloadUnitInventoryList',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try {
      const response = await exportUnitInventoryList(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || 'Oops! Something went wrong.');
    }
  }
);

export const fetchUnitInventoryById = createAsyncThunk(
  'unitInventory/fetchUnitInventoryById',
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getUnitInventoryById(id);
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to fetch unit inventory details'
      );
    }
  }
);

export const getVoucherForMapping = createAsyncThunk(
  'unitInventory/fetchVoucherForMapping',
  async (
    payload: { campaignId: number; search: string },
    { rejectWithValue }
  ) => {
    try {
      const { campaignId, search } = payload;

      const data = await fetchVoucherForMapping({
        campaignId,
        search,
      });

      return data;
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to fetch vouchers for mapping'
      );
    }
  }
);

export const blockInventoryUnit = createAsyncThunk<
  BlockInventoryUnitResponseData,
  BlockInventoryUnitPayload,
  { rejectValue: string }
>('unitInventory/blockInventoryUnit', async (payload, { rejectWithValue }) => {
  try {
    return await blockInventoryUnitRequest(payload);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to block inventory unit');
  }
});

export const releaseInventoryUnit = createAsyncThunk<
  string | undefined,
  string,
  { rejectValue: string }
>('unitInventory/releaseInventoryUnit', async (blockingId, { rejectWithValue }) => {
  try {
    return await releaseInventoryUnitRequest(blockingId);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to release unit');
  }
});

export const updateInventoryPaymentMapping = createAsyncThunk<
  string | undefined,
  UpdateInventoryPaymentMappingPayload,
  { rejectValue: string }
>('unitInventory/updateInventoryPaymentMapping', async (payload, { rejectWithValue }) => {
  try {
    return await updateInventoryPaymentMappingRequest(payload);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to update payment mapping');
  }
});

export const fetchMappedTransactions = createAsyncThunk<
  unknown[],
  string | number,
  { rejectValue: string }
>('unitInventory/fetchMappedTransactions', async (voucherId, { rejectWithValue }) => {
  try {
    return await fetchMappedTransactionsByVoucherId(voucherId);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to fetch mapped transactions');
  }
});
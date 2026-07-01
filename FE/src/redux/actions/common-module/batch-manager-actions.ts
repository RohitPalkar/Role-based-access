import type { BatchListData, BatchStatsData, BatchPreviewPayload, BatchSlotsCardsData, AddBatchSlotsPayload, MapBatchVouchersBody, MoveBatchUserPayload, UnmappedCountPayload, BatchSlotsListPayload, BatchVouchersListData, SendCheckinOtpPayload, UpdateBatchSlotPayload, BatchSlotsCardsPayload, BatchViewRecordsListData, AttendanceCheckInPayload, BatchSlotsDropdownPayload } from 'src/services/common-module/batch-manager-services';

import { createAsyncThunk } from '@reduxjs/toolkit';

import { deleteBatch, addBatchSlots, moveBatchUser, sendCheckinOtp, deleteBatchSlot, fetchBatchStats, updateBatchSlot, exportBatchList, mapBatchVouchers, resendCheckinOtp, attendanceCheckIn, createBatchManager, updateBatchManager, fetchBatchListData, fetchUnmappedCount, getBatchManagerById, fetchBatchSlotsList, fetchBatchSlotsCards, updateBatchSlotStatus, fetchBatchSlotSummary, fetchBatchVouchersList, fetchBatchSlotsDropdown, fetchBatchViewRecordsList } from 'src/services/common-module/batch-manager-services';

interface BatchListParams {
  data: BatchListData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
export interface BatchVouchersListParams {
  data: BatchVouchersListData[];
  batchName: string;
  campaignName: string;
  batchStatus: string;
  slotName: string;
  batchId: string;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface BatchViewRecordsListParams {
  data: BatchViewRecordsListData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const fetchBatchListAction = createAsyncThunk<
  BatchListParams,
  Record<string, any>,
  { rejectValue: string }
>('fetchBatchListAction', async (params, { rejectWithValue }) => {
  try {
    return await fetchBatchListData(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch list');
  }
});

export const fetchBatchVouchersListAction = createAsyncThunk<
  BatchVouchersListParams,
  { slotId: string; page: number; limit: number; search?: string },
  { rejectValue: string }
>('fetchBatchVouchersListAction', async (params, { rejectWithValue }) => {
  try {
    return await fetchBatchVouchersList(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch vouchers list');
  }
});

export const fetchBatchViewRecordsAction = createAsyncThunk<
  BatchViewRecordsListParams,
  { page: number; limit: number; search?: string },
  { rejectValue: string }
>('fetchBatchViewRecordsAction', async (params, { rejectWithValue }) => {
  try {
    return await fetchBatchViewRecordsList(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch view records list');
  }
});

export const fetchBatchStatsAction = createAsyncThunk<
  BatchStatsData,
  { campaignId: string | number, stage: string },
  { rejectValue: string }
>('fetchBatchStatsAction', async (params, { rejectWithValue }) => {
  try {
    return await fetchBatchStats(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch stats');
  }
});

export const createBatchManagerAction = createAsyncThunk<
  any,
  BatchPreviewPayload,
  { rejectValue: string }
>('createBatchManagerAction', async (payload, { rejectWithValue }) => {
  try {
    return await createBatchManager(payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch preview');
  }
});


export const getBatchManagerByIdAction = createAsyncThunk<
  any,
  { id: string },
  { rejectValue: string }
>('getBatchManagerByIdAction', async (params, { rejectWithValue }) => {
  try {
    return await getBatchManagerById(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch manager');
  }
});

export const updateBatchManagerAction = createAsyncThunk<
  any,
  BatchPreviewPayload,
  { rejectValue: string }
>('updateBatchManagerAction', async (payload, { rejectWithValue }) => {
  try {
    return await updateBatchManager(payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error updating batch');
  }
});

export const fetchBatchSlotsListAction = createAsyncThunk<
  any,
  BatchSlotsListPayload,
  { rejectValue: string }
>('fetchBatchSlotsListAction', async (params, { rejectWithValue }) => {
  try {
    return await fetchBatchSlotsList(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch slots');
  }
});

export const fetchBatchSlotSummaryAction = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>('fetchBatchSlotSummaryAction', async (id, { rejectWithValue }) => {
  try {
    return await fetchBatchSlotSummary(id);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch slot summary');
  }
});

export const addBatchSlotsAction = createAsyncThunk<
  any,
  AddBatchSlotsPayload,
  { rejectValue: string }
>('addBatchSlotsAction', async (payload, { rejectWithValue }) => {
  try {
    return await addBatchSlots(payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error adding batch slots');
  }
});

export const updateBatchSlotAction = createAsyncThunk<
  any,
  { id: string; payload: UpdateBatchSlotPayload },
  { rejectValue: string }
>('updateBatchSlotAction', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await updateBatchSlot(id, payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error updating batch slot');
  }
});

export const mapBatchVouchersAction = createAsyncThunk<
  { message: string },
  { batchId: string; body?: MapBatchVouchersBody },
  { rejectValue: string }
>('mapBatchVouchersAction', async ({ batchId, body }, { rejectWithValue }) => {
  try {
    return await mapBatchVouchers(batchId, body);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error mapping vouchers');
  }
});

export const notifyBatchAction = createAsyncThunk<
  { message: string },
  {
    batchId?: string;
    mappedUserId?: string;
    body?: any;
  },
  { rejectValue: string }
>('notifyBatchAction', async (params, { rejectWithValue }) => {
  try {
    const { notifyBatch } = await import('src/services/common-module/batch-manager-services');
    return await notifyBatch(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error notifying customers');
  }
});

export const deleteBatchAction = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>('deleteBatchAction', async (id, { rejectWithValue }) => {
  try {
    return await deleteBatch(id);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error deleting batch');
  }
});

export const deleteBatchSlotAction = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>('deleteBatchSlotAction', async (id, { rejectWithValue }) => {
  try {
    return await deleteBatchSlot(id);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error deleting batch slot');
  }
});

export const updateBatchSlotStatusAction = createAsyncThunk<
  any,
  { id: string; status: string },
  { rejectValue: string }
>('updateBatchSlotStatusAction', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await updateBatchSlotStatus(id, status);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error updating batch slot status');
  }
});

export const fetchBatchSlotsDropdownAction = createAsyncThunk<
  any,
  BatchSlotsDropdownPayload,
  { rejectValue: string }
>('fetchBatchSlotsDropdownAction', async (params, { rejectWithValue }) => {
  try {
    return await fetchBatchSlotsDropdown(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch slots dropdown');
  }
});

export const fetchBatchSlotsCardData = createAsyncThunk<
  BatchSlotsCardsData,
  BatchSlotsCardsPayload,
  { rejectValue: string }
>('fetchBatchSlotsCardData', async (params, { rejectWithValue }) => {
  try {
    return await fetchBatchSlotsCards(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching batch slots statistics');
  }
});

export const moveBatchUserAction = createAsyncThunk<
  any,
  { voucherId: string | number; payload: MoveBatchUserPayload },
  { rejectValue: string }
>('moveBatchUserAction', async ({ voucherId, payload }, { rejectWithValue }) => {
  try {
    return await moveBatchUser(voucherId, payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error moving user');
  }
});

export const fetchUnmappedCountAction = createAsyncThunk<
  any,
  UnmappedCountPayload,
  { rejectValue: string }
>('fetchUnmappedCountAction', async (payload, { rejectWithValue }) => {
  try {
    return await fetchUnmappedCount(payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching unmapped count');
  }
});

export const exportBatchListing = createAsyncThunk(
  'exportBatchListing',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await exportBatchList(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const sendCheckinOtpAction = createAsyncThunk<
  { message: string },
  SendCheckinOtpPayload,
  { rejectValue: string }
>('sendCheckinOtpAction', async (payload, { rejectWithValue }) => {
  try {
    return await sendCheckinOtp(payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error sending OTP');
  }
});

export const resendCheckinOtpAction = createAsyncThunk<
  { message: string },
  SendCheckinOtpPayload,
  { rejectValue: string }
>('resendCheckinOtpAction', async (payload, { rejectWithValue }) => {
  try {
    return await resendCheckinOtp(payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error resending OTP');
  }
});

export const attendanceCheckInAction = createAsyncThunk<
  { message: string },
  AttendanceCheckInPayload,
  { rejectValue: string }
>('attendanceCheckInAction', async (payload, { rejectWithValue }) => {
  try {
    return await attendanceCheckIn(payload);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error marking attendance');
  }
});
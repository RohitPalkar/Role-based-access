import type * as batchManagerServices from 'src/services/common-module/batch-manager-services';

import { createSlice } from '@reduxjs/toolkit';

import {
  fetchBatchListAction,
  fetchBatchStatsAction,
  fetchBatchSlotsCardData,
  createBatchManagerAction,
  updateBatchManagerAction,
  fetchUnmappedCountAction,
  getBatchManagerByIdAction,
  fetchBatchSlotsListAction,
  fetchBatchSlotSummaryAction,
  fetchBatchViewRecordsAction,
  fetchBatchVouchersListAction,
  fetchBatchSlotsDropdownAction,
} from 'src/redux/actions/common-module/batch-manager-actions';

interface BatchManagerInitialState {
  batchList: batchManagerServices.BatchListData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  campaignName: string;
  batchName: string;
  slotName: string;
  batchId: string;
  loading: boolean;
  previewLoading: boolean;
  error: string | null;
  batchVouchersListData: batchManagerServices.BatchVouchersListData[];
  batchRecordsList: batchManagerServices.BatchViewRecordsListData[];
  batchRecordsTotal: number;
  batchRecordsLoading: boolean;
  batchRecordsError: string | null;
  batchStatsData: batchManagerServices.BatchStatsData | null;
  batchSlotsData: any;
  batchSlotSummaryData: any;
  batchSlotsDropdownData: batchManagerServices.DropdownIdNameType[];
  batchSlotsCardsData: batchManagerServices.BatchSlotsCardsData | null;
  editLoading: boolean;
  editError: string | null;
  unmappedCount: number | null;
  isUserMapped: boolean;
  batchStatus: string;
}

const initialState: BatchManagerInitialState = {
  batchList: [],
  total: 0,
  page: 1,
  pageSize: 0,
  pageCount: 0,
  loading: false,
  previewLoading: false,
  error: null,
  batchVouchersListData: [],
  batchRecordsList: [],
  batchRecordsTotal: 0,
  batchRecordsLoading: false,
  batchRecordsError: null,
  campaignName: '',
  batchName: '',
  slotName: '',
  batchId: '',
  batchStatsData: null,
  batchSlotsData: null,
  batchSlotSummaryData: null,
  batchSlotsDropdownData: [],
  batchSlotsCardsData: null,
  editLoading: false,
  editError: null,
  unmappedCount: 0,
  isUserMapped: false,
  batchStatus: '',
};

const batchManagerSlice = createSlice({
  name: 'batchManager',
  initialState,
  reducers: {
    clearBatchSlots: (state) => {
      state.batchSlotsData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatchListAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchBatchListAction.fulfilled, (state, action) => {
        state.loading = false;
        state.batchList = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.pageCount = action.payload.pageCount;
      })

      .addCase(fetchBatchListAction.rejected, (state, action) => {
        state.loading = false;
        state.batchList = [];
        state.error = action.payload ?? 'Failed to fetch batch list data';
      })

      .addCase(fetchBatchVouchersListAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchBatchVouchersListAction.fulfilled, (state, action) => {
        state.loading = false;
        state.batchVouchersListData = action.payload.data;
        state.slotName = action.payload.slotName;
        state.batchName = action.payload.batchName;
        state.campaignName = action.payload.campaignName;
        state.batchStatus = action.payload.batchStatus;
        state.batchId = action.payload.batchId;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.pageCount = action.payload.pageCount;
      })

      .addCase(fetchBatchVouchersListAction.rejected, (state, action) => {
        state.loading = false;
        state.batchVouchersListData = [];
        state.error = action.payload ?? 'Failed to fetch batch vouchers list data';
      })

      .addCase(fetchBatchViewRecordsAction.pending, (state) => {
        state.batchRecordsLoading = true;
        state.batchRecordsError = null;
      })
      .addCase(fetchBatchViewRecordsAction.fulfilled, (state, action) => {
        state.batchRecordsLoading = false;
        state.batchRecordsList = action.payload.data;
        state.batchRecordsTotal = action.payload.total;
      })
      .addCase(fetchBatchViewRecordsAction.rejected, (state, action) => {
        state.batchRecordsLoading = false;
        state.batchRecordsList = [];
        state.batchRecordsTotal = 0;
        state.batchRecordsError = action.payload ?? 'Failed to fetch batch view records list data';
      })
      
      .addCase(fetchBatchStatsAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchBatchStatsAction.fulfilled, (state, action) => {
        state.loading = false;
        state.batchStatsData = action.payload;
      })

      .addCase(fetchBatchStatsAction.rejected, (state, action) => {
        state.loading = false;
        state.batchStatsData = null;
        state.error = action.payload ?? 'Failed to fetch batch stats data';
      })
      .addCase(createBatchManagerAction.pending, (state) => {
        state.previewLoading = true;
        state.error = null;
      })
      .addCase(createBatchManagerAction.fulfilled, (state) => {
        state.previewLoading = false;
      })
      .addCase(createBatchManagerAction.rejected, (state, action) => {
        state.previewLoading = false;
        state.error = action.payload ?? 'Failed to generate batches';
      })

      .addCase(getBatchManagerByIdAction.pending, (state) => {
        state.editLoading = true;
        state.editError = null;
      })
      .addCase(getBatchManagerByIdAction.fulfilled, (state) => {
        state.editLoading = false;
        state.editError = null;
      })
      .addCase(getBatchManagerByIdAction.rejected, (state, action) => {
        state.editLoading = false;
        state.editError = action.payload ?? 'Failed to fetch batch manager';
      })
      .addCase(updateBatchManagerAction.pending, (state) => {
        state.previewLoading = true;
        state.error = null;
      })
      .addCase(updateBatchManagerAction.fulfilled, (state) => {
        state.previewLoading = false;
      })
      .addCase(updateBatchManagerAction.rejected, (state, action) => {
        state.previewLoading = false;
        state.error = action.payload ?? 'Failed to update batch';
      })
      
      .addCase(fetchBatchSlotsListAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBatchSlotsListAction.fulfilled, (state, action) => {
        state.loading = false;
        state.batchSlotsData = action.payload;
        state.campaignName = action.payload.campaignName;
        state.batchStatus = action.payload.batchStatus;
        state.batchName = action.payload.batchName;
        state.isUserMapped = action.payload.isUserMapped;
      })
      .addCase(fetchBatchSlotsListAction.rejected, (state, action) => {
        state.loading = false;
        state.batchSlotsData = null;
        state.error = action.payload ?? 'Failed to fetch batch slots data';
      })
      
      .addCase(fetchBatchSlotSummaryAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBatchSlotSummaryAction.fulfilled, (state, action) => {
        state.loading = false;
        state.batchSlotSummaryData = action.payload;
      })
      .addCase(fetchBatchSlotSummaryAction.rejected, (state, action) => {
        state.loading = false;
        state.batchSlotSummaryData = null;
        state.error = action.payload ?? 'Failed to fetch batch slot summary data';
      })

      .addCase(fetchBatchSlotsDropdownAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBatchSlotsDropdownAction.fulfilled, (state, action) => {
        state.loading = false;
        state.batchSlotsDropdownData = action.payload;
      })
      .addCase(fetchBatchSlotsDropdownAction.rejected, (state, action) => {
        state.loading = false;
        state.batchSlotsDropdownData = [];
        state.error = action.payload ?? 'Failed to fetch batch slots dropdown data';
      })

      .addCase(fetchBatchSlotsCardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchBatchSlotsCardData.fulfilled, (state, action) => {
        state.loading = false;
        state.batchSlotsCardsData = action.payload;
      })

      .addCase(fetchBatchSlotsCardData.rejected, (state, action) => {
        state.loading = false;
        state.batchSlotsCardsData = null;
        state.error = action.payload ?? 'Failed to fetch batch slots statistics data';
      })

      .addCase(fetchUnmappedCountAction.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUnmappedCountAction.fulfilled, (state, action) => {
        state.loading = false;
        state.unmappedCount = action.payload.count;
      })
      .addCase(fetchUnmappedCountAction.rejected, (state) => {
        state.loading = false;
        state.unmappedCount = null;
      });
  },
});

export default batchManagerSlice.reducer;

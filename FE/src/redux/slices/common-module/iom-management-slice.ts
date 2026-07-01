import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  IomTableRowItem,
  IomMyTeamRowItem,
  IOMListingResponse,
  IomDetailsResponse,
  IomMyTeamListingResponse,
} from 'src/sections/common-module/internal-office-memo/iom-config';

import { createSlice } from '@reduxjs/toolkit';

import {
  cancelIom,
  rejectIom,
  approveIom,
  fetchIOMData,
  fetchIomDetails,
  submitIomForApproval,
  fetchMyTeamAvailability,
  submitIomForApprovalPatch,
} from 'src/redux/actions/common-module/iom-management-actions';

export type IOMItem = IomTableRowItem;

interface IOMState {
  iomData: IOMItem[];
  loading: boolean;
  error: string | null;
  iomCount: number;

  page: number;
  pageSize: number;
  pageCount: number;

  tabValue: string;

  iomDetails: IomDetailsResponse | null;
  detailsLoading: boolean;
  detailsError: string | null;

  submitting: boolean;
  submitError: string | null;

  rejecting: boolean;
  rejectError: string | null;

  approving: boolean;
  approveError: string | null;

  cancelling: boolean;
  cancelError: string | null;
  myTeamData: IomMyTeamRowItem[];
  myTeamLoading: boolean;
  myTeamError: string | null;
  myTeamCount: number;
  myTeamPage: number;
  myTeamPageSize: number;
  myTeamPageCount: number;
  isNavigatingBackFromPreview: boolean;
}

const initialState: IOMState = {
  iomData: [],
  loading: false,
  error: null,
  iomCount: 0,

  page: 1,
  pageSize: 10,
  pageCount: 1,

  // current selected tab value
  tabValue: 'all',

  iomDetails: null,
  detailsLoading: false,
  detailsError: null,

  submitting: false,
  submitError: null,

  rejecting: false,
  rejectError: null,

  approving: false,
  approveError: null,

  cancelling: false,
  cancelError: null,
  myTeamData: [],
  myTeamLoading: false,
  myTeamError: null,
  myTeamCount: 0,
  myTeamPage: 1,
  myTeamPageSize: 10,
  myTeamPageCount: 1,
  isNavigatingBackFromPreview: false,
};

const iomSlice = createSlice({
  name: 'iom-management',
  initialState,
  reducers: {
    setIomTabValue: (state, action: PayloadAction<string>) => {
      state.tabValue = action.payload;
    },
    clearIomDetails: (state) => {
      state.iomDetails = null;
      state.detailsLoading = false;
      state.detailsError = null;
      state.submitting = false;
      state.submitError = null;
      state.rejecting = false;
      state.rejectError = null;
      state.approving = false;
      state.approveError = null;
      state.cancelling = false;
      state.cancelError = null;
      state.isNavigatingBackFromPreview = false;
    },
    setIomDetailsFromPreview: (state, action: PayloadAction<IomDetailsResponse>) => {
      state.iomDetails = action.payload;
      state.detailsLoading = false;
      state.detailsError = null;
    },
    setNavigatingBackFromPreview: (state, action: PayloadAction<boolean>) => {
      state.isNavigatingBackFromPreview = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIOMData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIOMData.fulfilled, (state, action: PayloadAction<IOMListingResponse>) => {
        state.loading = false;
        state.iomData = action.payload.data || [];
        state.iomCount = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.pageCount = action.payload.pageCount;
      })
      .addCase(fetchIOMData.rejected, (state, action) => {
        state.loading = false;
        state.iomData = [];
        state.iomCount = 0;
        state.error = action.payload || 'Failed to fetch IOM listing';
      })
      .addCase(fetchIomDetails.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchIomDetails.fulfilled, (state, action: PayloadAction<IomDetailsResponse>) => {
        state.detailsLoading = false;
        state.iomDetails = action.payload;
      })
      .addCase(fetchIomDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.iomDetails = null;
        state.detailsError = action.payload || 'Failed to fetch IOM details';
      })
      .addCase(submitIomForApproval.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitIomForApproval.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(submitIomForApproval.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload || 'Failed to submit IOM for approval';
      })
      .addCase(submitIomForApprovalPatch.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitIomForApprovalPatch.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(submitIomForApprovalPatch.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload || 'Failed to submit IOM for approval';
      })
      .addCase(rejectIom.pending, (state) => {
        state.rejecting = true;
        state.rejectError = null;
      })
      .addCase(rejectIom.fulfilled, (state) => {
        state.rejecting = false;
      })
      .addCase(rejectIom.rejected, (state, action) => {
        state.rejecting = false;
        state.rejectError = action.payload || 'Failed to reject IOM';
      })
      .addCase(approveIom.pending, (state) => {
        state.approving = true;
        state.approveError = null;
      })
      .addCase(approveIom.fulfilled, (state) => {
        state.approving = false;
      })
      .addCase(approveIom.rejected, (state, action) => {
        state.approving = false;
        state.approveError = action.payload || 'Failed to approve IOM';
      })
      .addCase(cancelIom.pending, (state) => {
        state.cancelling = true;
        state.cancelError = null;
      })
      .addCase(cancelIom.fulfilled, (state) => {
        state.cancelling = false;
      })
      .addCase(cancelIom.rejected, (state, action) => {
        state.cancelling = false;
        state.cancelError = action.payload || 'Failed to cancel IOM';
      })
      .addCase(fetchMyTeamAvailability.pending, (state) => {
        state.myTeamLoading = true;
        state.myTeamError = null;
      })
      .addCase(
        fetchMyTeamAvailability.fulfilled,
        (state, action: PayloadAction<IomMyTeamListingResponse>) => {
          state.myTeamLoading = false;
          state.myTeamData = action.payload.data || [];
          state.myTeamCount = action.payload.total;
          state.myTeamPage = action.payload.page;
          state.myTeamPageSize = action.payload.pageSize;
          state.myTeamPageCount = action.payload.pageCount;
        }
      )
      .addCase(fetchMyTeamAvailability.rejected, (state, action) => {
        state.myTeamLoading = false;
        state.myTeamData = [];
        state.myTeamCount = 0;
        state.myTeamError = action.payload || 'Failed to fetch my team availability';
      });
  },
});

export const {
  setIomTabValue,
  clearIomDetails,
  setIomDetailsFromPreview,
  setNavigatingBackFromPreview,
} = iomSlice.actions;

export default iomSlice.reducer;

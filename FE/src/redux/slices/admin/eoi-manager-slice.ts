// src/redux/slices/admin/eoi-manager-slice.ts

import type { Dayjs } from 'dayjs';
import type { EOICampaign } from 'src/services/admin-services/eoi-manager-services';

import { createSlice } from '@reduxjs/toolkit';

import {
  getEOICampaignById,
  fetchInventoryTypes,
  fetchEOICampaignList,
  fetchDevelopmentTypes,
} from 'src/redux/actions/admin/eoi-manager-actions';

interface OptionType {
  id: number;
  name: string;
}

interface AccountDetails {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
}

interface inventoryDetailsType {
  type: string;
  minSBA: number;
  maxSBA: number;
  minPrice: number;
  maxPrice: number;
}

interface CampaignDetails {
  id: number;
  campaignName: string;
  enquiryInitials: string;
  voucherIdInitials: string;
  voucherIdCounter: string;
  phase: string[];
  brandId: OptionType;
  cityIds: OptionType[];
  project: OptionType;
  unitApproverId: OptionType;
  additionalApprovers: OptionType[];
  developmentTypeIds: OptionType[];
  inventoryTypeIds: OptionType[];
  pushToSfdc: boolean;
  sbaRange: string;
  priceRange: string;
  voucherFormType: string;
  voucherStartDate: string;
  voucherEndDate: string;
  voucherAmount: number;
  voucherTermsAndCondition: string;
  accountDetails: AccountDetails;
  eoiFormType: string;
  eoiStartDate: Date | Dayjs;
  eoiEndDate: Date | Dayjs;
  eoiType: string[];
  stdEoiAmount: number;
  preEoiAmount: number;
  eoiTermsAndCondition: string;
  inventoryDetails: inventoryDetailsType[],
  enquiryCounter: string;
  displayQueueId:string;
  queueAfterVerified:boolean;
  voucherAmountType:string;
  stdEoiAmountType?: string;
  preEoiAmountType?: string;
  stdEoiInitials:string,
  stdEoiCounter:string,
  preEoiInitials:string,
  preEoiCounter:string,
  unitPrefStaticContent:string
}

export interface EoiManagerState {
  developmentTypes: { id: number; name: string }[];
  inventoryTypes: OptionType[];
  campaigns: EOICampaign[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  campaignDetails: CampaignDetails | null;
  loading: boolean;
  error: string | null;
}

const initialState: EoiManagerState = {
  developmentTypes: [],
  inventoryTypes: [],
  campaigns: [],
  total: 0,
  page: 1,
  limit: 10,
  pages: 1,
  campaignDetails: null,
  loading: false,
  error: null,
};

const eoiManagerSlice = createSlice({
  name: 'eoiManager',
  initialState,
  reducers: {
    resetCampaignDetails: (state) => {
      state.campaignDetails = null;
    },
    resetInventoryTypes: (state) => {
      state.inventoryTypes = [];
    },
  },
  extraReducers: (builder) => {
    // -------- DEVELOPMENT TYPES --------
    builder
      .addCase(fetchDevelopmentTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevelopmentTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.developmentTypes = action.payload || [];
      })
      .addCase(fetchDevelopmentTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // -------- INVENTORY TYPES --------
    builder
      .addCase(fetchInventoryTypes.pending, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchInventoryTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryTypes = action.payload || [];
      })
      .addCase(fetchInventoryTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // -------- EOI CAMPAIGN LIST --------
    builder
      .addCase(fetchEOICampaignList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEOICampaignList.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload?.campaigns || [];
        state.total = action.payload?.total || 0;
        state.page = action.payload?.page || 1;
        state.limit = action.payload?.limit || 10;
        state.pages = action.payload?.pages || 1;
      })
      .addCase(fetchEOICampaignList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(getEOICampaignById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEOICampaignById.fulfilled, (state, action) => {
        state.loading = false;
        state.campaignDetails = action.payload || null;
      })
      .addCase(getEOICampaignById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetCampaignDetails, resetInventoryTypes } = eoiManagerSlice.actions;

export default eoiManagerSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

import {
  getVoucherForMapping,
  releaseInventoryUnit,
  fetchUnitInventoryById,
  fetchUnitInventoryThunk,
  fetchMappedTransactions,
  saveUnitInventoryDocument,
  fetchUnitInventoryDropdowns,
  unitInventoryUploadProgress,
} from 'src/redux/actions/rm-panel/unit-inventory-actions';

export interface UnitInventoryItemType {
  id: string;
  towerId: string;
  towerName: string;
  unitId: string;
  unitNumber: string;
  floor: string;
  configuration: string;
  facing: string;
  areaSba: string;
  carpetArea?: string;
  agreementValue?: string;
  carParkType: string;
  numberOfCarParks: number;
  status: string;
  campaignId: number;
  campaignName: string;
  isMapped: boolean;
  series?: string;
  timerExtension?: number;
  unitBlockDuration?: number;
  /** Block metadata; may include `createdAt` for timer window. */
  blocking?: Record<string, unknown> | null;
  /** Voucher row when blocked (flat on unit in newer API). */
  voucher?: Record<string, unknown> | null;
}
interface UploadState {
  progress: number;
}

export interface DropdownOption {
  name: string;
  value: string;
}
export interface UnitInventoryState {
  unitInventoryData: UnitInventoryItemType[];
  total: number;
  loading: boolean;
  error: string | null;
  unitInventoryuploads: Record<string, UploadState>;
  towerOptions: DropdownOption[];
  floorOptions: DropdownOption[];
  seriesOptions: DropdownOption[];
  bhkConfigOptions: DropdownOption[];
  facingOptions: DropdownOption[];
  unitDetails: UnitInventoryItemType | null;
  voucherList: any[];                          // you can type this later if BE gives structure
  voucherLoading: boolean;
  /** Payments from `GET …/mapped-transactions/:voucherId` (map-unit voucher history). */
  mappedVoucherTransactions: unknown[];
  mappedVoucherTransactionsLoading: boolean;
  releaseInventoryUnitLoading: boolean;
}

const initialState: UnitInventoryState = {
  unitInventoryData: [],
  // Unit inventory uploads
  unitInventoryuploads: {},
  total: 0,
  loading: false,
  error: null,
  towerOptions: [],
  floorOptions: [],
  seriesOptions: [],
  bhkConfigOptions: [],
  facingOptions: [],
  unitDetails: null,
  voucherList: [],        
  voucherLoading: false,
  mappedVoucherTransactions: [],
  mappedVoucherTransactionsLoading: false,
  releaseInventoryUnitLoading: false,
};

const unitInventorySlice = createSlice({
  name: 'unitInventory',
  initialState,
  reducers: {
    clearMappedVoucherTransactions(state) {
      state.mappedVoucherTransactions = [];
      state.mappedVoucherTransactionsLoading = false;
    },
  },
  extraReducers: (builder) => {
    // fetch unit inventory list
    builder
      .addCase(fetchUnitInventoryThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnitInventoryThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.unitInventoryData = action.payload?.data;
        state.total = action.payload?.total;
      })
      .addCase(fetchUnitInventoryThunk.rejected, (state, action) => {
        state.loading = false;
        state.unitInventoryData = [];
        state.total = 0;
        state.error = action.error.message || 'Failed to fetch channel partners';
      });
    builder
      .addCase(unitInventoryUploadProgress, (state, action) => {
        const { fileId, progress } = action.payload;
        if (!state.unitInventoryuploads[fileId]) {
          state.unitInventoryuploads[fileId] = { progress: 0 };
        }
        state.unitInventoryuploads[fileId].progress = progress;
      })
      .addCase(saveUnitInventoryDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveUnitInventoryDocument.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(saveUnitInventoryDocument.rejected, (state, action) => {
        state.loading = false;
        state.unitInventoryuploads = {};
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchUnitInventoryDropdowns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnitInventoryDropdowns.fulfilled, (state, action) => {
        state.loading = false;
        state.towerOptions = action.payload?.towers || [];
        state.floorOptions = action.payload?.floors || [];
        state.seriesOptions = action.payload?.series || [];
        state.bhkConfigOptions = action.payload?.configurations || [];
        state.facingOptions = action.payload?.facings || [];
      })
      .addCase(fetchUnitInventoryDropdowns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchUnitInventoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnitInventoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.unitDetails = action.payload;
      })
      .addCase(fetchUnitInventoryById.rejected, (state, action) => {
        state.loading = false;
        state.unitDetails = null;
        state.error = (action.payload as string) || 'Failed to fetch unit inventory details';
      });

    builder
      .addCase(getVoucherForMapping.pending, (state) => {
        state.voucherLoading = true;
        state.error = null;
      })
      .addCase(getVoucherForMapping.fulfilled, (state, action) => {
        state.voucherLoading = false;
        state.voucherList = action.payload || [];
      })
      .addCase(getVoucherForMapping.rejected, (state, action) => {
        state.voucherLoading = false;
        state.voucherList = [];
        state.error =
          (action.payload as string) || 'Failed to fetch vouchers';
      });

    builder
      .addCase(fetchMappedTransactions.pending, (state) => {
        state.mappedVoucherTransactionsLoading = true;
        state.mappedVoucherTransactions = [];
      })
      .addCase(fetchMappedTransactions.fulfilled, (state, action) => {
        state.mappedVoucherTransactionsLoading = false;
        state.mappedVoucherTransactions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchMappedTransactions.rejected, (state) => {
        state.mappedVoucherTransactionsLoading = false;
        state.mappedVoucherTransactions = [];
      });

    builder
      .addCase(releaseInventoryUnit.pending, (state) => {
        state.releaseInventoryUnitLoading = true;
      })
      .addCase(releaseInventoryUnit.fulfilled, (state) => {
        state.releaseInventoryUnitLoading = false;
      })
      .addCase(releaseInventoryUnit.rejected, (state) => {
        state.releaseInventoryUnitLoading = false;
      });
  },
});

export const { clearMappedVoucherTransactions } = unitInventorySlice.actions;

export default unitInventorySlice.reducer;

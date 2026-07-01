import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  ProjectOption,
  CampaignOption,
  UnitTypeOption,
  DropdownOption,
  CampaignDetails,
  PrimarySourceOptions,
  MapAndConvertResponse,
} from 'src/services/rm-panel/eoi-service';

import { isAnyOf, createSlice } from '@reduxjs/toolkit';

import {
  fetchEOIData,
  addVoucherEOI,
  getUnitDropdown,
  updateVoucherEOI,
  fetchEOIProjects,
  getFloorDropdown,
  addMapAndConvert,
  getVoucherEOIById,
  fetchCPNameAction,
  getMapConvertById,
  fetchEOITabCounts,
  fetchEOIPrimarySource,
  getPreBookingDocuments,
  fetchEOICampaignsAction,
  fetchEOIUnitTypesAction,
  getEOICampaignDetailsById,
  fetchChangeSourceRequestData,
  fetchApprovalUnitListingData,
  fetchSourceChangeRequestByIdThunk,
} from 'src/redux/actions/rm-panel/eoi-actions';

import type { BookingDocument } from './dashboard-slice';

export interface EOIItem {
  /** Voucher id (number) or approval-request id (string UUID) for Approve Unit rows. */
  id: number | string;
  voucherId?: string | null;
  uniqueReferenceId: string;
  paidVoucherId?: string | null;
  customerName: string; // renamed from "name" to match API
  email: string;
  mobile: string;
  campaignName: string;
  /** Flat id if API sends it; SFDC push prefers `campaign.id` */
  campaign?: {
    id: number;
    campaignName?: string;
    pushToSfdc?: boolean;
    sfdcProjectName?: string | null;
  } | null;
  primarySource: string;
  cpName?: string | null;
  referrerName?: string | null;
  leadStatus: string;
  formStatus: string;
  paymentStatus: string;
  customerLastUpdatedAt?: string | null;
  queueId?: string | null;
  sequenceNo: string;
  chronology: string;
  typologyPreference?: string | null;
  unitPreference?: string | null;
  financeStatus?: string | null;
  financeRemarks?: string;
  sourcingRm?: any;
  closingRm?: any;
  amountPaid?: number | null;
  /** Present on EOI list rows; approval-requests map uses `thresholdAmount`. */
  amountPayable?: number | null;
  preEoiId?: string | null;
  stdEoiId?: string | null;
  finalPaidDate?: string | null;
  createdAt: string;
  rmUniqueId?: string | null;
  checkerRemarks?: any;
  deletionReason?: string | null;
  restoreReason?: string | null;
  isDeleted?: boolean;
  chequeAlerts?: string;
  opportunityId: string;
  bookingStatus: string;
  preferredUnit: string | null;
  hasBuddyRMPermission?: boolean;
}

interface UnitDetails {
  sfdcUnitId: string;
  unitNumber: string;
  sfdcTowerId: string;
  preferredLocationUnit: string;
  numberOfCarParks: number | string;
  floor: string;   
  facing: string;  
  configuration: string;
  carParkType: string;
  areaSBA: number;
  apartmentStatus: string;
  inventoryUnitId: string;
}

interface EOIResponse {
  data: EOIItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface EOIState {
  eoiData: EOIItem[];
  /** Change Request tab (`sourceView`) or Approve Unit tab (`approveUnit`) — whichever alternate list was fetched last. */
  sourceChangeListingData: any;
  loading: boolean;
  error: string | null;
  eoiCount: number;
  sourceChangeListingCount: number;
  changeRequestCount:number;
  cancellationTabCount: number;
  cancellationListingCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  campaigns: CampaignOption[];
  campaignsLoading: boolean;
  campaignsError: string | null;

  cpName: DropdownOption[];
  cpNameLoading: boolean;
  cpNameError: string | null;

  primarySourceLoading: boolean;
  primarySource: PrimarySourceOptions[];
  primarySourceError: string | null;

  createVoucherLoading: boolean;
  createVoucherError: string | null;
  voucherData: any;
  campaignDetails: CampaignDetails | null;
  unitTypes: UnitTypeOption[];
  unitTypesLoading: boolean;
  unitTypesError: string | null;

  projectOptions: ProjectOption[];

  mapAndConvertLoading: boolean;
  mapAndConvertData: MapAndConvertResponse | null;
  mapAndConvertError: string | null;

  floorOptions: CampaignOption[];
  unitOptions: UnitDetails[];

  // get source change request data types
  sourceChangeRequestData: any;
  sourceChangeRequestDataLoading: boolean;
  sourceChangeRequestDataError: string | null;
  
  // source change request id type
  sourceChangeRequestId: string | null;

  tabValue: string;
  approveUnitCount: number;

  preBookingDocuments: {
    data: BookingDocument[] | null;
    loading: boolean;
    error: null | any;
  };
}

const initialState: EOIState = {
  eoiData: [],
  sourceChangeListingData: [],
  sourceChangeListingCount: 0,
  changeRequestCount: 0,
  cancellationTabCount: 0,
  cancellationListingCount: 0,
  eoiCount: 0,
  loading: false,
  error: null,
  page: 1,
  pageSize: 10,
  pageCount: 1,

  campaigns: [],
  campaignsLoading: false,
  campaignsError: null,
  
  cpName: [],
  cpNameLoading: false,
  cpNameError: null,

  primarySourceLoading: false,
  primarySource: [],
  primarySourceError: null,

  createVoucherLoading: false,
  createVoucherError: null,
  voucherData: {},
  campaignDetails: null,
  
  unitTypes: [],
  unitTypesLoading: false,
  unitTypesError: null,

  projectOptions: [],

  mapAndConvertLoading: false,
  mapAndConvertData: null,
  mapAndConvertError: null,

  floorOptions: [],
  unitOptions: [],

  // get source chnage request data
  sourceChangeRequestData: null,
  sourceChangeRequestDataLoading: false,
  sourceChangeRequestDataError: null,

  // id for source change request
  sourceChangeRequestId: null,

  // current selected tab value
  tabValue: 'all',
  approveUnitCount : 0,

  preBookingDocuments: {
    data: null,
    loading: false,
    error: null,
  },
};

const eoiSlice = createSlice({
  name: 'eoi',
  initialState,
  reducers: {
    resetCampaigns: (state) => {
      state.campaigns = [];
      state.campaignsLoading = false;
      state.campaignsError = null;
    },
    resetUnitTypes: (state) => {
      state.unitTypes = [];
      state.unitTypesLoading = false;
      state.unitTypesError = null;
    },
    resetVoucherData: (state) => {
      state.voucherData = {};
      state.campaignDetails = null;
    },
    resetMapAndConvertData(state) {
      state.mapAndConvertData = null;
    },

    setTabValue(state, action: PayloadAction<string>) {
      state.tabValue = action.payload;
    },

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEOIData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEOIData.fulfilled, (state, action: PayloadAction<EOIResponse>) => {
        state.loading = false;
        state.eoiData = action.payload.data || [];
        state.eoiCount = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.pageCount = action.payload.pageCount;
      })
      .addCase(fetchEOIData.rejected, (state, action) => {
        state.loading = false;
        state.eoiData = [];
        state.eoiCount = 0;
        state.error = action.error.message || 'Failed to fetch EOI listing';
      });

    builder
      .addCase(fetchEOICampaignsAction.pending, (state) => {
        state.campaignsLoading = true;
        state.campaignsError = null;
      })
      .addCase(
        fetchEOICampaignsAction.fulfilled,
        (state, action: PayloadAction<CampaignOption[]>) => {
          state.campaignsLoading = false;
          state.campaigns = action.payload;
        }
      )
      .addCase(fetchEOICampaignsAction.rejected, (state, action) => {
        state.campaignsLoading = false;
        state.campaigns = [];
        state.campaignsError = action.error.message || 'Failed to fetch EOI campaigns';
      });

    builder
      .addCase(fetchCPNameAction.pending, (state) => {
        state.cpNameLoading = true;
        state.cpNameError = null;
      })
      .addCase(
        fetchCPNameAction.fulfilled,
        (state, action: PayloadAction<DropdownOption[]>) => {
          state.cpNameLoading = false;
          state.cpName = action.payload;
        }
      )
      .addCase(fetchCPNameAction.rejected, (state, action) => {
        state.cpNameLoading = false;
        state.cpName = [];
        state.cpNameError = action.error.message || 'Failed to fetch cp names';
      });

    builder
      .addCase(fetchEOIPrimarySource.pending, (state) => {
        state.primarySourceLoading = true;
        state.primarySourceError = null;
      })
      .addCase(
        fetchEOIPrimarySource.fulfilled,
        (state, action: PayloadAction<PrimarySourceOptions[]>) => {
          state.primarySourceLoading = false;
          state.primarySource = action.payload;
        }
      )
      .addCase(fetchEOIPrimarySource.rejected, (state, action) => {
        state.primarySourceLoading = false;
        state.primarySource = [];
        state.primarySourceError = action.error.message || 'Failed to fetch EOI campaigns';
      });

    builder
      .addCase(addVoucherEOI.pending, (state) => {
        state.createVoucherLoading = true;
        state.createVoucherError = null;
      })
      .addCase(addVoucherEOI.fulfilled, (state, action) => {
        state.createVoucherLoading = false;
        state.voucherData = action.payload;
      })
      .addCase(addVoucherEOI.rejected, (state, action) => {
        state.createVoucherLoading = false;
        state.createVoucherError =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Failed to create EOI/Voucher';
      });

    builder
      .addCase(updateVoucherEOI.pending, (state) => {
        state.createVoucherLoading = true;
        state.createVoucherError = null;
      })
      .addCase(updateVoucherEOI.fulfilled, (state, action) => {
        state.createVoucherLoading = false;
        state.voucherData = action.payload;
      })
      .addCase(updateVoucherEOI.rejected, (state, action) => {
        state.createVoucherLoading = false;
        state.createVoucherError =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Failed to update EOI/Voucher';
      });

    builder
      .addCase(getVoucherEOIById.pending, (state) => {
        state.createVoucherLoading = true;
        state.createVoucherError = null;
      })
      .addCase(getVoucherEOIById.fulfilled, (state, action) => {
        state.createVoucherLoading = false;
        state.voucherData = action.payload;
      })
      .addCase(getVoucherEOIById.rejected, (state, action) => {
        state.createVoucherLoading = false;
        state.createVoucherError = action.error.message || 'Failed to create EOI/Voucher';
      });

    builder
      .addCase(getEOICampaignDetailsById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEOICampaignDetailsById.fulfilled, (state, action) => {
        state.loading = false;
        state.campaignDetails = action.payload;
      })
      .addCase(getEOICampaignDetailsById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch campaign details';
      });
    // Cancel EOI can reuse the fetch action to refresh list; no local state fields needed
    // Handled in component via toasts and refetch
    builder
      .addCase(fetchEOIUnitTypesAction.pending, (state) => {
        state.unitTypesLoading = true;
        state.unitTypesError = null;
      })
      .addCase(
        fetchEOIUnitTypesAction.fulfilled,
        (state, action: PayloadAction<UnitTypeOption[]>) => {
          state.unitTypesLoading = false;
          state.unitTypes = action.payload;
        }
      )
      .addCase(fetchEOIUnitTypesAction.rejected, (state, action) => {
        state.unitTypesLoading = false;
        state.unitTypes = [];
        state.unitTypesError = action.payload as string;
      });

    builder
      .addCase(fetchEOIProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEOIProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projectOptions = action.payload;
      })
      .addCase(fetchEOIProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch campaign details';
      });

    builder
      .addCase(getMapConvertById.pending, (state) => {
        state.mapAndConvertLoading = true;
        state.mapAndConvertError = null;
      })
      .addCase(getMapConvertById.fulfilled, (state, action) => {
        state.mapAndConvertLoading = false;
        state.mapAndConvertData = action.payload;
      })
      .addCase(getMapConvertById.rejected, (state, action) => {
        state.mapAndConvertLoading = false;
        state.mapAndConvertError = action.error.message || 'Failed to fetch map and convert details';
      });

    builder
      .addCase(getFloorDropdown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFloorDropdown.fulfilled, (state, action) => {
        state.loading = false;
        state.floorOptions = action.payload;
      })
      .addCase(getFloorDropdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch floor details';
      });

    builder
      .addCase(getUnitDropdown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUnitDropdown.fulfilled, (state, action) => {
        state.loading = false;
        state.unitOptions = action.payload;
      })
      .addCase(getUnitDropdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch unit details';
      });

    builder
      .addCase(addMapAndConvert.pending, (state) => {
        state.mapAndConvertLoading = true;
        state.mapAndConvertError = null;
      })
      .addCase(addMapAndConvert.fulfilled, (state) => {
        state.mapAndConvertLoading = false;
      })
      .addCase(addMapAndConvert.rejected, (state, action) => {
        state.mapAndConvertLoading = false;
        state.mapAndConvertError = action.error.message || 'Failed to submit map and convert';
      });


    // get source change request data
    builder
      .addCase(fetchSourceChangeRequestByIdThunk.pending, (state) => {
        state.sourceChangeRequestDataLoading = true;
        state.sourceChangeRequestData = null;
        state.sourceChangeRequestDataError = null;
      })
      .addCase(fetchSourceChangeRequestByIdThunk.fulfilled, (state, action) => {
        state.sourceChangeRequestDataLoading = false;
        state.sourceChangeRequestData = action.payload;
        state.sourceChangeRequestDataError = null;
        
      })
      .addCase(fetchSourceChangeRequestByIdThunk.rejected, (state, action) => {
        state.sourceChangeRequestDataLoading = false;
        state.sourceChangeRequestDataError = action.error.message || 'Failed to fetch soucce change request details';
      });

    builder
      .addCase(fetchEOITabCounts.fulfilled, (state, action) => {
        state.changeRequestCount = action.payload.changeRequestCount ?? 0;
        state.cancellationTabCount = action.payload.cancellationCount ?? 0;
        state.approveUnitCount = action.payload.approveUnitCount ?? 0;
      })
      .addCase(fetchEOITabCounts.rejected, () => {
        // Don't overwrite counts on error - keep existing
      });

    builder
      .addCase(getPreBookingDocuments.pending, (state) => {
        state.preBookingDocuments.loading = true;
      })
      .addCase(getPreBookingDocuments.fulfilled, (state, action) => {
        state.preBookingDocuments.loading = false;
        state.preBookingDocuments.error = false;
        state.preBookingDocuments.data = action?.payload?.data;
      })
      .addCase(getPreBookingDocuments.rejected, (state, action) => {
        state.preBookingDocuments.loading = false;
        state.preBookingDocuments.error = action.error;
        state.preBookingDocuments.data = null;
      });

      // Change Request listing + Approve Unit listing (same state shape as change request). Must follow all addCase — addMatcher last.
    builder
      .addMatcher(
        isAnyOf(fetchChangeSourceRequestData.pending, fetchApprovalUnitListingData.pending),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        isAnyOf(fetchChangeSourceRequestData.fulfilled, fetchApprovalUnitListingData.fulfilled),
        (state, action: PayloadAction<EOIResponse>) => {
          state.loading = false;
          state.sourceChangeListingData = action.payload.data || [];
          state.sourceChangeListingCount = action.payload.total;
          state.page = action.payload.page;
          state.pageSize = action.payload.pageSize;
          state.pageCount = action.payload.pageCount;
        }
      )
      .addMatcher(
        isAnyOf(fetchChangeSourceRequestData.rejected, fetchApprovalUnitListingData.rejected),
        (state, action) => {
          state.loading = false;
          state.sourceChangeListingData = [];
          state.sourceChangeListingCount = 0;
          state.error = action.error.message || 'Failed to fetch listing';
        }
      );
  },
});

export const { resetUnitTypes, setTabValue,  resetCampaigns, resetVoucherData, resetMapAndConvertData  } = eoiSlice.actions;
export default eoiSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

import { getMasterDataList, getOpportunityDetails } from '../../actions/rm-panel/dashboard-actions';

export interface OpportunityData {
  OppId: string;
  OppName: string;
  ProjectName: string;
  UnitNo: string;
}

export interface MasterData {
  OppId: string;
  OppName: string;
  ProjectName: string;
  UnitNumber: string;
}

export interface DashboardState {
  opportunity: {
    data: OpportunityData | null;
    loading: boolean;
    error: null | any;
  };
  masterData: {
    data: MasterData | null;
    loading: boolean;
    error: null | any;
  };
  uploadCostSheetImage: File | '';
  uploadAllotmentLetter: File | '';
  showuploadCostSheetpopup: boolean | string;
  showuploadAllotmentLetterpopup: boolean | string;
  uploadotherDocumentsArray: { name: string; file: File }[];
}

const initialState: DashboardState = {
  opportunity: {
    data: null,
    loading: false,
    error: null,
  },
  masterData: {
    data: null,
    loading: false,
    error: null,
  },
  uploadCostSheetImage: '',
  uploadAllotmentLetter: '',
  showuploadCostSheetpopup: false,
  showuploadAllotmentLetterpopup: false,
  uploadotherDocumentsArray: [],
};

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    resetDashboardError: (state) => {
      state.opportunity.error = null;
      state.masterData.error = null;
    },
    setuploadCostSheetImage: (state, action) => {
      state.uploadCostSheetImage = action.payload;
    },
    setuploadAllotmentLetter: (state, action) => {
      state.uploadAllotmentLetter = action.payload;
    },
    setshowuploadCostSheetpopup: (state, action) => {
      state.showuploadCostSheetpopup = action.payload;
    },
    setshowuploadAllotmentLetterpopup: (state, action) => {
      state.showuploadAllotmentLetterpopup = action.payload;
    },
    setuploadotherDocumentsArray: (state, action) => {
      state.uploadotherDocumentsArray = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Opportunity Details
    builder
      .addCase(getOpportunityDetails.pending, (state) => {
        state.opportunity.loading = true;
        state.opportunity.error = null;
      })
      .addCase(getOpportunityDetails.fulfilled, (state, action) => {
        state.opportunity.loading = false;
        state.opportunity.data = action.payload.data.data;
      })
      .addCase(getOpportunityDetails.rejected, (state, action) => {
        state.opportunity.loading = false;
        state.opportunity.error = action.error;
      });

    // Fetch Master Data
    builder
      .addCase(getMasterDataList.pending, (state) => {
        state.masterData.loading = true;
        state.masterData.error = null;
      })
      .addCase(getMasterDataList.fulfilled, (state, action) => {
        state.masterData.loading = false;
        state.masterData.data = action.payload.data;
      })
      .addCase(getMasterDataList.rejected, (state, action) => {
        state.masterData.loading = false;
        state.masterData.error = action.error;
      });
  },
});

export const { resetDashboardError } = dashboardSlice.actions;

export default dashboardSlice.reducer;

import type { DocumentItem } from 'src/services/rm-panel/multi-unit-service';

import { createSlice } from '@reduxjs/toolkit';

import {
  getOpportunityList,
  getCancelledOpportunities,
} from 'src/redux/actions/rm-panel/dashboard-actions';

export interface Opportunity {
  unitno: string;
  Project: string;
  primarysource: string;
  Name: string;
  Id: string;
  enqrefno: string;
  Bokkingstage: string;
  BFstatus: string;
  Amount?: any;
  documents?: DocumentItem[];
  isSelected?: boolean;
  status?: string;
  SalesValue?: any;
  salesValue?:any;
  bookingvalue?: any;
}

export interface OpportunityState {
  opportunities: {
    data: {
      [x: string]: any;
      opportunities: Opportunity[];
      totalCount: number;
    };
    loading: boolean;
    error: null | any;
  };
  cancelledOpportunities: {
    data: {
      [x: string]: any;
      opportunities: Opportunity[];
      totalCount: number;
    };
    loading: boolean;
    error: null | any;
  };
}

const initialState: OpportunityState = {
  opportunities: {
    data: {
      opportunities: [],
      totalCount: 0,
    },
    loading: false,
    error: null,
  },
  cancelledOpportunities: {
    data: {
      opportunities: [],
      totalCount: 0,
    },
    loading: false,
    error: null,
  },
};

export const opportunitySlice = createSlice({
  name: 'opportunity',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // opportunities list
    builder
      .addCase(getOpportunityList.pending, (state) => {
        state.opportunities.loading = true;
        state.opportunities.error = null;
      })
      .addCase(getOpportunityList.fulfilled, (state, action) => {
        state.opportunities.loading = false;
        state.opportunities.data.opportunities = action?.payload?.data?.data?.opportunities || [];
        state.opportunities.data.totalCount = action?.payload?.data?.data?.totalRecords || 0;
      })
      .addCase(getOpportunityList.rejected, (state, action) => {
        state.opportunities.loading = false;
        state.opportunities.error = action?.error?.message || 'API request failed';
        state.opportunities.data.opportunities = [];
        state.opportunities.data.totalCount = 0;
      })
      // cancelled opportunities list
      .addCase(getCancelledOpportunities.pending, (state) => {
        state.cancelledOpportunities.loading = true;
        state.cancelledOpportunities.error = null;
      })
      .addCase(getCancelledOpportunities.fulfilled, (state, action) => {
        state.cancelledOpportunities.loading = false;
        state.cancelledOpportunities.data.opportunities =
          action?.payload?.data?.data?.opportunities || [];
        state.cancelledOpportunities.data.totalCount =
          action?.payload?.data?.data?.totalRecords || 0;
      })
      .addCase(getCancelledOpportunities.rejected, (state, action) => {
        state.cancelledOpportunities.loading = false;
        state.cancelledOpportunities.error = action?.error?.message || 'API request failed';
        state.cancelledOpportunities.data.opportunities = [];
        state.cancelledOpportunities.data.totalCount = 0;
      });
  },
});

export default opportunitySlice.reducer;

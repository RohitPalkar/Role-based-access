// src/redux/slices/rm-panel/multi-booking-group-slice.ts

import type { BookingItem, GroupDetails, MultiUnitData } from 'src/services/rm-panel/multi-unit-service';

import { createSlice } from '@reduxjs/toolkit';

import { fetchMultiBookingListThunk,  fetchMultiBookingGroupThunk } from 'src/redux/actions/rm-panel/multi-unit-actions';



export interface MultiBookingGroupState {
    
  loading: boolean;
  error:any;
  createStep: number;
  groupListData: {
    data: {
      [x: string]: any;
      data: MultiUnitData[];
      totalRecords: number;
    };
    loading: boolean;
    error: null | any;
  };
    editMultiBookings: {
    data: {
      [x: string]: any;
      opportunities: BookingItem[];
      groupDetails: GroupDetails | null;
      totalRecords: number;
    };
    loading: boolean;
    error: null | any;
  };

}

const initialState: MultiBookingGroupState = {

  loading: false,
  error: null,
  createStep: 0,
  groupListData: {
    data: {
      data: [],
      totalRecords: 0,
    },
    loading: false,
    error: null,
  },
  editMultiBookings: {
    data: {
     opportunities: [],
      groupDetails: null,
      totalRecords: 0,
    },
    loading: false,
    error: null,
  },
};


const multiBookingGroupSlice = createSlice({
  name: 'multiUnit',
  initialState,
  reducers: {
    setCreateStep: (state, action) => {
      state.createStep = action.payload;
    },
    clearMultiBookingGroup: (state) => {
      state.editMultiBookings.data.opportunities = [];
      state.editMultiBookings.data.groupDetails  = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMultiBookingGroupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMultiBookingGroupThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.editMultiBookings.data.opportunities = action.payload.opportunities;
        state.editMultiBookings.data.groupDetails  = action.payload.groupDetails;
        state.editMultiBookings.data.totalRecords = action.payload.totalRecords;
      })
      .addCase(fetchMultiBookingGroupThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch booking group';
      })
      .addCase(fetchMultiBookingListThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMultiBookingListThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.groupListData.data.data = action.payload.data;
        state.groupListData.data.totalRecords = action.payload.totalRecords;
      })
      .addCase(fetchMultiBookingListThunk.rejected, (state, action) => {
        state.loading = false;
       state.groupListData.data.data  = [];
        state.error = action.payload ?? 'Failed to fetch booking list';
      });
  },
});

export const { clearMultiBookingGroup, setCreateStep } = multiBookingGroupSlice.actions;
export default multiBookingGroupSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

import { fetchUserDetails } from 'src/redux/actions/admin/reports-user-actions';

import { fetchUserBookings } from '../../actions/admin/reports-actions';

interface ReportState {
  bookings: any;
  loading: boolean;
  error: string | null;
  selectedUser?: any;
}

const initialState: ReportState = {
  selectedUser: [],
  bookings: [],
  loading: false,
  error: null,
};

const userBookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    resetUserDetails(state) {
      // @ts-ignore
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload?.bookings ?? state.bookings;
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch reports';
      })

      // ✅ New Reducer for fetching user details
      .addCase(fetchUserDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.loading = false;
        // @ts-ignore
        state.selectedUser = action.payload; // ✅ Storing user details
      })
      .addCase(fetchUserDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user details';
      });
  },
});

export const { resetUserDetails } = userBookingsSlice.actions;

export default userBookingsSlice.reducer;

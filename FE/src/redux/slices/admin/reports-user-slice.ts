import { createSlice } from '@reduxjs/toolkit';

import { getRmDropdown, fetchReportsUser } from 'src/redux/actions/admin/reports-user-actions';

interface reportsUser {
  id: number;
  name: string;
  email: string;
}

interface RmItem {
  id: number;
  name: string;
}

interface ReportsUserState {
  reportsUser: reportsUser[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  rmList: RmItem[];
}

const initialState: ReportsUserState = {
  reportsUser: [],
  loading: false,
  error: null,
  totalCount: 0,
  rmList: [],
};

const reportsUserSlice = createSlice({
  name: 'reportsUserSlice',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportsUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportsUser.fulfilled, (state, action) => {
        state.loading = false;
        state.reportsUser = action.payload.users;
        state.totalCount = action.payload.totalCount ?? 0;
      })
      .addCase(fetchReportsUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    builder
      .addCase(getRmDropdown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRmDropdown.fulfilled, (state, action) => {
        state.loading = false;
        state.rmList = action.payload;
      })
      .addCase(getRmDropdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default reportsUserSlice.reducer;

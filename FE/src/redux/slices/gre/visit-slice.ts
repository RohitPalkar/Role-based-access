import { createSlice } from '@reduxjs/toolkit';

import { fetchVisitById, fetchDropdownsByProject } from 'src/redux/actions/gre/visit-action';

type VisitState = {
  visit: any;
  dropdowns: any;
  loading: boolean;
  error: string | null;
};

const initialState: VisitState = {
  visit: null,
  dropdowns: null,
  loading: false,
  error: null,
};

const visitSlice = createSlice({
  name: 'visit',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Visit
      .addCase(fetchVisitById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVisitById.fulfilled, (state, action) => {
        state.loading = false;
        state.visit = action.payload;
      })
      .addCase(fetchVisitById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Dropdowns
      .addCase(fetchDropdownsByProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDropdownsByProject.fulfilled, (state, action) => {
        state.loading = false;
        state.dropdowns = action.payload;
      })
      .addCase(fetchDropdownsByProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default visitSlice.reducer;

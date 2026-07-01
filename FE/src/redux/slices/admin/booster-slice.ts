import type { Booster } from 'src/types/admin/services/booster';

import { createSlice } from '@reduxjs/toolkit';

import { fetchBooster, fetchBoosterById } from 'src/redux/actions/admin/booster-actions';


interface BoosterState {
  booster: Booster[];
  total:number
  loading: boolean;
  error: string | null;
}

const initialState: BoosterState = {
  booster: [],
  total:5,
  loading: false,
  error: null,
};


const boosterSlice = createSlice({
  name: 'boosters',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBooster.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBooster.fulfilled, (state, action) => {
        state.loading = false;
        state.booster = action?.payload?.booster || []
        state.total = action?.payload?.total || 0
      })
      .addCase(fetchBooster.rejected, (state, action) => {
        state.loading = false;
        state.booster = [];
        state.total = 0;
        state.error = action.payload as string;
      })
      
      .addCase(fetchBoosterById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoosterById.fulfilled, (state, action) => {
        state.loading = false;
        state.booster = action?.payload?.booster || []
        state.total = action?.payload?.total || 0
      })
      .addCase(fetchBoosterById.rejected, (state, action) => {
        state.loading = false;
        state.booster = [];
        state.total = 0;
        state.error = action.payload as string;
      })

      // .addCase(editBooster.pending, (state) => {
      //   state.loading = true;
      //   state.error = null;
      // })
      // .addCase(editBooster.fulfilled, (state, action) => {
      //   state.loading = false;
      //   state.booster = state.booster.map((update: any) =>
      //     update.id === action.payload.id ? action.payload : update
      //   );
      // })
      // .addCase(editBooster.rejected, (state, action) => {
      //   state.loading = false;
      //   state.error = (action.payload as string) || 'Failed to edit booster';
      // });
  },
});

export default boosterSlice.reducer;

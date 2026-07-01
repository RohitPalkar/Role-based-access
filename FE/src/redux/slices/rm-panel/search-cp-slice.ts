
import { createSlice } from '@reduxjs/toolkit';

import { fetchCPList } from 'src/redux/actions/rm-panel/channel-partners-actions';

interface CPState {
  cpList: { userName: string; userId: string }[];
  loading: boolean;
}

const initialState: CPState = {
  cpList: [],
  loading: false,
};

const searchCPSlice = createSlice({
  name: 'searchCP',
  initialState,
   reducers: {},

 extraReducers: (builder) => {
    builder.addCase(fetchCPList.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchCPList.fulfilled, (state, action) => {
      state.loading = false;
      const list = action.payload?.data || [];
      state.cpList = list.map((i: any) => ({
        userName: i?.cpName || i?.name,
        userId: String(i?.cpId || i?.id),
      }));
    });
    builder.addCase(fetchCPList.rejected, (state) => {
      state.loading = false;
      state.cpList = [];
    });
  },
});

export default searchCPSlice.reducer;

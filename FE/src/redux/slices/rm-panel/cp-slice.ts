// redux/slices/rm-panel/channel-partner-slice.ts
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ChannelPartnerData } from 'src/services/rm-panel/cp-listing-service';

import { createSlice } from '@reduxjs/toolkit';

import { fetchChannelPartnersAction } from 'src/redux/actions/rm-panel/channel-partners-actions';

interface ChannelPartnersResponse {
  data: ChannelPartnerData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface ChannelPartnersState {
  channelPartnersData: ChannelPartnerData[];
  channelPartnersCount: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  pageCount: number;
}

const initialState: ChannelPartnersState = {
  channelPartnersData: [],
  channelPartnersCount: 0,
  loading: false,
  error: null,
  page: 1,
  pageSize: 10,
  pageCount: 1,
};

const channelPartnersSlice = createSlice({
  name: 'channelPartners',
  initialState,
  reducers: {
    // local reducers if required
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChannelPartnersAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchChannelPartnersAction.fulfilled,
        (state, action: PayloadAction<ChannelPartnersResponse>) => {
          state.loading = false;
          state.channelPartnersData = action.payload.data;
          state.channelPartnersCount = action.payload.total;
          state.page = action.payload.page;
          state.pageSize = action.payload.pageSize;
          state.pageCount = action.payload.pageCount;
        }
      )
      .addCase(fetchChannelPartnersAction.rejected, (state, action) => {
        state.loading = false;
        state.channelPartnersData = [];
        state.channelPartnersCount = 0;
        state.error = action.error.message || 'Failed to fetch channel partners';
      });
  },
});

export default channelPartnersSlice.reducer;

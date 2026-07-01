import type { NotificationPayload } from 'src/types/admin/services/notification';

import { createSlice } from '@reduxjs/toolkit';

import { fetchNotification } from 'src/redux/actions/admin/notification-actions';

interface NotificationState {
  notification: NotificationPayload[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notification: [],
  total: 5,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotification.fulfilled, (state, action) => {
        state.loading = false;
        state.notification = action?.payload?.notifications || [];
        state.total = action?.payload?.total || 0;
      })
      .addCase(fetchNotification.rejected, (state, action) => {
        state.loading = false;
        state.notification = [];
        state.total = 0;
        state.error = action.payload as string;
      });
  },
});

export default notificationSlice.reducer;

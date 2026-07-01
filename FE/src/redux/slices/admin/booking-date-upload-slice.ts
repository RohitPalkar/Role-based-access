import { createSlice } from '@reduxjs/toolkit';

import { updateUploadProgress, saveBookingDateDocument } from 'src/redux/actions/admin/booking-date-upload-actions';

interface UploadState {
  progress: number;
}

interface BookingDateUploadState {
  uploads: Record<string, UploadState>;
  isLoading: boolean;
  error: string | null;
}

const initialState: BookingDateUploadState = {
  uploads: {},
  isLoading: false,
  error: null,
};

const bookingDateUploadSlice = createSlice({
  name: 'bookingDateUpload',
  initialState,
  reducers: {
    resetUploadProgress: (state, action) => {
      const { fileId } = action.payload;
      if (state.uploads[fileId]) {
        delete state.uploads[fileId];
      }
    },
    clearAllUploads: (state) => {
      state.uploads = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateUploadProgress, (state, action) => {
        const { fileId, progress } = action.payload;
        if (!state.uploads[fileId]) {
          state.uploads[fileId] = { progress: 0 };
        }
        state.uploads[fileId].progress = progress;
      })
      .addCase(saveBookingDateDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveBookingDateDocument.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveBookingDateDocument.rejected, (state, action) => {
        state.isLoading = false;
        state.uploads = {};
        state.error = action.payload as string;
      });
  },
});

export const { resetUploadProgress, clearAllUploads } = bookingDateUploadSlice.actions;
export default bookingDateUploadSlice.reducer;
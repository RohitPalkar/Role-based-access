import type { PayloadAction } from '@reduxjs/toolkit';

import { createSlice } from '@reduxjs/toolkit';

interface SalaryUploadState {
  uploads: Record<string, { progress: number; fileId: string }>;
}

const initialState: SalaryUploadState = {
  uploads: {},
};

const salaryUploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    updateUploadProgress: (
      state,
      action: PayloadAction<{ fileId: string; progress: number }>
    ) => {
      const { fileId, progress } = action.payload;

      // Update progress for the specific file
      state.uploads[fileId] = { progress, fileId };
    },
  },
});

export const { updateUploadProgress } = salaryUploadSlice.actions;

export default salaryUploadSlice.reducer;

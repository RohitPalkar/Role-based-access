import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { route } from 'src/services/apiRoutes';
import { POST } from 'src/services/axiosInstance';
import { updateUploadProgress } from 'src/redux/slices/finance-admin/salary-upload-slice';

import { BOOKING_DOCUMENT } from '../types';

interface UploadPayload {
  key: string;
  presignedUrl: string;
  file: File;
  fileId: any;
}

export const uploadFile = createAsyncThunk<Response, UploadPayload, { rejectValue: any }>(
  'uploadFile',
  // eslint-disable-next-line consistent-return
  async (payload, thunkAPI) => {
    try {
      const res = await axios.put(payload.presignedUrl, payload.file, {
        headers: {
          'Content-Type': payload.file.type,
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          thunkAPI.dispatch(updateUploadProgress({ fileId: payload.fileId, progress }));
        },
      });

      if (res.status === 200) {
        return res.data; //
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || 'Upload failed');
    }
  }
);

export const saveSalaryDocument = createAsyncThunk(
  BOOKING_DOCUMENT,
  // eslint-disable-next-line consistent-return
  async (
    payload: {
      fileName: string;
      key: string;
      // eslint-disable-next-line consistent-return
    },
    thunkAPI: any
    // eslint-disable-next-line consistent-return
  ) => {
    try {
      const res = await POST(route.SAVE_SALARY_DOCUMENT, payload);
      if (res?.response?.success) {
        return res?.response?.response;
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);

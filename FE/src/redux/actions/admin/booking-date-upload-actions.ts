import axios from 'axios';
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';

import { route } from 'src/services/apiRoutes';
import { POST } from 'src/services/axiosInstance';

import { BOOKING_DATE_DOCUMENT } from '../types';

// Action for updating upload progress
export const updateUploadProgress = createAction<{ fileId: any; progress: number }>('bookingDateUpload/updateUploadProgress');

interface UploadPayload {
  key: string;
  presignedUrl: string;
  file: File;
  fileId: any;
}

export const uploadBookingDateFile = createAsyncThunk<Response, UploadPayload, { rejectValue: any }>(
  'uploadBookingDateFile',
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
        return res.data;
      }
      return thunkAPI.rejectWithValue('Upload failed with unexpected status');
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || 'Upload failed');
    }
  }
);

export const saveBookingDateDocument = createAsyncThunk(
  BOOKING_DATE_DOCUMENT,
  async (
    payload: {
      fileName: string;
      key: string;
    },
    thunkAPI: any) => {
    try {
      const res = await POST(route.SAVE_BOOKING_DATE_DOCUMENT, payload);
      if (res?.response?.success) {
        return res?.response?.response;
      }
      return thunkAPI.rejectWithValue('Request was not successful');
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data);
    }
  }
);
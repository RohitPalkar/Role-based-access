import type {
  BankDetailsListData,
  SendBankDetailsEmailPayload,
} from 'src/services/rm-panel/bank-details-service';

import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  sendBankDetailsEmail,
  fetchBankDetailsListData,
} from 'src/services/rm-panel/bank-details-service';

interface BankDetailsParams {
  data: BankDetailsListData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const fetchBankDetailsList = createAsyncThunk<
  BankDetailsParams,
  Record<string, any>,
  { rejectValue: string }
>('bankDetails/fetchBankDetailsList', async (params, { rejectWithValue }) => {
  try {
    return await fetchBankDetailsListData(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching bank details list');
  }
});

export const sendBankDetailsEmailAction = createAsyncThunk(
  'bankDetails/sendBankDetailsEmailAction',
  async (payload: SendBankDetailsEmailPayload, { rejectWithValue }) => {
    try {
      const response = await sendBankDetailsEmail(payload);
      return response;
    } catch (error) {
      return rejectWithValue(
        error || 'Something went wrong. Please check your network or CORS settings.'
      );
    }
  }
);

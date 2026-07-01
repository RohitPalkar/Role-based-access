import { createAsyncThunk } from '@reduxjs/toolkit';

import { buildQueryParams } from 'src/utils/helper';

// eslint-disable-next-line import/no-cycle
import { GET } from 'src/services/axiosInstance';

import { route } from '../../../services/apiRoutes';

interface AgreementListPayload {
  page: number;
  limit: number;
  search: string;
  status?: string;
}

export const getAgreementList = createAsyncThunk(
  'agreement/getAgreementList',
  async (payload: AgreementListPayload, { rejectWithValue }) => {
    try {
      const result = await GET(`${route.AGREEMENT_LIST}${buildQueryParams(payload)}`);
      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result?.status };
    } catch (error) {
      // Check for CORS or network issues
      const errorMessage =
        error?.message || 'Something went wrong. Please check your network or CORS settings.';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

export const getAgreementDetails = createAsyncThunk(
  'agreement/getAgreementDetails',
  async (agreementId: string, { rejectWithValue }) => {
    try {
      const result = await GET(`${route.AGREEMENT_DETAILS}/${agreementId}`);
      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result?.status };
    } catch (error) {
      return rejectWithValue({ message: error?.message || 'Failed to fetch agreement details' });
    }
  }
);

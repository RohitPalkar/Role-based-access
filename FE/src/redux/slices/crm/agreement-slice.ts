// src/store/agreementSlice.ts
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AgreementExportParams } from 'src/services/crm/agreement-export-service';
import type {
  AgreementData,
  AgreementDetail,
  AgreementResponse,
  UpdateInviteesPayload,
  UpdateAgreementPayload,
  UpdateAgreementResponse,
  AgreementDetailApiResponse,
} from 'src/types/crm/agreement';

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { crmRoutes } from 'src/services/crmroutes';
import { GET, POST, PATCH } from 'src/services/axiosInstance';
import { exportAgreementList as exportAgreementListApi } from 'src/services/crm/agreement-export-service';

// Simplified API shape
export interface SimplifiedAgreementResponse {
  agreements: AgreementData['result'];
  totalCount: number;
}

// Wrapper type for GET
type AgreementApiResponse = AgreementResponse | SimplifiedAgreementResponse;

// -----------------------------
// Thunk
// -----------------------------
interface FetchAgreementsParams {
  page?: number;
  limit?: number;
  search?: string;
  projectName?: string;
  documentStatus?: string;
  crmUser?: string;
  internalSignatory?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
}

export const fetchAgreements = createAsyncThunk<
  AgreementData, // ✅ normalized response
  FetchAgreementsParams | undefined, // accepts params
  { rejectValue: string }
>('agreements/fetchAgreements', async (params, thunkAPI) => {
  try {
    // Build query string dynamically
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }

    const url = `${crmRoutes.AGREEMENT_LIST}?${query.toString()}`;
    const apiResp = await GET<AgreementApiResponse>(url);
    const data = apiResp.response;

    // Case 1: full response with success flag
    if ('success' in data && data.success) {
      return data.response.data;
    }

    // Case 2: simplified response (agreements + totalCount)
    if ('agreements' in data) {
      return {
        result: data.agreements,
        summary: {
          totalSent: data.totalCount,
          totalSigned: 0,
          dueFor3Days: 0,
          pendingInternal: 0,
        },
        total: data.totalCount,
        page: params?.page || 1,
        pageSize: params?.limit || data.totalCount,
        pageCount: 1,
      };
    }

    return thunkAPI.rejectWithValue('Unexpected response format');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data?.errors?.message || 'Network error');
  }
});

export const fetchAgreementByID = createAsyncThunk<
  AgreementDetail, // single agreement
  number, // dynamic ID
  { rejectValue: string }
>('agreements/fetchAgreementByID', async (id, thunkAPI) => {
  try {
    const url = `${crmRoutes.AGREEMENT_DETAIL}${id}`;
    const apiResp = await GET<AgreementDetailApiResponse>(url);
    // eslint-disable-next-line prefer-destructuring

    if (apiResp.response.success) {
      return apiResp.response.response.data; // ✅ actual agreement detail
    }

    return thunkAPI.rejectWithValue('Failed to fetch agreement');
  } catch (error: any) {
    console.log('fetchAgreementByIDerrrrrr', error);
    return thunkAPI.rejectWithValue(error?.response?.data?.errors?.message || 'Network error');
  }
});

export const updateAgreementForm = createAsyncThunk<
  any, // ✅ loosened return type
  { id: number; payload: UpdateAgreementPayload },
  { rejectValue: string }
>('agreements/updateAgreementForm', async ({ id, payload }, thunkAPI) => {
  try {
    const url = `${crmRoutes.AGREEMENT_UPDATE}${id}`;
    const apiResp = await PATCH<UpdateAgreementResponse>(url, payload);

    if (apiResp.response.success) {
      return apiResp.response.response.data; // ✅ no type error now
    }

    return thunkAPI.rejectWithValue('Failed to update agreement form');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data?.errors?.message || 'Network error');
  }
});

export const signInternalSignatory = createAsyncThunk<
  any, // ✅ loosened return type
  { id: number },
  { rejectValue: string }
>('agreements/signInternalSignatory', async ({ id }, thunkAPI) => {
  try {
    const url = `${crmRoutes.SIGN_INTERNAL_SIGNATORY}${id}`;

    // ✅ PATCH with no body (empty object passed to be explicit)
    const apiResp = await PATCH<UpdateAgreementResponse>(url, {});
    if (apiResp.response.success) {
      return apiResp.response.response.message;
    }

    return thunkAPI.rejectWithValue('Failed to update agreement form');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.message || 'Network error');
  }
});

export const createAgreement = createAsyncThunk<
  any, // ✅ loosened return type
  { payload: UpdateAgreementPayload },
  { rejectValue: string }
>('agreements/createAgreement', async ({ payload }, thunkAPI) => {
  try {
    const url = `${crmRoutes.CREATE_AGREEMENT}`;
    const apiResp = await POST<UpdateAgreementResponse>(url, payload);

    if (apiResp.response.success) {
      return apiResp.response.response.data; // ✅ no type error now
    }

    return thunkAPI.rejectWithValue('Failed to Create agreement form');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data?.errors?.message || 'Network error');
  }
});

export const updateInvitees = createAsyncThunk<
  any, // ✅ loosened return type
  { payload: UpdateInviteesPayload },
  { rejectValue: string }
>('agreements/updateInvitees', async ({ payload }, thunkAPI) => {
  try {
    const url = crmRoutes.UPDATE_INVITEES;
    const body: Record<string, unknown> = {
      agreementIds: Array.isArray(payload.agreementIds) ? payload.agreementIds : [],
      internal: payload.internal ?? [],
    };
    if (payload.external !== undefined) {
      body.external = payload.external;
    }
    const apiResp = await POST<any>(url, body);

    if (apiResp.response.success) {
      return apiResp.response.response.data; // ✅ no type error now
    }

    return thunkAPI.rejectWithValue('Failed to update agreement form');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data?.errors?.message || 'Network error');
  }
});

export const getOptions = createAsyncThunk<
  {
    internalSignatories: { id: number; name: string; userId: string }[];
    crmUsers: { id: number; name: string; userId: string }[];
  }, // ✅ resolved value type
  void, // no input parameter for this API
  { rejectValue: string }
>('agreements/getOptions', async (_, thunkAPI) => {
  try {
    const url = `${crmRoutes.GET_OPTIONS}`;
    const apiResp = await GET<any>(url);
    if (apiResp?.response?.success && apiResp?.response?.response?.data) {
      return apiResp?.response?.response?.data; // ✅ { internalSignatories, crmUsers }
    }

    return thunkAPI.rejectWithValue('Failed to fetch agreement options');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data?.errors?.message || 'Network error');
  }
});

export const getInternalIviteeOptions = createAsyncThunk<
  { id: number; name: string; email: string; contactNumber: string }[], // ✅ array of invitees
  void,
  { rejectValue: string }
>('agreements/getInternalIviteeOptions', async (_, thunkAPI) => {
  try {
    const url = `${crmRoutes.INTERNAL_INVITEE_OPTION}`;
    const apiResp = await GET<any>(url);
    if (apiResp?.response?.success && apiResp?.response?.response?.data) {
      return apiResp.response.response.data; // ✅ return array directly
    }
    return thunkAPI.rejectWithValue('Failed to fetch agreement options');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data?.errors?.message || 'Network error');
  }
});

/** Export agreement list (same query params as list; no pagination). */
export const exportAgreementListReport = createAsyncThunk<boolean, AgreementExportParams>(
  'agreements/exportAgreementListReport',
  async (params) => exportAgreementListApi(params)
);

// -----------------------------
// Slice
// -----------------------------
interface AgreementState {
  data: AgreementData['result']; // list of agreements
  totalCount: number;
  summary: AgreementData['summary'];
  loading: boolean;
  error: string | null;
  agreementDetail: AgreementDetail | null; // single agreement
  loadingDetail: boolean;
  errorDetail: string | null;

  // ✅ add optionsData here
  optionsData: {
    internalSignatories: { id: number; name: string; userId: string }[];
    crmUsers: { id: number; name: string; userId: string }[];
  } | null;
  loadingOptions: boolean;
  errorOptions: string | null;
  internalOptions: { id: number; name: string; email: string; contactNumber: string }[] | null;
}

const initialState: AgreementState = {
  data: [],
  totalCount: 0,
  summary: {
    totalSent: 0,
    totalSigned: 0,
    dueFor3Days: 0,
    pendingInternal: 0,
  },
  loading: false,
  error: null,
  agreementDetail: null,
  loadingDetail: false,
  errorDetail: null,

  // ✅ initialize optionsData state
  optionsData: null,
  loadingOptions: false,
  errorOptions: null,
  internalOptions: null,
};
const agreementSlice = createSlice({
  name: 'agreements',
  initialState,
  reducers: {
    clearAgreementDetail: (state) => {
      state.agreementDetail = null;
      state.errorDetail = null;
      state.loadingDetail = false;
    },
  },
  extraReducers: (builder) => {
    // Existing fetchAgreements
    builder
      .addCase(fetchAgreements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgreements.fulfilled, (state, action: PayloadAction<AgreementData>) => {
        state.loading = false;
        state.data = action.payload.result;
        state.summary = action.payload.summary;
        state.totalCount = action.payload.total;
      })
      .addCase(fetchAgreements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Something went wrong';
      });

    // New fetchAgreementByID
    builder
      .addCase(fetchAgreementByID.pending, (state) => {
        state.loadingDetail = true;
        state.errorDetail = null;
      })
      .addCase(fetchAgreementByID.fulfilled, (state, action: PayloadAction<AgreementDetail>) => {
        state.loadingDetail = false;
        state.agreementDetail = action.payload;
      })
      .addCase(fetchAgreementByID.rejected, (state, action) => {
        state.loadingDetail = false;
        state.errorDetail = action.payload ?? 'Failed to fetch agreement';
      });

    builder
      .addCase(getOptions.pending, (state) => {
        state.loadingOptions = true;
        state.errorOptions = null;
      })
      .addCase(
        getOptions.fulfilled,
        (
          state,
          action: PayloadAction<{
            internalSignatories: { id: number; name: string; userId: string }[];
            crmUsers: { id: number; name: string; userId: string }[];
          }>
        ) => {
          state.loadingOptions = false;
          state.optionsData = action.payload;
        }
      )
      .addCase(getOptions.rejected, (state, action) => {
        state.loadingOptions = false;
        state.errorOptions = action.payload ?? 'Failed to fetch agreement options';
      });
    builder
      .addCase(getInternalIviteeOptions.pending, (state) => {
        state.loadingOptions = true;
        state.errorOptions = null;
      })
      .addCase(getInternalIviteeOptions.fulfilled, (state, action) => {
        state.loadingOptions = false;
        state.internalOptions = action.payload; // array of invitees
      })
      .addCase(getInternalIviteeOptions.rejected, (state, action) => {
        state.loadingOptions = false;
        state.errorOptions = action.payload ?? 'Failed to fetch agreement options';
      });
  },
});

export const { clearAgreementDetail } = agreementSlice.actions;
export default agreementSlice.reducer;

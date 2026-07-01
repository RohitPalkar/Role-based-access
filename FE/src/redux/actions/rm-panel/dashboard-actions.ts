import { createAsyncThunk } from '@reduxjs/toolkit';

import { buildQueryParams } from 'src/utils/helper';
import { toaster_messages } from 'src/utils/constant';

// eslint-disable-next-line import/no-cycle
import { GET, POST, PATCH } from 'src/services/axiosInstance';

import { route } from '../../../services/apiRoutes';
import {
  GET_MASTER_DATA,
  SALES_GET_BOOKING,
  SEARCH_SFDC_USERS,
  SALES_OPPORTUNITY_LIST,
  RESET_OPPORTUNITY_DATA,
  GET_OPPORTUNITY_DETAILS,
  SALES_UPDATE_OFFICE_USE,
  SEND_BOOKING_FORM_EMAIL,
  SALES_SUBMIT_PRE_BOOKING,
  SALES_GET_OFFICE_USE_DATA,
  SEARCH_SALES_TEAM_DROPDOWN,
  SALES_CANCELLED_OPPORTUNITIES,
} from '../types';

export const getOpportunityDetails = createAsyncThunk(
  GET_OPPORTUNITY_DETAILS,
  async (payload: any) => {
    try {
      const result = await GET(route.GET_OPPORTUNITY_DETAILS, payload);
      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result?.status };
    } catch (error) {
      return { data: null, error: error?.response?.data?.errors?.message };
    }
  }
);
export const getMasterDataList = createAsyncThunk(GET_MASTER_DATA, async () => {
  try {
    const result = await GET(route.GET_MASTER_DATA);
    if (result.status === 200) {
      return { data: result?.response?.response?.data, error: null };
    }

    return { data: null, error: result?.status };
  } catch (error) {
    return { data: null, error: error?.message };
  }
});

interface ApplicantData {
  [key: string]: any; // Define a more specific type if possible
}

export const getApplicantDetails = createAsyncThunk<ApplicantData, any, { rejectValue: unknown }>(
  SALES_GET_BOOKING,
  async (payload, thunkAPI) => {
    try {
      const res = await GET(route.SALES_GET_BOOKING, payload);
      if (res?.status === 200 || res?.status === 404) {
        if (res?.response?.success) {
          return res?.response?.response?.data || {};
        }
      }
      return thunkAPI.rejectWithValue('Failed to fetch applicant details');
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
    }
  }
);

interface UpdateApplicantPayload {
  path: string;
  payload: {
    opportunityId: string;
    [key: string]: any; // Extend this to include all expected properties
  };
}

export const updateApplicantDetailsForm = createAsyncThunk<
  any, // Adjust return type based on the expected response
  UpdateApplicantPayload,
  { rejectValue: unknown }
>('updateApplicantDetailsForm', async (value, thunkAPI) => {
  try {
    const res = await PATCH(value.path, value.payload);

    if (res?.status === 200) {
      thunkAPI.dispatch(getApplicantDetails(`/${value.payload.opportunityId}`));
      return res;
    }

    // Handle error statuses (return a rejected value)
    if ([400, 404, 500].includes(res?.status)) {
      console.error('Error updating applicant details:', res);
      return thunkAPI.rejectWithValue(res); // Ensure we return something here
    }

    // If no match for status, return a default value or rejection
    return thunkAPI.rejectWithValue('Unexpected response status'); // You could adjust this based on your needs
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
  }
});

export const salesUpdateBooking = createAsyncThunk(
  'sales/updateBooking', // Action type string
  async (
    {
      opportunityId, // Opportunity ID (new argument)
      payload, // Payload containing applicant details and saveForLater flag
    }: {
      opportunityId: string; // Opportunity ID
      payload: {
        applicant1: {
          contactDetails: {
            ociImage: string[];
            panImage: string[];
            ociNumber: string;
            panNumber: string;
            aadhaarImage: string[];
          };
          personalDetails: {
            image: string;
          };
        };
        applicant2: {
          contactDetails: {
            ociImage: string[];
            panImage: string[];
            ociNumber: string;
            panNumber: string;
            aadhaarImage: string[];
          };
          personalDetails: {
            image: string;
          };
        };
        saveForLater: boolean;
      };
    },
    thunkAPI
  ) => {
    try {
      // Sending a POST request to the SALES_UPDATE_BOOKING route with the opportunity ID (opid) and payload
      const res = await POST(`${route.SALES_UPDATE_BOOKING}/${opportunityId}`, payload);

      // Check if the response indicates success
      if (res?.response?.success) {
        return res?.response; // Return the response data if successful
      }

      // Handle cases where the response is not a success
      return thunkAPI.rejectWithValue(res?.response?.message || 'Unexpected response');
    } catch (error: any) {
      // Catch any error and return a rejected value
      return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
    }
  }
);

export const salesSignedPdf = createAsyncThunk(
  'sales/signedPdf', // Action type string
  async (
    {
      opid, // Opportunity ID (new argument)
      signedPdf, // Path to the signed PDF file
    }: {
      opid: string; // Opportunity ID
      signedPdf: string; // Path to the signed PDF
    },
    thunkAPI
  ) => {
    try {
      // Sending a POST request to the SALES_SIGNED_PDF route with the opportunity ID and signed PDF
      const res = await POST(`${route.SALES_SIGNED_PDF}/${opid}`, { signedPdf });

      // Check if the response indicates success
      if (res?.response?.success) {
        return res?.response; // Return the response data if successful
      }

      // Handle cases where the response is not a success
      return thunkAPI.rejectWithValue(res?.response?.message || 'Unexpected response');
    } catch (error: any) {
      // Catch any error and return a rejected value
      return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
    }
  }
);
export const updateOfficeUse = createAsyncThunk<
  any,
  { payload: any; oppId: string },
  { rejectValue: unknown }
>(SALES_UPDATE_OFFICE_USE, async ({ payload, oppId }, thunkAPI) => {
  try {
    const res = await POST(`${route.SALES_UPDATE_OFFICE_USE}/${oppId}`, payload);

    if (res?.response?.success) {
      return res?.response;
    }

    // Handle specific status code 400
    if (res?.status === 400) {
      return thunkAPI.rejectWithValue(
        'The referral form has not been filled out by the referrer. Please ensure the form is completed and signed.'
      );
    }

    return thunkAPI.rejectWithValue('Failed to update office use details');
  } catch (error: any) {
      const backendMessage = error?.response?.data?.errors?.message;
      let finalMessage = toaster_messages.errorMessage;

      if (Array.isArray(backendMessage)) {
        const hasReferrer = backendMessage.some(msg =>
          msg.toLowerCase().includes('referrer')
        );
        finalMessage = hasReferrer
          ? 'The referral form has not been filled out by the referrer. Please ensure the form is completed and signed.'
          : backendMessage.join(', ');
      } else if (typeof backendMessage === 'string') {
        finalMessage = backendMessage.toLowerCase().includes('referrer')
          ? 'The referral form has not been filled out by the referrer. Please ensure the form is completed and signed.'
          : backendMessage;
      }

      return thunkAPI.rejectWithValue(finalMessage);
    }
});
export const submitpreBooking = createAsyncThunk<
  any,
  { payload: any; oppId: string },
  { rejectValue: unknown }
>(SALES_SUBMIT_PRE_BOOKING, async ({ payload, oppId }, thunkAPI) => {
  try {
    const res = await POST(`${route.SALES_SUBMIT_PRE_BOOKING}/${oppId}`, payload);

    if (res?.response?.success) {
      return res?.response;
    }
    return thunkAPI.rejectWithValue('Failed to update office use details');
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
  }
});
interface OpportunityListPayload {
  page: number;
  limit: number;
  search: string;
  status?: string;
}

export const getOpportunityList = createAsyncThunk(
  SALES_OPPORTUNITY_LIST,
  async (payload: OpportunityListPayload, { rejectWithValue }) => {
    try {
      const result = await GET(`${route.SALES_OPPORTUNITY_LIST}${buildQueryParams(payload)}`);
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

export const getCancelledOpportunities = createAsyncThunk(
  SALES_CANCELLED_OPPORTUNITIES,
  async (payload: OpportunityListPayload, { rejectWithValue }) => {
    try {
      const result = await GET(
        `${route.SALES_CANCELLED_OPPORTUNITIES}${buildQueryParams(payload)}`
      );
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

export const Logout = createAsyncThunk('logout', async () => {
  try {
    const result = await GET(`${route.LOGOUT}`);
    if (result.status === 200) {
      return { data: result?.response?.response, error: null };
    }
    return { data: null, error: result?.status };
  } catch (error) {
    return { data: null, error: error?.message };
  }
});
interface OfficeUseData {
  [key: string]: any; // Define a more specific type if possible
}

export const officeUseDetails = createAsyncThunk<OfficeUseData, any, { rejectValue: unknown }>(
  SALES_GET_OFFICE_USE_DATA,
  async (payload, thunkAPI) => {
    try {
      const res = await GET(route.SALES_UPDATE_OFFICE_USE, payload);
      if (res?.status === 200 || res?.status === 404) {
        if (res?.response?.success) {
          return res?.response?.response?.data || {};
        }
      }
      return thunkAPI.rejectWithValue('Failed to fetch applicant details');
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
    }
  }
);
interface SearchSDFCUsers {
  username: string;
}

export const searchSFDCUsers = createAsyncThunk(
  SEARCH_SFDC_USERS,
  async (payload: SearchSDFCUsers, { rejectWithValue }) => {
    try {
      const result = await GET(`${route.SEARCH_SFDC_USERS}${buildQueryParams(payload)}`);
      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result?.status };
    } catch (error) {
      const errorMessage =
        error?.message || 'Something went wrong. Please check your network or CORS settings.';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

interface SearchSalesTeamDropdown {
  search: string;
  role: string;
  page?: number;
  limit?: number;
}

export const searchSalesTeamDropdown = createAsyncThunk(
  SEARCH_SALES_TEAM_DROPDOWN,
  async (payload: SearchSalesTeamDropdown, { rejectWithValue }) => {
    try {
      const result = await GET(`${route.SEARCH_SALES_TEAM_DROPDOWN}${buildQueryParams(payload)}`);
      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result?.status };
    } catch (error) {
      const errorMessage =
        error?.message || 'Something went wrong. Please check your network or CORS settings.';
      return rejectWithValue({ message: errorMessage });
    }
  }
);
interface ResetOpportunityPayload {
  reason: string;
}
export const resetOpportunityData = createAsyncThunk(
  RESET_OPPORTUNITY_DATA,
  async (
    {
      isReferral,
      payload,
      opportunityId,
    }: { isReferral: boolean; payload: ResetOpportunityPayload; opportunityId: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await POST(
        `${isReferral ? route.RESET_REFERRER_DATA : route.RESET_OPPORTUNITY_DATA}/${opportunityId}`,
        payload
      );
      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result?.status };
    } catch (error) {
      const errorMessage =
        error?.message || 'Something went wrong. Please check your network or CORS settings.';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

interface SendBookingFormEmailPayload {
  oppId: string;
  formType?: 'booking' | 'referral';
  emailIds?: string;
}

export const sendBookingFormEmail = createAsyncThunk(
  SEND_BOOKING_FORM_EMAIL,
  async (payload: SendBookingFormEmailPayload, { rejectWithValue }) => {
    try {
      const result = await POST(route.SEND_BOOKING_FORM_EMAIL, payload);

      if (result.status === 200) {
        return { data: result?.response?.response, error: null };
      }
      return { data: null, error: result };
    } catch (error) {
      const errorMessage =
        error?.response.data.errors ||
        'Something went wrong. Please check your network or CORS settings.';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

interface Applicant {
  value: string;
  name: string;
}

interface ApplicantResponse {
  applicants: Applicant[];
  noOfApplicants:number;
}
export const getBookingApplicants = createAsyncThunk<
  ApplicantResponse,      // returned data type
  string,                 // payload type (bookingId)
  { rejectValue: string } // rejection type
>(
  "sales/getBookingApplicants",
  async (oppId, thunkAPI) => {
    try {
      // dynamically build endpoint
      const endpoint = `${route.SALES_BOOKINGS_APPLICANTS}/${oppId}`;
      const res = await GET(endpoint);

      if (res?.status === 200 && res?.response?.success) {
        return res.response.response.data; // { applicants: [...] }
      }

      return thunkAPI.rejectWithValue("Failed to fetch booking applicants");
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data || "Unknown error");
    }
  }
);

export const manageApplicants = createAsyncThunk<
  any, // ✅ Response type (adjust if you have a specific response)
  { oppId: string | undefined; payload: any }, // ✅ Argument type (contains oppId + payload)
  { rejectValue: unknown } // ✅ ThunkAPI config
>(
  'manageApplicants',
  async ({ oppId, payload }, thunkAPI) => {
    try {
      const res = await PATCH(`${route.SALES_MANAGE_APPLICANTS}/${oppId}`, payload);

      if (res?.status === 200) {
        return res;
      }

      // Handle known error statuses
      if ([400, 404, 500].includes(res?.status)) {
        console.error('Error updating applicants:', res);
        return thunkAPI.rejectWithValue(res);
      }

      // Fallback for unexpected responses
      return thunkAPI.rejectWithValue('Unexpected response status');
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data || 'Unknown error');
    }
  }
);

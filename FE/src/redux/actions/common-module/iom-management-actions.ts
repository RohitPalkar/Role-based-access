import type {
  RejectIomPayload,
  SubmitIomPayload,
  IOMListingResponse,
  IomDetailsResponse,
  SubmitIomPatchPayload,
  IomMyTeamListingResponse,
  DeleteApprovalProofPayload,
} from 'src/sections/common-module/internal-office-memo/iom-config';

import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  exportIomAsPDF,
  fetchIOMListing,
  exportIOMListing,
  fetchIomFromSapService,
  markUserAvailableService,
  exportMyTeamAvailability,
  markUserUnavailableService,
  type MarkUserAvailablePayload,
  fetchMyTeamAvailabilityListing,
  type MarkUserUnavailablePayload,
} from 'src/services/common-module/iom-management-service';
import {
  rejectIom as rejectIomService,
  cancelIom as cancelIomService,
  approveIom as approveIomService,
  fetchIomDetails as fetchIomDetailsService,
  deleteApprovalProof as deleteApprovalProofService,
  submitIomForApproval as submitIomForApprovalService,
  submitIomForApprovalPatch as submitIomForApprovalPatchService,
} from 'src/services/common-module/iom-details-service';

export const fetchIOMData = createAsyncThunk<
  IOMListingResponse,
  Record<string, any>,
  { rejectValue: string }
>('iom/fetchIOMData', async (params, { rejectWithValue }) => {
  try {
    return await fetchIOMListing(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching IOM listing');
  }
});

export const fetchIomDetails = createAsyncThunk<
  IomDetailsResponse,
  string,
  { rejectValue: string }
>('iom/fetchIomDetails', async (id, { rejectWithValue }) => {
  try {
    return await fetchIomDetailsService(id);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Error fetching IOM details');
  }
});

export const submitIomForApproval = createAsyncThunk<
  { success: boolean },
  SubmitIomPayload,
  { rejectValue: string }
>('iom/submitIomForApproval', async (payload, { rejectWithValue }) => {
  try {
    return await submitIomForApprovalService(payload);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Error submitting IOM for approval');
  }
});

export const submitIomForApprovalPatch = createAsyncThunk<
  { success: boolean },
  { iomId: string; payload: SubmitIomPatchPayload },
  { rejectValue: string }
>('iom/submitIomForApprovalPatch', async ({ iomId, payload }, { rejectWithValue }) => {
  try {
    const result = await submitIomForApprovalPatchService(iomId, payload);
    if (!result.success) {
      return rejectWithValue('Error submitting IOM for approval');
    }
    return result;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Error submitting IOM for approval');
  }
});

export const deleteIomApprovalProof = createAsyncThunk<
  { success: boolean },
  DeleteApprovalProofPayload,
  { rejectValue: string }
>('iom/deleteApprovalProof', async (payload, { rejectWithValue }) => {
  try {
    return await deleteApprovalProofService(payload);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Error deleting approval proof');
  }
});

export const rejectIom = createAsyncThunk<
  { success: boolean },
  RejectIomPayload,
  { rejectValue: string }
>('iom/rejectIom', async (payload, { rejectWithValue }) => {
  try {
    const result = await rejectIomService(payload);
    if (!result.success) {
      return rejectWithValue('Error rejecting IOM');
    }
    return result;
  } catch (error: any) {
    const raw = error?.response?.data?.errors?.message ?? error?.response?.data?.message;
    const text = Array.isArray(raw) ? raw[0] : raw;
    return rejectWithValue(text || error?.message || 'Error rejecting IOM');
  }
});

export const approveIom = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>('iom/approveIom', async (iomId, { rejectWithValue }) => {
  try {
    const result = await approveIomService(iomId);
    if (!result.success) {
      return rejectWithValue('Error approving IOM');
    }
    return result;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Error approving IOM');
  }
});

export const cancelIom = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>('iom/cancelIom', async (iomId, { rejectWithValue }) => {
  try {
    const result = await cancelIomService(iomId);
    if (!result.success) {
      return rejectWithValue('Error cancelling IOM');
    }
    return result;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Error cancelling IOM');
  }
});

export const fetchIomFromSap = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('iom/generateIomFromSap', async (_, { rejectWithValue }) => {
  try {
    return await fetchIomFromSapService();
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to generate IOM from SAP');
  }
});

export const fetchMyTeamAvailability = createAsyncThunk<
  IomMyTeamListingResponse,
  Record<string, any>,
  { rejectValue: string }
>('iom/fetchMyTeamAvailability', async (params, { rejectWithValue }) => {
  try {
    return await fetchMyTeamAvailabilityListing(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching my team availability');
  }
});

export const downloadIomListing = createAsyncThunk(
  'iom/downloadIomListing',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try {
      return await exportIOMListing(payload);
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to export IOM listing');
    }
  }
);

export const exportMyTeamAvailabilityReport = createAsyncThunk(
  'iom/exportMyTeamAvailability',
  async (_, { rejectWithValue }) => {
    try {
      const response = await exportMyTeamAvailability();
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to export team availability');
    }
  }
);

export const exportIomAsPDFAction = createAsyncThunk(
  'iom/exportIomAsPDF',
  async (iomId: string, { rejectWithValue }) => {
    try {
      const response = await exportIomAsPDF(iomId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || 'Failed to export IOM PDF');
    }
  }
);

export const markUserAvailable = createAsyncThunk<
  void,
  MarkUserAvailablePayload,
  { rejectValue: string }
>('iom/markUserAvailable', async (payload, { rejectWithValue }) => {
  try {
    return await markUserAvailableService(payload);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to mark user as Available');
  }
});

export const markUserUnavailable = createAsyncThunk<
  void,
  MarkUserUnavailablePayload,
  { rejectValue: string }
>('iom/markUserUnavailable', async (payload, { rejectWithValue }) => {
  try {
    return await markUserUnavailableService(payload);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to mark user as unavailable');
  }
});

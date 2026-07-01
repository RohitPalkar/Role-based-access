import type { EOIItem } from 'src/redux/slices/rm-panel/eoi-slice';
import type { CreateRazorpayOrderPayload } from 'src/utils/payment';
import type {
  EOIPayload,
  UnitTypeOption,
  DropdownOption,
  CampaignOption,
  CampaignDetails,
  CreateVoucherEOI,
  UpdateVoucherEOI,
  MapAndConvertPayload,
  ReferralVoucherPayload,
  GetVoucherByEnquiryParams,
  SourceChangeRequestPayload,
  UpdateAgreementDetailsPayload,
  CreateSourceChangeRequestPayload,
} from 'src/services/rm-panel/eoi-service';

import { toast } from 'sonner';
import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  rejectUnit,
  sendEoiLink,
  fetchCPName,
  approveUnit,
  updateVoucher,
  getVoucherById,
  eoiExportAsPDF,
  getEOIProjects,
  fetchEOIListing,
  createVoucherEOI,
  cancelEOIService,
  fetchEOICampaigns,
  ASSIGN_CLOSING_RM,
  convertEOIService,
  fetchEOIUnitTypes,
  fetchUnitDropdown,
  fetchFloorDropdown,
  getEOIPrimarySource,
  updateRefundPayment,
  getVoucherByEnquiry,
  fetchMapConvertById,
  createMapAndConvert,
  getCampaignDetailsID,
  deleteRestoreService,
  fetchReferredVoucher,
  eoiExportBookingForm,
  exportVouchersReports,
  updateAgreementDetails,
  getVoucherByPaymentRefId,
  fetchChangeSourceListing,
  fetchPreBookingDocuments,
  createSourceChangeRequest,
  approveCancellationService,
  createRazorpayOrderService,
  verifyVoucherPaymentService,
  fetchSourceChangeRequestById,
  fetchInventoryUnitApprovalRequests,
  approveOrRejectSourceChangeRequest,
  fetchEOITabCounts as fetchEOITabCountsService,
  updateVoucherStatus as updateVoucherStatusService,
  deletePaymentDetails as deletePaymentDetailsService,
  manageSfdcOpportunity as manageSfdcOpportunityService,
} from 'src/services/rm-panel/eoi-service';

export const fetchEOIData = createAsyncThunk<
  { data: EOIItem[]; total: number; page: number; pageSize: number; pageCount: number },
  Record<string, any>,
  { rejectValue: string }
>('eoi/fetchEOIData', async (params, { rejectWithValue }) => {
  try {
    return await fetchEOIListing(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching EOI listing');
  }
});

export const fetchEOICampaignsAction = createAsyncThunk<
  CampaignOption[],
  { showAll?: boolean; showBuddyCampaigns?: boolean } | void,
  { rejectValue: string }
>('eoi/fetchEOICampaigns', async (params, { rejectWithValue }) => {
  try {
    return await fetchEOICampaigns(params || undefined);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching campaigns');
  }
});

export const fetchEOIPrimarySource = createAsyncThunk<
  { value: string; hasSecondary: boolean; requiresAdditionalData: boolean }[],
  void,
  { rejectValue: string }
>('eoi/fetchEOIPrimarySource', async (_, { rejectWithValue }) => {
  try {
    return await getEOIPrimarySource();
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching campaigns');
  }
});

export const addVoucherEOI = createAsyncThunk(
  'eoi/addVoucherEOI',
  async (voucherData: CreateVoucherEOI, { rejectWithValue }) => {
    try {
      const { data, message } = await createVoucherEOI(voucherData);
      toast.success(message || 'EOI created successfully');
      return data;
    } catch (error: any) {
      const msg = error?.message || String(error || 'Something went wrong');
      return rejectWithValue(msg);
    }
  }
);

const createEOIThunk = (
  type: string,
  service: (payload: EOIPayload) => Promise<any>,
  errorMessage: string
) =>
  createAsyncThunk(type, async (payload: EOIPayload, { rejectWithValue }) => {
    try {
      const response = await service(payload);
      return response;
    } catch (error: any) {
      const message = error?.message || errorMessage;
      return rejectWithValue(message);
    }
  });

// Specific thunks
export const cancelEOIAction = createEOIThunk(
  'eoi/cancelEOI',
  cancelEOIService,
  'Failed to cancel EOI'
);

export const approveCancellationAction = createEOIThunk(
  'eoi/approveCancellation',
  approveCancellationService,
  'Failed to approve cancellation'
);

export const convertEOIAction = createEOIThunk(
  'eoi/convertEOI',
  convertEOIService,
  'Failed to convert EOI'
);

export const deleteRestoreServiceAction = createEOIThunk(
  'eoi/deleteRestoreService',
  deleteRestoreService,
  'Failed to delete voucher'
)
export const updateVoucherEOI = createAsyncThunk(
  'eoi/updateVoucherEOI',
  async (
    { id, updatedData }: { id: number; updatedData: UpdateVoucherEOI },
    { rejectWithValue }
  ) => {
    try {
      const { data, message } = await updateVoucher(id, updatedData);
      toast.success(message || 'Voucher/EOI updated successfully');
      return data;
    } catch (error: any) {
      const msg = error?.message || String(error || 'Something went wrong');
      return rejectWithValue(msg);
    }
  }
);

export const getVoucherEOIById = createAsyncThunk(
  'eoi/getVoucherEOIById',
  async ({ id, maskEmailMobile }: { id: number; maskEmailMobile?: boolean }, { rejectWithValue }) => {
    try {
      const response = await getVoucherById(id, { maskEmailMobile });
      return response;
    } catch (error: any) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);

export const sendEoiFormLink = createAsyncThunk(
  'eoi/getVoucherEOIById',
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      const response = await sendEoiLink(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);

export const assignClosingRM = createAsyncThunk<
  any,
  { id: number; sourcingRmId: number; closingRmId: number },
  { rejectValue: string }
>('eoi/assignClosingRM', async ({ id, sourcingRmId, closingRmId }, { rejectWithValue }) => {
  try {
    const response = await ASSIGN_CLOSING_RM({ id, sourcingRmId, closingRmId });

    toast.success(response?.data?.message || 'Closing RM assigned successfully');
    return response;
  } catch (error: any) {
    return rejectWithValue(error.message || error || 'Failed to assign closing RM');
  }
});
export const downloadExportVouchersReports = createAsyncThunk(
  'downloadExportVouchersReports',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await exportVouchersReports(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const deletePaymentDetails = createAsyncThunk<
  any,
  { voucherId: string | number; paymentId: number },
  { rejectValue: string }
>('eoi/deletePaymentDetails', async ({ voucherId, paymentId }, { rejectWithValue }) => {
  try {
    const response = await deletePaymentDetailsService({ voucherId, paymentId });
    toast.success('Payment details deleted successfully');
    return response;
  } catch (error: any) {
    const message = error?.message || error || 'Failed to delete payment details';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateEOIRefundPayment = createAsyncThunk<
  any,
  {
    voucherId: string | number;
    refundDate: string;
    refundTransactionId: string;
    internalRefNumber?: string;
    comments?: string;
    paidAmount: string;
  },
  { rejectValue: string }
>('eoi/updateRefundPayment', async (payload, { rejectWithValue }) => {
  try {
    const response = await updateRefundPayment(payload);
    toast.success('Refund payment updated successfully');
    return response;
  } catch (error: any) {
    const message = error?.message || error || 'Failed to update refund payment';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateVoucherStatus = createAsyncThunk<
  any,
  {
    voucherId: number;
    voucherStatus: string;
    checkerRemarks: string;
  },
  { rejectValue: string }
>('eoi/updateVoucherStatus', async (payload, { rejectWithValue }) => {
  try {
    const response = await updateVoucherStatusService(payload);
    toast.success(`Voucher ${payload.voucherStatus.toLowerCase()} successfully`);
    return response;
  } catch (error: any) {
    const message = error?.message || error || 'Failed to update voucher status';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const getEOICampaignDetailsById = createAsyncThunk<
  CampaignDetails, // ✅ Return type (resolved value)
  { id: number }, // ✅ Argument type (payload)
  { rejectValue: string } // ✅ Rejection type
>('eoi/getEOICampaignDetailsById', async ({ id }, { rejectWithValue }) => {
  try {
    const response = await getCampaignDetailsID(id);
    return response;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Something went wrong');
  }
});

export const fetchEOIUnitTypesAction = createAsyncThunk<
  UnitTypeOption[],
  { id: number },
  { rejectValue: string }
>('eoi/fetchEOIUnitTypesAction', async ({ id }, { rejectWithValue }) => {
  try {
    const response = await fetchEOIUnitTypes(id);
    return response;
  } catch (error) {
    return rejectWithValue(error?.message || 'Oops! Something went wrong.');
  }
});

export const eoiPreviewExportAsPDF = createAsyncThunk(
  'eoi/eoiExportAsPDF',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await eoiExportAsPDF(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

export const fetchReferredVoucherAction = createAsyncThunk<
  any,              
  ReferralVoucherPayload,       
  { rejectValue: string }       
>(
  'eoi/fetchReferredVoucherAction',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await fetchReferredVoucher(payload);
      return response; 
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);

export const getVoucherByEnquiryAction = createAsyncThunk<
  any,
 GetVoucherByEnquiryParams,
  { rejectValue: string }
>(
  'eoi/getVoucherByEnquiry',
  async (params, { rejectWithValue }) => {
    try {
      const response = await getVoucherByEnquiry(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Something went wrong');
    }
  }
);
export const getVoucherByPaymentRefIdAction = createAsyncThunk<
  any,
  { prid: string, campaignId: number},
  { rejectValue: string }
>('eoi/getVoucherByPaymentRefId', async ({ prid, campaignId}, { rejectWithValue }) => {
  try {
    const response = await getVoucherByPaymentRefId(prid, campaignId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Something went wrong');
  }
});

export const fetchCPNameAction = createAsyncThunk<
  DropdownOption[],
  { campaignId?: string | number | Array<string | number> },
  { rejectValue: string }
>('fetchCPName', async ({ campaignId }, { rejectWithValue }) => {
  try {
    return await fetchCPName(campaignId);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching CP Names');
  }
});

export const fetchEOIProjects = createAsyncThunk<any>(
  'eoi/getEOIProjects',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await getEOIProjects();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);
  export const createRazorpayOrder = createAsyncThunk(
    'eoi/createRazorpayOrder',
    async (payload: CreateRazorpayOrderPayload, { rejectWithValue }) => {
      try {
        return await createRazorpayOrderService(payload);
      } catch (error: any) {
        return rejectWithValue(error.message || 'Failed to create Razorpay order');
      }
    }
  );

  export const verifyVoucherPayment = createAsyncThunk(
    'eoi/verifyVoucherPayment',
    async (payload: any, { rejectWithValue }) => {
      try {
        return await verifyVoucherPaymentService(payload);
      } catch (error: any) {
        return rejectWithValue(error.message || 'Failed to verify payment');
      }
    }
  );

  export const getMapConvertById = createAsyncThunk(
    'eoi/getMapConvertById',
    async ({ id }: { id: number }, { rejectWithValue }) => {
      try {
        const response = await fetchMapConvertById(id);
        return response;
      } catch (error: any) {
        return rejectWithValue(error || 'Something went wrong');
      }
    }
  );

  export const getFloorDropdown = createAsyncThunk(
    'eoi/getFloorDropdown',
    async (payload: { projectName: string; tower: string; campaignId: number }, { rejectWithValue }) => {
      try {
        const data = await fetchFloorDropdown(payload);
        return data;
      } catch (error: any) {
        return rejectWithValue(
          error?.message || 'Failed to fetch floor dropdown'
        );
      }
    }
  );

  export const getUnitDropdown = createAsyncThunk(
    'eoi/getUnitDropdown',
    async (payload: { projectName: string; tower: string; floor: string; campaignId: number }, { rejectWithValue }) => {
      try {
        const data = await fetchUnitDropdown(payload);
        return data;
      } catch (error: any) {
        return rejectWithValue(
          error?.message || 'Failed to fetch unit dropdown'
        );
      }
    }
  );

  export const addMapAndConvert = createAsyncThunk(
    'eoi/addMapAndConvert',
    async (payload: MapAndConvertPayload, { rejectWithValue }) => {
      try {
        const response = await createMapAndConvert(payload);
        return response;
      } catch (error: any) {
        return rejectWithValue(error?.message || 'Something went wrong');
      }
    }
  );

  export const eoiExportBookingFormAsPDF = createAsyncThunk(
    'eoi/eoiExportBookingForm',
    async (oppId: string, { rejectWithValue }) => {
      try {
        const response = await eoiExportBookingForm(oppId);
        return response;
      } catch (error) {
        return rejectWithValue(error.response?.data || 'Something went wrong');
      }
    }
  );

// fetch source change request by id thunk
export const fetchSourceChangeRequestByIdThunk = createAsyncThunk(
  'eoi/fetchSourceChangeRequestById',
  async (
    { id, voucherId }: { id?: string; voucherId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetchSourceChangeRequestById(id, voucherId);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data || 'Something went wrong'
      );
    }
  }
);

// Approve or reject change source request thunk
export const approveOrRejectSourceChangeRequestThunk = createAsyncThunk(
  'eoi/approveOrRejectSourceChangeRequest',
  async (payload: SourceChangeRequestPayload, { rejectWithValue }) => {
    try {
      const response = await approveOrRejectSourceChangeRequest(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);


export const addSourceChangeRequest = createAsyncThunk(
  'eoi/addSourceChangeRequest',
  async (payload: CreateSourceChangeRequestPayload, { rejectWithValue }) => {
    try {
      const response = await createSourceChangeRequest(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);

export const fetchChangeSourceRequestData = createAsyncThunk<
  { data: any; total: number; page: number; pageSize: number; pageCount: number },
  Record<string, any>,
  { rejectValue: string }
>('eoi/fetchChangeSourceRequestData', async (params, { rejectWithValue }) => {
  try {
    const res = await fetchChangeSourceListing(params);
    return res;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching source change request listing');
  }
});

export const fetchApprovalUnitListingData = createAsyncThunk<
  { data: EOIItem[]; total: number; page: number; pageSize: number; pageCount: number },
  Record<string, any>,
  { rejectValue: string }
>('eoi/fetchApprovalUnitListingData', async (params, { rejectWithValue }) => {
  try {
    return await fetchInventoryUnitApprovalRequests(params);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Error fetching unit approval requests');
  }
});
export const fetchEOITabCounts = createAsyncThunk<
  { changeRequestCount: number; cancellationCount: number,approveUnitCount: number },
  { search?: string } | void,
  { rejectValue: string }
>('eoi/fetchEOITabCounts', async (params, { rejectWithValue }) => {
  try {
    return await fetchEOITabCountsService(params ?? undefined);
  } catch (error: any) {
    return rejectWithValue(error?.message ?? 'Error fetching tab counts');
  }
});

export const manageSfdcOpportunityThunk = createAsyncThunk(
  'eoi/manageSfdcOpportunity',
  async (
    payload: { voucherId: number; sfdcEnquiryId: string; opportunityId: string },
    { rejectWithValue }
  ) => {
    try {
      return await manageSfdcOpportunityService(payload);
    } catch (error: any) {
      return rejectWithValue(error?.message ?? 'Failed to update SFDC opportunity');
    }
  }
);

export const approveUnitBlocking = createAsyncThunk(
  'eoi/approveUnitBlocking',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await approveUnit(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);

export const rejectUnitBlocking = createAsyncThunk(
  'eoi/rejectUnitBlocking',
  async (
    { id, rejectedReason }: { id: string; rejectedReason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await rejectUnit(id, rejectedReason);
      return response;
    } catch (error: any) {
      return rejectWithValue(error || 'Something went wrong');
    }
  }
);

// Action to fetch Pre-Booking Docs in EOI Records
export const getPreBookingDocuments = createAsyncThunk(
  'eoi/getPreBookingDocuments',
  async (voucherId: number, thunkAPI) => {
    try {
      const data = await fetchPreBookingDocuments(voucherId);
      return data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const updatePreBookingDetails = createAsyncThunk(
  'eoi/updatePreBookingDetails',
  async (
    { id, payload }: { id: number; payload: UpdateAgreementDetailsPayload },
    { rejectWithValue }
  ) => {
    try {
      const { data, message } = await updateAgreementDetails(id, payload);
      toast.success(message || 'Agreement details updated successfully');
      return data;
      
    } catch (error: any) {
      const msg = error?.message || String(error || 'Something went wrong');
      return rejectWithValue(msg);
    }
  }
);
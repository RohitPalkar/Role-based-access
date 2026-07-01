import type { Dayjs } from 'dayjs';

import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { buildQueryParams } from '../../utils/helper';
import { GET, POST, PATCH, DELETE } from '../axiosInstance';

export interface BatchListPayload {
  page: number;
  limit: number;
  search?: string;
}

export interface BatchListData {
  id: number;
  campaignName: string;
  slotCount: number;
  startDate: string;
  endDate: string;
  stage: string;
  slotDuration: number;
  capacityPerSlot: number;
  status: string;
  isUserMapped: boolean;
  isNotified: boolean;
  isAttended: boolean;
}

export interface BatchStatsPayload {
  campaignId: string | number;
  stage: string;
}

export interface UpdateBatchManagerPayload {
  id: string;
}

export interface BatchStatsData {
  allRecords: {
    label: string;
    preferential: { fullyPaid: number; partiallyPaid: number };
    standard: { fullyPaid: number; partiallyPaid: number };
    voucher: { fullyPaid: number; partiallyPaid: number };
    rowTotal: number;
  };
  rows: Array<{
    label: string;
    preferential: { fullyPaid: number; pp: number };
    standard: { fullyPaid: number; pp: number };
    voucher: { fullyPaid: number; pp: number };
    rowTotal: number;
  }>;
  typology: {
    name: string;
    count: string;
  }[];
}

export interface CreateBatchDay {
  date: string;
  startTime: string;
  endTime: string;
}

export interface BatchPreviewPayload {
  id?: string | number;
  campaignId: number;
  name: string;
  stage: string;
  residentialStatus?: string;
  typology?: (string | number)[];
  slotDuration: number;
  capacityPerSlot: number;
  totalUsers?: number;
  preferenceIds: (string | number)[];
  days: CreateBatchDay[];
}

export interface BatchSlotsListPayload {
  batchId: string;
  limit: number;
  page: number;
  search?: string;
  startDate?: string | Dayjs;
  endDate?: string | Dayjs;
}

export interface AddBatchSlotsPayload {
  batchId: string;
  date: string;
  numberOfSlots: number;
  slotDuration: number;
  capacityPerSlot: number;
}

export interface UpdateBatchSlotPayload {
  endTime: string | Dayjs;
  capacity: number;
}

export interface BatchSlotSummaryData {
  totalRecords: number;
  alreadyBatched: number;
  remainingRecords: number;
  batchDuration: number;
  recordsPerBatch: number;
  availableDates: Array<{
    date: string;
    canAddMoreSlots: boolean;
    remainingMinutes: number;
    remainingPossibleSlots: number;
  }>;
}

export interface BatchSlotsDropdownPayload {
  batchId: string;
  excludeSlotId?: string;
}

export interface BatchSlotsCardsPayload {
  id: string;
}

export interface BatchSlotsCardsData {
  expectedWalkin: number;
  proratedWalkin: number;
  attended: number;
}

export interface BatchVouchersListPayload {
  slotId: string;
  page: number;
  limit: number;
  search?: string;
}

export interface BatchViewRecordsListPayload {
  page: number;
  limit: number;
  search?: string;
}

export interface BatchViewRecordsListData {
  id: string;
  uniqueReferenceId: string;
  paidVoucherId: string;
  stdEoiId: string;
  preEoiId: string;
  customerName: string;
  slotName: string;
  date: string;
  startTime: string;
  headCount: number;
  closingRm: string | null;
  sourcingRm: string | null;
  attendance: string | null;
  attendanceStatus: string;
}

export interface BatchVouchersListData {
  id: string;
  voucherId: number;
  customerName: string;
  cxStatus: string;
  uniqueReferenceId: string;
  slotName: string;
  closingRmName: string | null;
}

export interface UnmappedCountPayload {
  campaignId: number;
  stage: string;
  residentialStatus: string;
  preferenceIds: string[];
  typology: string[];
}

export interface SendCheckinOtpPayload {
  batchVoucherId: string;
}

export interface AttendanceCheckInPayload {
  batchVoucherId: string;
  otp: string;
  headCount: number;
}

export interface DropdownIdNameType {
  id: string,
  name: string,
}

export const updateBatchManager = async (payload: BatchPreviewPayload) => {
  try {
    const { id, ...rest } = payload;
    const response = await PATCH(`${route.BATCH_MANAGER_UPDATE}/${id}`, rest);

    if (response?.status === 200 || response?.status === 201) {
      return {
        data: response?.response?.response?.data,
        message: response?.response?.message || 'Batch updated successfully',
      };
    }

    throw new Error('Failed to update batch');
  } catch (error: any) {
    const message = error?.response?.data?.errors?.message || error?.message || 'Error while updating batch';
    throw new Error(message);
  }
};

export const fetchBatchListData = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.BATCH_MANAGER_LIST}?${queryString}` : route.BATCH_MANAGER_LIST;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;

      return {
        data: res?.result || [],
        total: res?.total || 0,
        page: res?.page || 1,
        pageSize: res?.result?.length || 0,
        pageCount: res?.pageCount || 0,
      };
    }

    throw new Error('Failed to fetch batch list');

  } catch (error: any) {
    const message = error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch list';
    throw new Error(message);
  }
};

// Batch view records list
export const fetchBatchViewRecordsList = async (params: BatchViewRecordsListPayload) => {
  const url = `${route.BATCH_VIEW_RECORDS_LIST}${buildQueryParams(params)}`;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;

      return {
        data: res?.result || [],
        total: res?.total || 0,
        page: res?.page || 1,
        pageSize: res?.result?.length || 0,
        pageCount: res?.pageCount || 0,
      };
    }

    throw new Error('Failed to fetch batch view records list');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch view records list';
    throw new Error(message);
  }
};

export const fetchBatchVouchersList = async (params: BatchVouchersListPayload) => {
  const { slotId, ...queryParams } = params;
  const url = `${route.BATCH_VOUCHERS_LIST}/${slotId}${buildQueryParams(queryParams)}`;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;

      return {
        data: res?.result || [],
        batchName: res?.batchName,
        campaignName: res?.campaignName,
        batchStatus: res?.batchStatus,
        slotName: res?.slotName,
        batchId: res?.batchId,
        total: res?.total || 0,
        page: res?.page || 1,
        pageSize: res?.result?.length || 0,
        pageCount: res?.pageCount || 0,
      };
    }

    throw new Error('Failed to fetch batch vouchers list');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch vouchers list';
    throw new Error(message);
  }
};

export const fetchBatchStats = async (params: BatchStatsPayload) => {
  const { campaignId, stage } = params;

  const queryParams = buildQueryParams({
    stage,
  });

  const url = `${route.BATCH_STATS}/${campaignId}${queryParams}`;
  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;
      return res;
    }

    throw new Error('Failed to fetch batch stats');
  } catch (error: any) {
    const message = error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch stats';
    throw new Error(message);
  }
};

export const createBatchManager = async (payload: BatchPreviewPayload) => {
  try {
    const response = await POST(route.BATCH_MANAGER_CREATE, payload);

    if (response?.status === 200 || response?.status === 201) {
      return {
        data: response?.response?.response?.data,
        message: response?.response?.message || 'Batches generated successfully',
      };
    }

    throw new Error('Failed to generate batches');
  } catch (error: any) {
    const message = error?.response?.data?.errors?.message || error?.message || 'Error while generating batches';
    throw new Error(message);
  }
};

export const getBatchManagerById = async (params: UpdateBatchManagerPayload) => {
  const { id } = params;

  const url = `${route.GET_BATCH_MANAGER_By_ID}/${id}`;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;
      return res;
    }

    throw new Error('Failed to fetch batch manager');
  } catch (error: any) {
    const message = error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch manager';
    throw new Error(message);
  }
};

export const fetchBatchSlotsList = async (params: BatchSlotsListPayload) => {
  const url = `${route.BATCH_SLOTS_LIST}${buildQueryParams(params)}`;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;
      return res;
    }

    throw new Error('Failed to fetch batch slots list');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch slots';
    throw new Error(message);
  }
};

export const fetchBatchSlotSummary = async (id: string) => {
  const url = `${route.BATCH_SLOT_SUMMARY}/${id}`;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;
      return res;
    }

    throw new Error('Failed to fetch batch slot summary');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch slot summary';
    throw new Error(message);
  }
};

export const addBatchSlots = async (payload: AddBatchSlotsPayload) => {
  const url = route.BATCH_SLOTS_ADD;

  try {
    const response = await POST(url, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }

    throw new Error('Failed to add batch slots');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while adding batch slots';
    throw new Error(message);
  }
};

export const updateBatchSlot = async (id: string, payload: UpdateBatchSlotPayload) => {
  const url = `${route.BATCH_SLOTS_UPDATE}/${id}`;

  try {
    const response = await PATCH(url, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }

    throw new Error('Failed to update batch slot');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while updating batch slot';
    throw new Error(message);
  }
};

export type MapBatchVouchersBody = { notifyAt?: string };

export const mapBatchVouchers = async (
  batchId: string,
  body: MapBatchVouchersBody = {}
) => {
  const url = `${route.BATCH_MANAGER_MAP_VOUCHERS}/${batchId}`;

  try {
    const response = await POST(url, body);

    if (response?.status === 200 || response?.status === 201) {
      return {
        message:
          response?.response?.message ||
          response?.response?.response?.message ||
          'Customers notified successfully',
      };
    }

    throw new Error('Failed to map vouchers');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while mapping vouchers';
    throw new Error(message);
  }
};

export const notifyBatch = async (
  params: {
    batchId?: string;
    mappedUserId?: string;
    body?: any;
  }
) => {

  const url = `${route.BATCH_MANAGER_NOTIFY}`;

  try {
   const response = await POST(url, {
      batchId: params.batchId,
      mappedUserId: params.mappedUserId,
      ...params.body,
    });

    if (response?.status === 200 || response?.status === 201) {
      return {
        message:
          response?.response?.message ||
          response?.response?.response?.message ||
          'Customers notified successfully',
      };
    }

    throw new Error('Failed to notify customers');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while notifying customers';
    throw new Error(message);
  }
};

export const deleteBatch = async (id: string) => {
  const url = `${route.BATCH_MANAGER_DELETE}/${id}`;

  try {
    const response = await DELETE(url);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response;
    }

    throw new Error('Failed to delete batch');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while deleting batch';

    throw new Error(message);
  }
};

export const deleteBatchSlot = async (id: string) => {
  const url = `${route.BATCH_SLOTS_DELETE}/${id}`;

  try {
    const response = await DELETE(url);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response;
    }

    throw new Error('Failed to delete batch slot');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while deleting batch slot';

    throw new Error(message);
  }
};
export const updateBatchSlotStatus = async (id: string, status: string) => {
  const url = `${route.BATCH_SLOTS_UPDATE_STATUS}/${id}`;

  try {
    const response = await PATCH(url, { status });

    if (response?.status === 200 || response?.status === 201) {
      return response?.response;
    }

    throw new Error('Failed to update batch slot status');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while updating batch slot status';

    throw new Error(message);
  }
};

export const fetchBatchSlotsDropdown = async (params: BatchSlotsDropdownPayload) => {
  const { batchId, excludeSlotId } = params;
  let url = `${route.BATCH_SLOTS_DROPDOWN}/${batchId}`;

  if (excludeSlotId) {
    url += `?excludeSlotId=${excludeSlotId}`;
  }

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;
      return res;
    }

    throw new Error('Failed to fetch batch slots dropdown');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch slots dropdown';
    throw new Error(message);
  }
};

export const fetchBatchSlotsCards = async (params: BatchSlotsCardsPayload) => {
  const { id } = params;
  const url = `${route.BATCH_SLOTS_STATISTICS}/${id}`;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;
      return res;
    }

    throw new Error('Failed to fetch batch slots statistics');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while fetching batch slots statistics';
    throw new Error(message);
  }
};

export interface MoveBatchUserPayload {
  targetSlotId: string;
  comment?: string;
}

export const moveBatchUser = async (voucherId: string | number, payload: MoveBatchUserPayload) => {
  const url = `${route.BATCH_SLOTS_MOVE_USER}/${voucherId}`;

  try {
    const response = await PATCH(url, payload);

    if (response?.status === 200 || response?.status === 201) {
      return {
        message: response?.response?.message || 'User moved successfully',
      };
    }

    throw new Error('Failed to move user');
  } catch (error: any) {
    const message = error?.response?.data?.errors?.message || error?.message || 'Error while moving user';
    throw new Error(message);
  }
};

export const exportBatchList = async (payload: {
  batchId: string;
  search?: string;
}) => {
  try {
    const queryParams = new URLSearchParams(payload as any).toString();
    const response = await GET(`${route.EXPORT_BATCH_LIST}?${queryParams}`);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', path);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};

export const fetchUnmappedCount = async (payload: UnmappedCountPayload) => {
  try {
    const response = await POST(route.BATCH_MANAGER_UNMAPPED_COUNT, payload);

    if (response?.status === 200 || response?.status === 201) {
      const res = response?.response?.response?.data;
      return res;
    }

    throw new Error('Failed to fetch unmapped count');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message || error?.message || 'Error while fetching unmapped count';
    throw new Error(message);
  }
}

export const sendCheckinOtp = async (payload: SendCheckinOtpPayload) => {
  const url = route.SEND_CHECKIN_OTP;

  try {
    const response = await POST(url, payload);

    if (response?.status === 200 || response?.status === 201) {
      return {
        message:
          response?.response?.message ||
          response?.response?.response?.message ||
          'OTP sent successfully',
      };
    }

    throw new Error('Failed to send OTP');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while sending OTP';

    throw new Error(message);
  }
};

export const resendCheckinOtp = async (payload: SendCheckinOtpPayload) => {
  const url = route.RESEND_CHECKIN_OTP;

  try {
    const response = await POST(url, payload);

    if (response?.status === 200 || response?.status === 201) {
      return {
        message:
          response?.response?.message ||
          response?.response?.response?.message ||
          'OTP resent successfully',
      };
    }

    throw new Error('Failed to resend OTP');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while resending OTP';

    throw new Error(message);
  }
};

export const attendanceCheckIn = async (payload: AttendanceCheckInPayload) => {
  const url = route.ATTENDANCE_CHECK_IN;

  try {
    const response = await POST(url, payload);

    if (response?.status === 200 || response?.status === 201) {
      return {
        message:
          response?.response?.message ||
          response?.response?.response?.message ||
          'Attendance marked successfully',
      };
    }

    throw new Error('Failed to mark attendance');
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while marking attendance';

    throw new Error(message);
  }
};
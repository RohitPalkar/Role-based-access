import type { Dayjs } from 'dayjs';

import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { GET, POST } from '../axiosInstance';
import { adminRoutes } from '../adminRoutes';
import { eoiManagerRoutes } from '../eoiManagerRoutes';

/* ---------- Types ---------- */

export interface EOIDashboardListPayload {
  page: number;
  limit: number;
  sortBy?: string;
  view: string;
  viewBy?: string[] | null;
  campaign?: string | null;
  unitType?: string | null;
  formPaymentStatus?: string | null;
  startDate?: Dayjs | string | null;
  endDate?: Dayjs | string | null;
}

export interface EOIDashboardCampaign {
  campaignId: number;
  campaign: string;
  collectedEoiCount: number;
  inProgressEoiCount: number;
  totalEoiAmount: number;
  totalEoiAmountCollected: number;
  allotedIdCount?: number;
  activeEoiCount?: number;
  pendingMISCount?: number;
  pendingCRMCount?: number;
  pendingFINCount?: number;
  pendingRMCount?: number;
  cancellationCount?: {
    totalCount: number;
    processed: number;
    inProgress: number;
    requested: number;
  };
  channelPartner?: string;
  loyalty?: string;
  purvaChampion?: string;
  direct?: string;
  digital?: string;
  paidEoiCollectedCounts?: number;
  partiallyPaidEoiCollectedCounts?: number;
}

export interface EOIDashboardCards {
  totalCompaigns: number;
  vouchersCollected: number;
  totalAmountPayable: number;
  amountCollected: number;
  amountRefunded: number;
  cancelledUnits: number;
  unitsRefunded: number;
  vouchersInProgress: number;
  vouchersCreated: number;
}

export interface EOIDashboardListResponse {
  campaigns: EOIDashboardCampaign[];
  cards: EOIDashboardCards | null;
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/* Inventory wise split types */
export interface InventoryWiseSplitData {
  labels: string[];
  series: number[];
}

export interface InventoryWiseSplitListResponse {
  data: InventoryWiseSplitData;
}

export interface InventoryWiseSplitListPayload {
  campaignId?: string | null;
  startDate?: Dayjs | string | null;
  endDate?: Dayjs | string | null;
}

/* Daily tracker types */
export interface DailyTrackerPayload {
  campaignId?: string | null;
  startDate?: Dayjs | string | null;
  endDate?: Dayjs | string | null;
  // extend if needed
}

export interface DailyTrackerSeries {
  name: string;
  data: number[];
}

export interface DailyTrackerResponse {
 data:any
}

/* ---------- Services ---------- */

export const getEOIDashboardList = async (
  payload: EOIDashboardListPayload
): Promise<EOIDashboardListResponse> => {
  try {
    const response = await POST(adminRoutes.GET_EOI_DASHBOARD_LIST, payload);
    if (response?.status === 200) {
      const data = response?.response?.response?.data;
      return {
        campaigns: data?.campaigns || [],
        cards: data?.cards || null,
        limit: data?.limit || 10,
        page: data?.page || 1,
        pages: data?.pages || 1,
        total: data?.totalCount || 0,
      };
    }
    throw new Error(`Unexpected HTTP Status: ${response?.status}`);
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message || error?.message || 'Oops! Something went wrong.'
    );
  }
};

export const exportEOIDashboardList = async (payload: Record<string, any>) => {
  try {
    const res = await POST(adminRoutes.EXPORT_EOI_DASHBOARD_LIST, payload);

    const responseData = res?.response?.response;
    const { data, message } = responseData || {};

    if (!data?.filePath) {
      toast.error(message || 'Failed to export report.');
      return;
    }

    const fileUrl = `${CONFIG?.site?.s3BasePath}/${data.filePath}`;
    const fileName = data.filePath.split('/').pop() || 'eoi_dashboard_report.xlsx';

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success(message || 'Report exported successfully.');
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.errors?.message || error?.message || 'Failed to export report.';
    toast.error(errorMsg);
  }
};

export const getInventoryWiseSplitList = async (
  payload: InventoryWiseSplitListPayload
): Promise<InventoryWiseSplitListResponse> => {
  try {
    const filteredParams: Record<string, any> = {};

    (Object.keys(payload) as Array<keyof InventoryWiseSplitListPayload>).forEach((key) => {
      const value = payload[key];
      if (value !== undefined && value !== null && value !== '') {
        filteredParams[key as string] = value;
      }
    });

    const queryString = new URLSearchParams(filteredParams).toString();

    const response = await GET(`${eoiManagerRoutes.INVENTORY_WISE_SPLIT}${queryString ? `?${queryString}` : ''}`);

    if (response?.status === 200) {
      const data = response?.response?.response?.data || {};
      return {
        data: {
          labels: data?.labels || [],
          series: data?.series || [],
        },
      };
    }
    throw new Error(`Unexpected HTTP Status: ${response?.status}`);
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message || error?.message || 'Oops! Something went wrong.'
    );
  }
};

export const getDailyTracker = async (
  payload: DailyTrackerPayload
): Promise<DailyTrackerResponse> => {
  try {
       const filteredParams: Record<string, any> = {};

    (Object.keys(payload) as Array<keyof DailyTrackerPayload>).forEach((key) => {
      const value = payload[key];
      if (value !== undefined && value !== null && value !== '') {
        filteredParams[key as string] = value;
      }
    });

    const queryString = new URLSearchParams(filteredParams).toString();

    const response = await GET(`${eoiManagerRoutes.GET_DAILY_TRACKER}${queryString ? `?${queryString}` : ''}`);

    if (response?.status === 200) {
      const data = response?.response?.response || {};
      return data;
    }
    throw new Error(`Unexpected HTTP Status: ${response?.status}`);
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.errors?.message || error?.message || 'Oops! Something went wrong.'
    );
  }
};

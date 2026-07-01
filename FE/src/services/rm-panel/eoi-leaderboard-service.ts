

import type { Dayjs } from 'dayjs';

import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { GET, POST } from '../axiosInstance';

export interface EOILeaderboardPayload {
  page: number;
  limit: number;
  sortBy?: string;
  view: string;
  campaign?: string | null;
  startDate?: Dayjs | string | null;
  endDate?: Dayjs | string | null;
}

export interface LeaderboardCards {
  totalEOIs?: number;
  cpEois?: number;
  cpPercentage?: number;
  cpEoiValues?: number;
  activeCps?: number;
  onboardedCps?: number;
  topRmValues?: number;
  overallPipeline?: number;
  cpEoiCollected?: number;
  eoiValue?: number;
  eoisCollected?: number;
  topRmContributions?: number;
  formFillInProgress?: number;
  formLinksShared?: number;
}

export interface EOILeaderboardData {
  id?: number;
  cpId?: number;
  rmId?: number;
  campaignId?: number;
  createdById?:number
  cpName?: string;
  cpType?: string | null;
  campaignName: string;
  noOfVouchers: number | null;
  voucherValue: number | null;
  amountCollected: number | null;
  createdByName?: string | null;
  lastCollectedDate: string | null;
  rmName?: string | null;
  userGroup?: string | null;
}


export const fetchLeaderboardList = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.EOI_LEADERBOARD_LIST}?${queryString}` : route.EOI_LEADERBOARD_LIST;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;

      return {
        data: res?.result || [],
        cards: res?.cards,
        total:res?.total,
        page: res?.page,
        pageSize: res?.result.length,
        pageCount: res?.pageCount,
      };
    }

    throw new Error('Failed to fetch leaderboard listing');
  } catch (error: any) {
    console.error('Leaderboard service error:', error);

    const message = error?.response?.data?.errors?.message || error?.message || 'Error while fetching leaderboard listing';
    throw new Error(message);
  }
};

export const exportEOILeaderboardList = async (payload: Record<string, any>) => {
  try {
    const res = await POST(route.EXPORT_EOI_Leaderboard_LIST, payload);

    const responseData = res?.response?.response;
    const { data, message } = responseData || {};

    if (!data?.filePath) {
      toast.error(message || 'Failed to export report.');
      return;
    }
    const fileUrl = `${CONFIG?.site?.s3BasePath}/${data.filePath}`;
    const fileName = data.filePath.split('/').pop() || 'eoi_Leaderboard_report.xlsx';

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
import type { Dayjs } from "dayjs";

export type ILeaderBoardRMSummaryTableFilters = {
 name: string | null;
  brandId: string | null;
  cityIds: string[] | null;
  projectIds: string[] | null;
  unitStatus: string | null;
  incentiveStatus: string | null;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  sortBy: string | null;
  search?: string | null;
};

export type ILeaderBoardSummaryItem = {
  id?: string | number;
  srNo?: number;
  rmName: string;
  totalBookings: string;
  totalAgreementValue: string;
  totalIncentiveAmount: string;
  percentageReceived: string;
};
export type ILeaderBoardRMSummaryResponse = {
  leaderBoardRMSummary: any;
  total: number;
  page: number;
  limit: number;
};

// New type for RM Summary response

export type IRMSummaryResponse = {
  rmSummary: ILeaderBoardSummaryItem[];
  total: number;
  currentPage: number;
  totalPages: number;
};
import type { Dayjs } from 'dayjs';

export type ReportsUserTableFilters = {
  name: string;
  sortBy: string,
};

export type ReportsUserItem = {
  id: number;
  empCode: string;
  name: string;
  email: string;
  incentivePaidYTD: string;
  incentivePayable: string;
  incentivePaid: string;
  bookingAmountYTD: number;
  collectedAmountYTD: number;
  unRegularisedBookings: string;
  regularisedBookings: string;
  cancelledBookings: string;
  disqualifiedBookings: string;
  qualifiedBookings: string;
  totalBookings: string;
};

export type IBookingReports = {
  id: number;
  unitStatus: string;
  customerName: string;
  projectName: string;
  bookingDate: string;
  agreementReceivedDate: string;
  recd: string;
  amtreced: string;
  incentivePercent: string;
  incentivePayable: string;
  stage: string;
  incentiveStatus: string;
  qualificationDate: string;
  agreementValue: string;
  incentivePaidDate: string;
};

export type IBookingReportsTableFilters = {
  name: string | null;
  brandId: string | null;
  projectIds: number[] | null;
  rmIds: number[] | null;
  unitStatus: string | null;
  incentiveStatus: string | null;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  sortBy: string | null;
  userId: any | null;
  search?: string | null;
};

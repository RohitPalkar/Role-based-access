import { route } from '../apiRoutes';
import { GET, POST } from '../axiosInstance';

export interface BankDetailsPayload {
  page: number;
  limit: number;
  sortBy?: string;
  campaign?: string | null;
  search: string | null;
}

export interface BankDetailsListData {
  campaignId: number;
  campaignName: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
}

export interface SendBankDetailsEmailPayload {
  emailIds: string[];
  campaignId: number;
}

export const fetchBankDetailsListData = async (params: Record<string, any>) => {
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${route.Bank_DETAILS_LIST}?${queryString}` : route.Bank_DETAILS_LIST;

  try {
    const response = await GET(url);

    if (response?.status === 200) {
      const res = response?.response?.response?.data;

      return {
        data: res?.campaigns || [],
        total: res?.total,
        page: res?.page,
        pageSize: res?.campaigns.length,
        pageCount: res?.pageCount,
      };
    }

    throw new Error('Failed to fetch bank details listing');
  } catch (error: any) {
    console.error('Bank details service error:', error);

    const message =
      error?.response?.data?.errors?.message ||
      error?.message ||
      'Error while fetching bank details listing';
    throw new Error(message);
  }
};

export const sendBankDetailsEmail = async (payload: SendBankDetailsEmailPayload) => {
  try {
    const response = await POST(route.SEND_BANK_DETAILS_EMAIL, payload);

    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response;
    }

    throw new Error('Failed to send email');
  } catch (error: any) {
    throw (
      error?.response?.data?.errors ||
      error ||
      'Something went wrong. Please check your network or CORS settings.'
    );
  }
};

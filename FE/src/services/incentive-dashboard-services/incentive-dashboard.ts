
import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';

export interface IncentiveCardData {
  id: number;
  title: string;
  amount: number;
  subtitleAmount: number;
  type: string;
}


export const fetchIncentiveDashboard = async (params: Record<string, any>) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await GET(`${route.INCENTIVE_BOOKINGS}?${queryString}`);
  
  if (response?.status === 200) {
    return {
      data: response?.response?.response?.data?.transformed,
      total: response?.response?.response?.data?.totalRecords,
    };
  }
  throw new Error(response.response.response.message || 'Failed to fetch data');
};


export const fetchIncentiveCards =
  // eslint-disable-next-line consistent-return
  async (params: Record<string, any>) => {
    try {
  const queryString = new URLSearchParams(params).toString();
      const response = await GET(`${route.INCENTIVE_CARDS_LIST}?${queryString}`);
      if (response?.status === 200) {
        return response?.response?.response?.data;
      }
    } catch (error) {
      throw new Error(error?.response?.data);
  }
}


export const fetchUserTarget =
  // eslint-disable-next-line consistent-return
  async (params: Record<string, any>) => {
    const queryString = new URLSearchParams(params).toString();
    
    try {
      const response = await GET(`${route.USER_TARGET}?${queryString}`);
      if (response?.status === 200) {
        return response?.response?.response?.data;
      }
    } catch (error) {
      throw new Error(error?.response?.data);
  }
}
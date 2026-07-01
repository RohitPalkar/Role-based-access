
import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';

export interface IncentiveCardData {
  id: number;
  title: string;
  amount: number;
  subtitleAmount: number;
  type: string;
}



export const fetchTopPerformers = async (params: Record<string, any>) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await GET(`${route.LEADER_BOARD_TOP_PERFORMERS}?${queryString}`);
  if (response?.status === 200) {
    return {
      data: response?.response?.response?.data,
      total: response?.response?.response?.data?.totalRecords,
    };
  }
  throw new Error(response.response.response.message || 'Failed to fetch data');
};


export const fetchCancellationData = async (params: Record<string, any>) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await GET(`${route.LEADER_BOARD_CANCELLATION}?${queryString}`);
  if (response?.status === 200) {
    return {
      data: response?.response?.response?.data,
      total: response?.response?.response?.data?.totalRecords,
    };
  }
  throw new Error(response.response.response.message || 'Failed to fetch data');
};

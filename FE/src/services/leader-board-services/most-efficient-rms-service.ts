
import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';

export const getMostEfficientRMList = async () => {
  const response = await GET(route.MOST_EFFICIENT_RMS);

  if (response?.status === 200) {
    return response?.response?.response?.data?.users;
  }
  throw new Error(response.response.response.message || 'Failed to fetch data');
};
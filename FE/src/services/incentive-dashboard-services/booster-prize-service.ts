import { GET } from '../axiosInstance';
import { adminRoutes } from '../adminRoutes';

export const fetchBoosterPrize = async () => {
  try {
    const response = await GET(`${adminRoutes.BOOSTER_PRIZE}`);
    if (response?.status === 200 || response?.status === 201) {
      return response.response.response.data;
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch booster prize');
  }
};

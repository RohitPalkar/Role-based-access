import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';

export const getIncentiveSlabs = async () => {
  try {
    const response = await GET(route.INCENTIVE_SLABS);
    if (response?.status === 200 || response?.status === 201) {
      const data = response?.response?.response?.data;
      // Ensure the response has the expected structure
      return {
        brand: data?.brand || null,
        incentivePolicy: Array.isArray(data?.incentivePolicy) ? data.incentivePolicy : [],
        boosters: Array.isArray(data?.boosters) ? data.boosters : [],
      };
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

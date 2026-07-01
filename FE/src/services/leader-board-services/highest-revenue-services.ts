import { GET } from 'src/services/axiosInstance';

import { adminRoutes } from '../adminRoutes';

export const fetchHighestRevenue = async () => {
  const response = await GET(adminRoutes.LEADERBOARD_HIGHEST_REVENUE);
  if (response?.status === 200 || response?.status === 201) {
    return response.response.response.data.results;
  }
  return null;
};

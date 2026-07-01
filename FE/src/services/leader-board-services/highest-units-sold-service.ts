import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';


export const getHighestUnitsSoldList = async () => {
  const response = await GET(`${route.HIGHEST_UNITS_SOLD}`);

  if (response?.status === 200) {
    return response?.response?.response?.data?.users;
  }
  throw new Error(response.response.response.message || 'Failed to fetch data');
};

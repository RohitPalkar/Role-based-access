import { route } from "../apiRoutes";
import { GET } from "../axiosInstance";


export const getTopRelationshipManagerList = async () => {
    const response = await GET(route.TOP_RMS);
    
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error(response.response.response.message || 'Failed to fetch data');
  };
  
  
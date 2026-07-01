
import { toast } from 'sonner';

import { appendPayloadToEndpoint } from 'src/utils/helper';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';
import { adminRoutes } from '../adminRoutes';

// ----------------------------------------------------------------------

export const getLeaderBoardRMSummary = async (payload: {
  page?: number;
  limit?: number;
  search?: string;
  brandId?: string;
  cityIds?: string[];
  projectIds?: string[];
  unitStatus?: string;
  incentiveStatus?: string;
  startDate?: string;
  endDate?: string;
  name?: string;
}) => {
  try {
    const response = await GET(appendPayloadToEndpoint(route.LEADER_BOARD_BOOKINGS, payload));
    if (response?.status === 200 || response?.status === 201) {
      return {data: response?.response?.response?.data, message: response?.response?.response?.message};
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const exportLeaderBoardRMSummary = async (payload: {
  brandId?: string;
  cityIds?: string[];
  projectIds?: string[];
  unitStatus?: string;
  incentiveStatus?: string;
  startDate?: string;
  endDate?: string;
  name?: string;
}) => {
  try {
    // Properly serialize payload into query string, handling arrays
    const queryParams = new URLSearchParams();
    
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays by joining with commas or adding multiple params
          if (value.length > 0) {
            queryParams.append(key, value.join(','));
          }
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    // Construct URL with query parameters
    const response = await GET(`${adminRoutes.LEADER_BOARD_BOOKINGS_EXPORT}${queryParams.toString()}`);
    
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;

    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', path);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.errors?.message || 
                        error?.response?.data?.message || 
                        error?.message || 
                        'Export failed';
    toast.error(errorMessage);
    return false;
  }
};
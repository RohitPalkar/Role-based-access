import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';

import { GET, POST } from '../axiosInstance';
import { adminRoutes } from '../adminRoutes';

export const getReportsUserList = async (payload: any) => {
  try {
    const queryString = new URLSearchParams(payload).toString();
    const response = await GET(`${adminRoutes.ADMIN_REPORTS_DASHBOARD_USERS}?${queryString}`);
    if (response?.status === 200 || response?.status === 201) {
      return {
        users: response?.response?.response?.data?.users,
        totalCount: response?.response?.response?.data?.total,
      };
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const exportUsersReports = async (payload: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  try {
    // Serialize payload into query string
    const queryParams = new URLSearchParams(payload as any).toString();

    // Construct URL with query parameters
    const response = await GET(`${adminRoutes.EXPORT_USER_REPORTS}?${queryParams}`);

    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;

    // Create download link and trigger the download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', path);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};

export const refreshBookings = async () => {
  const response = await POST(adminRoutes.USER_BOOKINGS_REFRESH);
  if (response?.status === 200 || response?.status === 201) {
    return response;
  }
  return [];
};

export const exportBookingsUsersReports = async (payload: {
  page: number;
  limit: number;
  search: string;
  userId: string;
  brandId: string;
  projectIds: string;
  unitStatus: string;
  incentiveStatus: string;
  startDate: string;
  endDate: string;
}) => {
  try {
    // Serialize payload into query string
    const queryParams = new URLSearchParams(payload as any).toString();

    // Construct URL with query parameters
    const response = await GET(`${adminRoutes.ADMIN_REPORTS_BOOKING_EXPORTS}?${queryParams}`);
    const path = response?.response?.response?.data?.filePath;
    const s3BaseUrl = CONFIG.site.s3BasePath;
    const fileUrl = `${s3BaseUrl}/${path}`;

    // Create download link and trigger the download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', path);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(response?.response?.response?.message);
    return true;
  } catch (error) {
    toast.error(error?.response?.data?.errors?.message);
    return false;
  }
};

export const fetchDropdownData = async (search: string) => {
  const response = await GET(`${adminRoutes.RM_LIST}?search=${search}`);
  if (response?.status === 200 || response?.status === 201) {
    return response?.response?.response?.data;
  }
  return [];
};

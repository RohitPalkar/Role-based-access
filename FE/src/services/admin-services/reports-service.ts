import type { IUserBookingsFilters } from 'src/types/admin/services/reports';

import { toast } from 'sonner';

import { buildQueryParams, appendPayloadToEndpoint } from 'src/utils/helper';

import { CONFIG } from 'src/config-global';

import { route } from '../apiRoutes';
import { adminRoutes } from '../adminRoutes';
import { GET, PATCH } from '../axiosInstance';

export const getReports = async (startDate: string | null, endDate: string | null, rmId?: string | null) => {
  try {
    let url = `${adminRoutes.INCENTIVE_REPORT_LIST}?startDate=${startDate}&endDate=${endDate}`;
    if (rmId) {
      url += `&rmId=${rmId}`;
    }
    const response = await GET(url);

    if (response?.status === 200 || response?.status === 201) {
      const res = response?.response?.response?.data?.filepath;
      const s3BaseUrl = CONFIG.site.s3BasePath;
      const fileUrl = `${s3BaseUrl}/${res}`;

      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('target', '_blank');
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(response?.response?.response?.message);
    }
    return true;
  } catch (error: any) {
    toast.error(error.response?.data.errors.message);
    throw new Error(error.response?.data.errors.message || 'Something went wrong');
  }
};

export const getUserBookings = async (payload: IUserBookingsFilters) => {
  try {
    const response = await GET(appendPayloadToEndpoint(route.USER_BOOKING_LIST, payload));
    if (response?.status === 200 || response?.status === 201) {
      return {data: response?.response?.response?.data, message: response?.response?.response?.message};
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const updateUserStatus = async (payload: any) => {
  try {
    const response = await PATCH(
      `${route.UPDATE_USER_PAYMENT_STATUS}${buildQueryParams(payload)}`,
      {}
    );
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

import type { IncentivePayload } from 'src/types/admin/services/incetive';

import { appendPayloadToEndpoint } from 'src/utils/helper';

import { route } from '../apiRoutes';
import { GET, PUT, POST } from '../axiosInstance';

export const getIncentiveList = async (payload: IncentivePayload) => {
  try {
    const response = await GET(appendPayloadToEndpoint(route.INCENTIVE_STRUCTURE, payload));
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const getIncentiveById = async (id: string) => {
  try {
    const response = await GET(`${route.INCENTIVE_STRUCTURE}/${id}`);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

export const createIncentive = async (payload: IncentivePayload) => {
  try {
    const response = await POST(route.INCENTIVE_STRUCTURE, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response || {}
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const updateIncentive = async (payload: IncentivePayload, id: string) => {
  try {
    const response = await PUT(`${route.INCENTIVE_STRUCTURE}/${id}`, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response || {}
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const getRegionOptions = async () => {
  const res = await GET(route.REGION_DROPDOWN_OPTIONS);
  if (res?.response?.success) {
    return res?.response?.response?.data || [];
  }
  throw new Error(res?.message || "Failed to fetch Regions");
};
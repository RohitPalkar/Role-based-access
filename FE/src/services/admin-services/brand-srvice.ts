import type { BrandsPayload, BrandsEditPayload } from 'src/types/admin/services/brands';

import { isRejectedWithValue } from '@reduxjs/toolkit';

import { appendPayloadToEndpoint } from 'src/utils/helper';

import { route } from '../apiRoutes';
import { GET, PATCH } from '../axiosInstance';

export const getBrandList = async (payload: BrandsPayload) => {
  try {
    const response = await GET(appendPayloadToEndpoint(route.BRANDS, payload));
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    return isRejectedWithValue('Unexpected response status');
  } catch (error: any) {
    return isRejectedWithValue(error.response?.data || 'Something went wrong');
  }
};
export const getBrandById = async (id: number) => {
  try {
    const response = await GET(`${route.BRAND_BY_ID}${id}`);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};


export const getAllBrands = async (payload: any) => {
  try {
    const response = await GET(appendPayloadToEndpoint(route.BRANDS_FIND_ALL, payload));
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    return isRejectedWithValue('Unexpected response status');
  } catch (error: any) {
    return isRejectedWithValue(error.response?.data || 'Something went wrong');
  }
};
export const editBrand = async (id: number, payload: BrandsEditPayload) => {
  try {
    const response = await PATCH(`${route.EDIT_BRANDS}${id}`, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response;
    }
    throw new Error('Unexpected response status');
  } catch (error) {
    throw new Error(error.response?.data || 'Something went wrong');
  }
};

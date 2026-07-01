import type { BoosterPayload } from "src/types/admin/services/booster";

import { appendPayloadToEndpoint } from "src/utils/helper";

import { route } from "../apiRoutes";
import { GET, PUT, POST } from "../axiosInstance";


export const getBoosterList = async (payload: BoosterPayload) => {
  try {
      const response = await GET(appendPayloadToEndpoint(route.BOOSTER, payload));
      if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data || "Something went wrong");
  }
};

export const getBoosterById = async (id: any) => {
  try {
      const response = await GET(`${route.BOOSTER}/${id}`);
      if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data || "Something went wrong");
  }
};
  
export const createBooster = async (payload: BoosterPayload) => {
  try {
    const response = await POST(route.BOOSTER, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response || {}
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const updateBooster = async (payload: BoosterPayload,id:string) => {
  try {
    const response = await PUT(`${route.BOOSTER}/${id}`, payload);
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response || {}
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.message || 'Something went wrong');
  }
};

export const getRewardTypes = async () => {
  try {
      const response = await GET(route.BOOSTER_REWARDS, '');      
      if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data || "Something went wrong");
  }
};

export const getStatusOptions = async () => {
  try {
      const response = await GET(route.BOOSTER_STATUS, '');      
      if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.data;
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data || "Something went wrong");
  }
};
// src/services/rm-panel/multi-unit-service.ts

import { buildQueryParams } from 'src/utils/helper';

import { route } from '../apiRoutes';
import { GET, POST, PATCH } from '../axiosInstance';

// 🔹 Define the MultiUnitData interface

export interface MultiUnitData {
  id: string;
  groupName: string;
  noOfUnits: number;
  paymentMethod: string;
  amount: string;
  status: string;
}

export interface MultiBookingListResponse {
  success: boolean;
  message: string;
  response: {
    statusCode: number;
    message: string;
    data:{
      groups: MultiUnitData[];
      totalRecords: number;
    }
  };
  errors: any;
}


export interface MultiBookingListPayload {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const fetchMultiBookingListService = async (
  payload: MultiBookingListPayload
): Promise<{ groups: MultiUnitData[]; totalRecords: number }> => {
  const query = buildQueryParams(payload);
  const response = await GET<MultiBookingListResponse>(
    `${route.GET_MULTI_BOOKING_LIST}${query}`
  );

  console.log('fetchMultiBookingListService response:', response);

  if (response?.response?.success && response?.response?.response?.data) {
    return response.response.response.data;
  }

  throw new Error(response?.response?.message || 'Failed to fetch multi-booking group data');
};

export interface CreateMultiBookingGroupPayload {
  groupName: string;
  noOfUnits: number;
  groupedOppoId: string[];
  paymentMethod: string;
  amount?: number;
}

export interface CreateMultiBookingGroupResponse {
  response: any;
  success: boolean;
  message: string;
  data?: any; // Replace 'any' with the actual response structure if known
}

export const createMultiBookingGroup = async (
  payload: CreateMultiBookingGroupPayload
): Promise<CreateMultiBookingGroupResponse> => {
  try {
    const response = await POST<CreateMultiBookingGroupResponse>(
      `${route.CREATE_MULTI_UNITS}`,
      payload
    );

    // Check for HTTP success status

    if (response?.status === 200 || response?.status === 201) {
      return response?.response ?? {};
    }

    throw new Error('Failed to create multi-unit booking group');
  } catch (error: any) {
    const be = error?.response?.data;
    const message =
      be?.errors?.message || be?.message || 'Failed to create multi-unit booking group';

    throw new Error(message);
  }
};
export const editMultiBookingGroup = async (
  id: string,
  payload: CreateMultiBookingGroupPayload
): Promise<CreateMultiBookingGroupResponse> => {
  try {
    const response = await PATCH<CreateMultiBookingGroupResponse>(
      `${route.EDIT_MULTI_UNITS}/${id}`, // pass id in URL
      payload
    );

    if (response?.status === 200) {
      return response.response ?? {};
    }

    throw new Error('Failed to edit multi-unit booking group');
  } catch (error: any) {
    const be = error?.response?.data;
    const message =
      be?.errors?.message || be?.message || 'Failed to edit multi-unit booking group';
    throw new Error(message);
  }
};

export interface DocumentItem {
  name: string;
  isSigned: boolean;
}

export interface BookingItem {
  unitno: string;
  Project: string;
  primarysource: string;
  Name: string;
  Id: string;
  enqrefno: string;
  Bokkingstage: string;
  BFstatus: string;
  Amount?: any;
  documents?: DocumentItem[];
  isSelected?: boolean;
  status?: string; // make optional
  SalesValue?: any;
  salesValue?:any;
  bookingvalue?: string; // make optional
}

export interface GroupDetails {
  id: string;
  groupName: string;
  noOfUnits: number;
  groupedOppoId: string[];
  paymentMethod: string;
  amount: string;
  status: string;
}

export interface MultiBookingGroupResponse {
  success: boolean;
  response: {
    statusCode: number;
    message: string;
    data: {
      opportunities: BookingItem[];
      groupDetails: GroupDetails;
      totalRecords: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  errors: any;
}
export interface MultiBookingGroupPayload {
  id: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}
// ------------------ API Call ------------------
export const fetchMultiBookingGroup = async (
  payload: MultiBookingGroupPayload
): Promise<MultiBookingGroupResponse['response']['data']> => {
  try {
    const query = buildQueryParams({
      id: payload.id,
      page: payload.page,
      limit: payload.limit,
      search: payload.search,
      sortBy: payload.sortBy,
      order: payload.order,
    });

    const response = await GET<MultiBookingGroupResponse>(
      `${route.GET_BOOKINGS_ID}${query}`
    );

    if (response?.response?.success && response?.response?.response?.data) {
      return response.response.response.data;
    }

    throw new Error('Failed to fetch multi-booking group data');
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error.message ||
      'Error fetching multi-booking group data';
    throw new Error(message);
  }
};


export interface SendGroupLinkPayload{
  id:string;
  emailIds:string;
}

export interface SendGroupLinkResponse {
  response: any;
  success: boolean;
  message: string;
  data?: any; // Replace 'any' with the actual response structure if known
}

export const sendGroupLink = async (
  payload: SendGroupLinkPayload
): Promise<CreateMultiBookingGroupResponse> => {
  try {
    const response = await POST<SendGroupLinkResponse>(
      `${route.SEND_GROUP_LINK}`,
      payload
    );

    // Check for HTTP success status

    if (response?.status === 200 || response?.status === 201) {
      return response?.response ?? {};
    }

    throw new Error('Failed to create multi-unit booking group');
  } catch (error: any) {
    const be = error?.response?.data;
    const message =
      be?.errors?.message || be?.message || 'Failed to create multi-unit booking group';

    throw new Error(message);
  }
};
import type { NotificationPayload, NotificationResponse } from "src/types/admin/services/notification";

import { appendPayloadToEndpoint } from "src/utils/helper";

import { route } from "../apiRoutes";
import { GET, PATCH } from "../axiosInstance";

export const getNotificationList = async (payload: NotificationPayload):Promise<NotificationResponse> => {
    try {
      const response = await GET(appendPayloadToEndpoint(route.NOTIFICATION, payload));
       
      if (response?.status === 200 || response?.status === 201) {
        return response?.response?.response?.data;
      }
      throw new Error("Unexpected response status");
    } catch (error: any) {
      throw new Error(error.response?.data || "Something went wrong");
    }
}

export const getUnreadNotificationCount = async ():Promise<any> => {
  try {
    const response = await GET(route.UNREAD_NOTIFICATION, '');
     
    if (response?.status === 200 || response?.status === 201) {          
      return response?.response?.response?.data;
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data || "Something went wrong");
  }
}

export const markNotificationAsRead = async ():Promise<any> => {
  try {
    const response = await PATCH(`${route.NOTIFICATION}read`, {});
     
    if (response?.status === 200 || response?.status === 201) {
      return response?.response?.response?.message;
    }
    throw new Error("Unexpected response status");
  } catch (error: any) {
    throw new Error(error.response?.data || "Something went wrong");
  }
}
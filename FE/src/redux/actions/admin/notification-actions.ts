import type { NotificationPayload } from 'src/types/admin/services/notification';

import { boolean } from 'zod';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { getNotificationList } from 'src/services/admin-services/notification-service';


// Async thunk for fetching Notification
export const fetchNotification = createAsyncThunk<NotificationPayload, any>(
  'Notification/fetchNotification',
  // @ts-ignore
  async (payload: any) => {
    try {
      const result = await getNotificationList(payload);
      
      const newData = result?.notifications?.map((data: any) => ({
          id: data.id,
          type: data.type,
          message: data.message,
          isRead:boolean,
          createdAt: data.createdAt,
        }));

        return {notification:newData,total:result?.total};
    } catch (error: any) {
      return { data: null, error: error?.message };
    }
  }
);




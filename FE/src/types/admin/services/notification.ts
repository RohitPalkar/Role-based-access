import type { INotificationItem } from "../feature/notification";

export interface NotificationPayload {
  notifications: never[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationResponse {
  notifications: INotificationItem[];
  total: number;
  limit: number;
  totalPages: number;
  page: number;
}

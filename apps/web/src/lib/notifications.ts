import type { NotificationFilter, NotificationGroup } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type NotificationActor = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  group: NotificationGroup | null;
  title: string;
  body: string;
  href: string | null;
  refType: string | null;
  refId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActor | null;
};

export type NotificationsPage = {
  filter: NotificationFilter;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  unreadCount: number;
  notifications: NotificationItem[];
};

export function fetchNotifications(filter: NotificationFilter = "all", page = 1) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return apiRequest<NotificationsPage>(`/notifications${query ? `?${query}` : ""}`);
}

export function fetchUnreadCount() {
  return apiRequest<{ unreadCount: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiRequest<{ notification: NotificationItem; unreadCount: number }>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: "POST" },
  );
}

export function markAllNotificationsRead() {
  return apiRequest<{ marked: number; unreadCount: number }>(
    "/notifications/read-all",
    { method: "POST" },
  );
}

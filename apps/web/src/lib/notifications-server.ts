import type { NotificationsPage } from "@/lib/notifications";
import { serverApiFetch } from "@/lib/server-api";

export async function loadNotifications(): Promise<NotificationsPage | null> {
  try {
    const res = await serverApiFetch("/notifications");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: NotificationsPage };
    return body.data;
  } catch {
    return null;
  }
}

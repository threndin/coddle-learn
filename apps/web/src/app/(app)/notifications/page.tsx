import { NotificationsInbox } from "@/components/notifications/notifications-inbox";
import { loadNotifications } from "@/lib/notifications-server";

export default async function NotificationsPage() {
  const initial = await loadNotifications();
  return <NotificationsInbox initial={initial} />;
}

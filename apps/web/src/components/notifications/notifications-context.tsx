"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { fetchUnreadCount } from "@/lib/notifications";

type NotificationsContextValue = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnread: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await fetchUnreadCount();
      setUnreadCount(data.unreadCount);
    } catch {
      /* keep the last known count */
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
  }, [pathname, refreshUnread]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshUnread();
    }, 60_000);

    function onVisible() {
      if (document.visibilityState === "visible") void refreshUnread();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshUnread]);

  const value = useMemo(
    () => ({ unreadCount, setUnreadCount, refreshUnread }),
    [unreadCount, refreshUnread],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useUnreadNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useUnreadNotifications must be used within AppShell");
  }
  return ctx;
}

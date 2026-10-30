"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "@/components/app/account-menu";
import { navTitleForPath } from "@/components/app/nav-config";
import { useAppUser } from "@/components/app/app-user-context";
import { useUnreadNotifications } from "@/components/notifications/notifications-context";
import { HeaderSearch } from "@/components/search/header-search";
import { Icon } from "@/components/ui/icon";

export function AppHeader({
  collapsed,
  onToggleSidebar,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const user = useAppUser();
  const pathname = usePathname();
  const title = navTitleForPath(pathname);
  const { unreadCount } = useUnreadNotifications();
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-ink transition hover:bg-surface-subtle"
        >
          <MenuIcon />
        </button>
        <h1 className="truncate font-display text-lg font-bold tracking-tight text-ink">{title}</h1>
      </div>

      <Suspense fallback={<div className="hidden min-w-0 flex-1 md:block" />}>
        <HeaderSearch />
      </Suspense>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-subtle px-2.5 py-1.5"
          title="Learning points"
        >
          <PointsIcon />
          <span className="font-mono text-sm font-semibold tabular-nums text-ink">
            {user.points.toLocaleString()}
          </span>
          <span className="hidden text-xs text-ink-muted sm:inline">pts</span>
        </div>
        <ThemeToggle className="hidden md:inline-flex" />
        <Link
          href="/notifications"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-border text-ink transition hover:bg-surface-subtle md:inline-flex"
        >
          <Icon name="bell" className="h-[18px] w-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 py-px font-mono text-[10px] font-bold leading-4 text-white">
              {unreadLabel}
            </span>
          ) : null}
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

function PointsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3.5 14.2 8.8l5.8.5-4.4 3.7 1.4 5.6L12 15.8 6.9 18.6l1.4-5.6L4 9.3l5.8-.5L12 3.5Z" />
    </svg>
  );
}

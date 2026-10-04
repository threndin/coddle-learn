"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { navTitleForPath } from "@/components/app/nav-config";
import { useAppUser } from "@/components/app/app-user-context";

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
        <ThemeToggle />
        <div className="hidden items-center gap-2 sm:flex">
          <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          <SignOutButton className="text-sm font-medium text-ink-muted transition hover:text-ink" />
        </div>
        <div className="sm:hidden">
          <SignOutButton className="text-sm font-medium text-ink-muted transition hover:text-ink" />
        </div>
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { APP_NAV, NavIcon } from "@/components/app/nav-config";
import { useAppUser } from "@/components/app/app-user-context";

export function AppSidebar({
  collapsed,
  mobileOpen,
  onNavigate,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const user = useAppUser();
  const pathname = usePathname();
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onNavigate}
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-200 ease-out",
          "w-60 lg:translate-x-0",
          collapsed ? "lg:w-18" : "lg:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-16 shrink-0 items-center border-b border-border px-4",
            collapsed ? "lg:justify-center lg:px-2" : "",
          ].join(" ")}
        >
          <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Coddle Learn"
              width={180}
              height={44}
              className={[
                "h-10 w-auto dark:brightness-0 dark:invert",
                collapsed ? "lg:hidden" : "",
              ].join(" ")}
              priority
            />
            <Image
              src="/icon.png"
              alt="Coddle Learn"
              width={36}
              height={36}
              className={["hidden h-9 w-9", collapsed ? "lg:block" : ""].join(" ")}
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
          <ul className="space-y-0.5">
            {APP_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      collapsed ? "lg:justify-center lg:px-2" : "",
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
                    ].join(" ")}
                  >
                    <NavIcon id={item.icon} className="h-5 w-5 shrink-0" />
                    <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={[
            "shrink-0 border-t border-border p-3",
            collapsed ? "lg:px-2" : "",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center gap-3 rounded-xl bg-surface-subtle px-3 py-2.5",
              collapsed ? "lg:justify-center lg:px-2" : "",
            ].join(" ")}
          >
            <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
            <div className={["min-w-0 flex-1", collapsed ? "lg:hidden" : ""].join(" ")}>
              <p className="truncate text-sm font-semibold text-ink">{firstName}</p>
              <p className="truncate font-mono text-xs text-ink-muted">
                {user.points.toLocaleString()} pts
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

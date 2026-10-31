"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminRole } from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import { Icon, type IconName } from "@/components/ui/icon";

const TABS: { href: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: "layers",
    match: (path) => path === "/admin",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "users",
    match: (path) => path === "/admin/users" || path.startsWith("/admin/users/"),
  },
  {
    href: "/admin/usage",
    label: "AI chat usage",
    icon: "sparkle",
    match: (path) => path === "/admin/usage" || path.startsWith("/admin/usage/"),
  },
];

const COPY: Record<string, { title: string; body: string }> = {
  "/admin": {
    title: "Overview",
    body: "How the platform is growing — people, learning activity, and assistant demand.",
  },
  "/admin/users": {
    title: "Users",
    body: "Look up accounts, roles, last sign-in, and this week’s assistant quota.",
  },
  "/admin/usage": {
    title: "AI chat usage",
    body: "Weekly assistant sends, people at quota, and recent conversations.",
  },
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAppUser();
  const pathname = usePathname();

  if (!isAdminRole(user.role)) {
    return <ForbiddenState />;
  }

  const copy = COPY[pathname] ?? COPY["/admin"];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Admin
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{copy.body}</p>

      <nav
        className="mt-6 inline-flex flex-wrap rounded-xl border border-border bg-surface p-0.5"
        aria-label="Admin sections"
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={[
                "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition",
                active ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              <Icon name={tab.icon} className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}

function ForbiddenState() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start px-5 py-16 sm:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Admin
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Admins only
      </h1>
      <p className="mt-3 max-w-lg text-base leading-relaxed text-ink-muted">
        This dashboard is for people with the admin role. If you should be able to track users
        and AI chat usage, ask to be added to the admin list.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchMe, type PublicUser } from "@/lib/auth";
import { AppUserProvider } from "@/components/app/app-user-context";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { ToastProvider } from "@/components/app/toast";
import { PageLoader } from "@/components/page-loader";

const COLLAPSE_KEY = "learn_sidebar_collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          router.replace("/login");
          return;
        }
        if (!me.onboardingCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        setUser(me);
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        return next;
      });
      return;
    }
    setMobileOpen((prev) => !prev);
  }

  if (loading || !user) {
    return <PageLoader />;
  }

  return (
    <AppUserProvider user={user}>
      <ToastProvider>
        <div className="min-h-svh bg-surface-subtle">
          <AppSidebar
            collapsed={collapsed}
            mobileOpen={mobileOpen}
            onNavigate={() => setMobileOpen(false)}
          />
          <div
            className={[
              "flex min-h-svh flex-col transition-[padding] duration-200 ease-out",
              collapsed ? "lg:pl-[4.5rem]" : "lg:pl-60",
            ].join(" ")}
          >
            <AppHeader collapsed={collapsed} onToggleSidebar={toggleSidebar} />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </AppUserProvider>
  );
}

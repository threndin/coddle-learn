"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchMe, logout, type PublicUser } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface-subtle text-ink-muted">
        <p className="font-mono text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-surface-subtle">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Coddle Learn"
              width={140}
              height={34}
              className="h-8 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Dashboard
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Welcome, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          You&apos;re signed in with your Coddle account. Learning progress will
          live here as courses and roadmaps ship.
        </p>

        <dl className="mt-10 space-y-4 border-t border-border pt-8 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
            <dt className="w-28 shrink-0 font-medium text-ink-muted">Email</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}

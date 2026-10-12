"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchMe, type PublicUser } from "@/lib/auth";

export function VerifyHeader() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-8">
        <Link href={user ? "/dashboard" : "/"} className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Coddle Learn"
            width={148}
            height={36}
            className="h-8 w-auto dark:brightness-0 dark:invert"
            priority
          />
        </Link>

        {!ready ? (
          <span className="h-9 w-24 animate-pulse rounded-xl bg-surface-subtle" aria-hidden />
        ) : user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">
              {user.name.trim().split(/\s+/)[0] || user.name}
            </span>
            <Link
              href="/dashboard"
              className="inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Dashboard
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand/40"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

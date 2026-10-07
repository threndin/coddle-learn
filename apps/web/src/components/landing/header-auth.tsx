"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMe, type PublicUser } from "@/lib/auth";

export function HeaderAuth() {
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

  if (!ready) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {/* <span className="rounded-xl px-3 py-2 text-sm font-semibold text-white/40 sm:px-4">
          …
        </span> */}
        <span className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/40">
          Start learning
        </span>
      </div>
    );
  }

  if (user) {
    const firstName = user.name.trim().split(/\s+/)[0] || "Account";
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white sm:px-4"
        >
          {firstName}
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
        >
          Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/login"
        className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
      >
        Start learning
      </Link>
    </div>
  );
}

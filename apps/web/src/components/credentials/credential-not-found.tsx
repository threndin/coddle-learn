"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMe } from "@/lib/auth";

function MissingCredentialArt() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="mx-auto h-auto w-44 text-brand sm:w-52"
      role="img"
      aria-hidden
    >
      <ellipse cx="100" cy="148" rx="56" ry="8" className="fill-brand/10" />
      <g transform="rotate(-6 100 80)">
        <rect
          x="40"
          y="24"
          width="120"
          height="96"
          rx="12"
          className="fill-surface stroke-border"
          strokeWidth="2"
        />
        <rect x="54" y="40" width="72" height="8" rx="4" className="fill-ink-muted/20" />
        <rect x="54" y="56" width="52" height="6" rx="3" className="fill-ink-muted/15" />
        <rect x="54" y="68" width="64" height="6" rx="3" className="fill-ink-muted/15" />
        <circle
          cx="136"
          cy="96"
          r="14"
          className="fill-rose-50 stroke-rose-400 dark:fill-rose-500/10 dark:stroke-rose-300"
          strokeWidth="2"
        />
        <path
          d="M130 90l12 12M142 90l-12 12"
          className="stroke-rose-500 dark:stroke-rose-300"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M158 38c6 2 10 8 8 14"
        className="fill-none stroke-ink-muted/40"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="170" cy="30" r="3" className="fill-ink-muted/35" />
    </svg>
  );
}

export function CredentialNotFound({
  context = "verify",
}: {
  context?: "verify" | "detail";
}) {
  const [signedIn, setSignedIn] = useState(context === "detail");

  useEffect(() => {
    if (context === "detail") {
      setSignedIn(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setSignedIn(Boolean(me));
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context]);

  const isDetail = context === "detail";

  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-4 py-14 text-center sm:py-16">
      <MissingCredentialArt />
      <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        {isDetail ? "Credentials" : "Verification"}
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Credential not found
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
        {isDetail
          ? "That credential could not be found. It may have been removed, or the link is wrong."
          : `This verification link is invalid or the credential no longer exists. Check the URL${
              signedIn ? ", or open your credentials from the dashboard." : "."
            }`}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {isDetail || signedIn ? (
          <>
            <Link
              href="/credentials"
              className="inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {isDetail ? "All credentials" : "My credentials"}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40"
            >
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40"
            >
              Go to Coddle Learn
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { APP_NAME } from "@coddle/shared";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-surface text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid-bg opacity-70 dark:opacity-40"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 brand-glow" />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
        <p className="font-display text-sm font-bold tracking-[0.18em] text-brand uppercase">
          {APP_NAME}
        </p>
        <p className="mt-6 font-mono text-7xl font-semibold tracking-tight text-brand sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          This page is off the path
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
          The link may be outdated, the page may have moved, or it never existed. Pick up from
          somewhere that does.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

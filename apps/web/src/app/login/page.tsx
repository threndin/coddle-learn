"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { startCoddleLogin } from "@/lib/auth";

const coddleAppUrl = process.env.NEXT_PUBLIC_CODDLE_APP_URL ?? "https://www.coddle.dev";

const points = [
  "Follow one roadmap from the first step to a project",
  "Practice on a daily goal you can actually keep",
  "Leave with a profile that shows what you learned",
];

function LoginContent() {
  const reduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const error =
    errorParam === "signin_failed"
      ? "Could not complete sign-in. Please try again."
      : errorParam;
  const [pending, setPending] = useState(false);

  function onContinue() {
    setPending(true);
    startCoddleLogin();
  }

  return (
    <main className="min-h-svh bg-surface text-ink lg:grid lg:grid-cols-2">
      <aside className="relative hidden lg:block">
        <div className="sticky top-0 h-svh overflow-hidden bg-brand-navy">
          <Image
            src="/images/login-panel.jpg"
            alt="A sunlit desk with an open notebook, a pencil, a cup, and a closed laptop"
            fill
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/85 to-transparent px-10 pb-12 pt-28 xl:px-14 dark:from-[#0e1524] dark:via-[#0e1524]/90">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">
              Coddle Learn
            </p>
            <h2 className="mt-3 max-w-md font-display text-4xl font-extrabold tracking-tight text-ink">
              Learn, Build, Share, Grow.
            </h2>
            <ul className="mt-6 max-w-md space-y-3">
              {points.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <section className="flex min-h-svh flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-10">
          <Link href="/" className="inline-flex shrink-0 items-center">
            <Image
              src="/logo.png"
              alt="Coddle Learn"
              width={148}
              height={36}
              className="h-8 w-auto dark:brightness-0 dark:invert"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm font-medium text-ink-muted transition hover:text-ink">
              Home
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center px-5 py-10 sm:px-10">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-md"
          >
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
              Sign in
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              Continue with your Coddle account. Roadmaps, courses, and your learning
              progress stay with this sign-in.
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onContinue}
              disabled={pending}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
            >
              {pending ? "Redirecting…" : "Continue with Coddle"}
            </button>

            <p className="mt-6 text-sm text-ink-muted">
              No account yet?{" "}
              <a
                href={`${coddleAppUrl}/signup`}
                className="font-semibold text-brand underline-offset-2 hover:underline"
              >
                Create one on Coddle
              </a>
            </p>
          </motion.div>
        </div>

        <footer className="px-5 pb-8 text-center text-xs text-ink-muted sm:px-10">
          By continuing you agree to Coddle&apos;s terms and privacy policy.
        </footer>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid-bg flex min-h-svh items-center justify-center text-ink-muted">
          <p className="font-mono text-sm">Loading…</p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

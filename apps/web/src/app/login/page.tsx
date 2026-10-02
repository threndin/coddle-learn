"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import { startCoddleLogin } from "@/lib/auth";

const coddleAppUrl =
  process.env.NEXT_PUBLIC_CODDLE_APP_URL ?? "https://www.coddle.dev";

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
    <main className="grid-bg relative isolate flex min-h-svh flex-col text-ink">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgb(0_76_200/0.08),transparent_70%)]"
        aria-hidden
      />

      <header className="relative z-10 border-b border-border/80 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex shrink-0 items-center">
            <Image
              src="/logo.png"
              alt="Coddle Learn"
              width={148}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            Home
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 sm:px-6 sm:py-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-border  px-6 py-8 sm:px-8 sm:py-10"
        >
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-[2rem]">
            Sign in
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Continue with your Coddle account to access roadmaps, courses, and
            your learning progress.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
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

          <p className="mt-6 text-center text-sm text-ink-muted">
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

      <footer className="relative z-10 px-5 pb-8 text-center text-xs text-ink-muted sm:px-8">
        By continuing you agree to Coddle&apos;s terms and privacy policy.
      </footer>
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

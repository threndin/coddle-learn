"use client";

import { useEffect, useState } from "react";
import { GITHUB_URL } from "@coddle/shared";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { fetchMe } from "@/lib/auth";

export function OpenSource() {
  const reduceMotion = useReducedMotion();
  const [startHref, setStartHref] = useState("/login");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setStartHref(me ? "/dashboard" : "/login");
      } catch {
        if (!cancelled) setStartHref("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="opensource" className="relative overflow-hidden grid-bg px-5 py-20 sm:px-8 sm:py-28">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#004CC8]/15 blur-[100px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Built in public.{" "}
            <span className="text-gradient-primary">Join the build.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-muted">
            Contribute roadmaps, courses, code, and reviews or start learning
            as the platform ships.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={startHref}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_40px_rgb(0_76_200/0.35)] transition hover:brightness-110"
            >
              Start learning →
            </Link>
            {GITHUB_URL ? (
              <Link
                href={GITHUB_URL}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-bold text-ink transition hover:border-brand/40"
              >
                View on GitHub
              </Link>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

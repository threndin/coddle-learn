"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { roadmapBySlug } from "@coddle/shared";
import type { PublicUser } from "@/lib/auth";
import { BannerDeveloper } from "@/components/dashboard/banner-developer";

export function DashboardBanner({ user }: { user: PublicUser }) {
  const reduceMotion = useReducedMotion();
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const roadmap = user.startingRoadmapSlug
    ? roadmapBySlug(user.startingRoadmapSlug)
    : null;
  const continueHref = "/roadmaps";

  return (
    <section className="relative overflow-hidden gradient-primary text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.35) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-light/30 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8 lg:py-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
            Welcome back
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {firstName}, keep going.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85">
            {roadmap
              ? `Your ${roadmap.name} path is ready. Pick up the next step and earn more points as you learn.`
              : "Your learning home is ready. Choose a roadmap and start building momentum."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={continueHref}
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-white/95"
            >
              Continue learning
            </Link>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-sm backdrop-blur-sm">
              <span className="font-mono font-semibold tabular-nums">
                {user.points.toLocaleString()}
              </span>
              <span className="text-white/80">points</span>
            </div>
          </div>
        </motion.div>

        <div className="hidden justify-self-end lg:block lg:pr-4">
          <BannerDeveloper />
        </div>
      </div>
    </section>
  );
}

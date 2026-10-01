"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const modules = [
  {
    id: "roadmaps",
    tag: "CORE",
    title: "Roadmaps",
    body: "Directed graphs of skills — prerequisites, resources, projects, and assessments on every node.",
  },
  {
    id: "courses",
    tag: "CONTENT",
    title: "Courses",
    body: "Modules, lessons, quizzes, and exercises from contributors — progress tracked end to end.",
  },
  {
    id: "resources",
    tag: "OPEN WEB",
    title: "Resources",
    body: "Verified links to docs, MDN, GitHub, YouTube, and blogs. We connect the internet — we don’t replace it.",
  },
  {
    id: "projects",
    tag: "BUILD",
    title: "Projects",
    body: "Practical work with requirements and a public showcase: repos, live URLs, what you learned.",
  },
  {
    id: "credentials",
    tag: "PROOF",
    title: "Credentials",
    body: "Free, verifiable certificates tied to real achievements — not watched-video certificates.",
  },
  {
    id: "community",
    tag: "PEOPLE",
    title: "Community",
    body: "Questions, mentorship, contributions, and reviews. Learning stays social and open source.",
  },
] as const;

export function PlatformBoard() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const current = modules[active]!;

  return (
    <section id="platform" className="grid-bg px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Platform
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Not another course site.{" "}
            <span className="text-gradient-primary">Learning infrastructure.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {modules.map((mod, index) => {
              const isActive = index === active;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActive(index)}
                  onMouseEnter={() => setActive(index)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    isActive
                      ? "border-brand bg-brand-soft shadow-[0_0_0_1px_rgb(0_76_200/0.2)]"
                      : "border-border bg-surface hover:border-brand/30"
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold tracking-widest text-brand">
                    {mod.tag}
                  </span>
                  <p className="mt-2 font-display text-base font-bold text-ink sm:text-lg">
                    {mod.title}
                  </p>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-[280px] flex-col justify-between rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft via-surface to-surface p-7 sm:p-9"
            >
              <div>
                <p className="font-mono text-xs font-bold tracking-widest text-brand">
                  {current.tag}
                </p>
                <h3 className="mt-3 font-display text-3xl font-extrabold text-ink">
                  {current.title}
                </h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-muted">
                  {current.body}
                </p>
              </div>
              <p className="mt-8 font-mono text-xs text-ink-muted">
                hover or tap modules · {active + 1}/{modules.length}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

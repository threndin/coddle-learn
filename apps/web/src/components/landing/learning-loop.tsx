"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const steps = [
  {
    id: "discover",
    label: "Discover",
    title: "Find your next direction",
    body: "Pick a goal — frontend, backend, cloud, system design — and get a practitioner-shaped roadmap.",
    code: `goal: "Frontend Developer"
start → HTML → CSS → JS → TypeScript → React`,
  },
  {
    id: "learn",
    label: "Learn",
    title: "Follow connected resources",
    body: "Each node links courses, docs, videos, and curated open-web material — in order.",
    code: `node: React
resources: [docs, course, article]
status: in_progress`,
  },
  {
    id: "practice",
    label: "Practice",
    title: "Prove it before you move on",
    body: "Quizzes and challenges confirm readiness. Progress means demonstrated skill.",
    code: `assessment: hooks-fundamentals
score: 86
gate: pass → unlock Next.js`,
  },
  {
    id: "build",
    label: "Build",
    title: "Ship portfolio work",
    body: "Projects with requirements, submission, and a public showcase layer.",
    code: `project: "E-commerce Dashboard"
stack: [Next.js, TypeScript]
publish: true`,
  },
  {
    id: "prove",
    label: "Prove",
    title: "Earn verifiable credentials",
    body: "Free credentials tied to assessments and projects — with public verification URLs.",
    code: `credential: CL-293812
skills: [React, TypeScript, Next.js]
verify: learn.coddle.dev/credentials/...`,
  },
  {
    id: "grow",
    label: "Grow",
    title: "Share and contribute",
    body: "Community, mentorship, and open-source content — useful past the beginner stage.",
    code: `role: contributor
shipped: [roadmap, course, review]
loop: continue`,
  },
] as const;

export function LearningLoop() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const step = steps[active]!;

  return (
    <section id="loop" className="border-t border-border bg-surface px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            One path from start to proof.
          </h2>
          <p className="mt-4 text-lg text-ink-muted">
            Each stage picks up where the last one ends, so you always know
            what to learn, build, and show next.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
            {steps.map((item, index) => {
              const isActive = index === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                    isActive
                      ? "gradient-primary text-white shadow-[0_0_32px_rgb(0_76_200/0.28)]"
                      : "border border-border bg-surface text-ink-muted hover:border-brand/35 hover:text-ink"
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden rounded-2xl border border-border bg-ink text-white shadow-xl"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  loop/{step.id}.md
                </span>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-lg text-slate-300">{step.body}</p>
                <pre className="mt-6 overflow-x-auto rounded-xl bg-white/5 p-4 font-mono text-xs leading-relaxed text-sky-200 sm:text-sm">
                  <code>{step.code}</code>
                </pre>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

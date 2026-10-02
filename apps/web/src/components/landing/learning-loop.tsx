"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

function IconDiscover({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M14.5 9.5 10 10l-.5 4.5 4.5-.5.5-4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconLearn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5V6.8c0-.4.2-.8.6-1L12 3l7.4 2.8c.4.2.6.6.6 1v12.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M12 3v16.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M4 19.5 12 17l8 2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPractice({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconBuild({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7 4 12l4 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m16 7 4 5-4 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 5.5 10.5 18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconProve({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5 19 7v5.2c0 4.1-2.9 7.7-7 8.8-4.1-1.1-7-4.7-7-8.8V7l7-3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 12.1 1.9 1.9 3.7-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16.5" cy="9.5" r="2.2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4.5 18.5c.6-2.6 2.5-4 4.5-4s3.9 1.4 4.5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M13.2 18.5c.4-1.8 1.6-2.9 3.3-2.9 1.2 0 2.2.5 2.9 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const steps: {
  id: string;
  label: string;
  title: string;
  body: string;
  icon: (props: { className?: string }) => ReactNode;
}[] = [
  {
    id: "discover",
    label: "Discover",
    title: "Find your next direction",
    body: "Pick a goal (frontend, backend, cloud, system design) and get a practitioner-shaped roadmap.",
    icon: IconDiscover,
  },
  {
    id: "learn",
    label: "Learn",
    title: "Follow connected resources",
    body: "Each node links courses, docs, videos, and curated open-web material, in order.",
    icon: IconLearn,
  },
  {
    id: "practice",
    label: "Practice",
    title: "Prove it before you move on",
    body: "Quizzes and challenges confirm readiness. Progress means demonstrated skill.",
    icon: IconPractice,
  },
  {
    id: "build",
    label: "Build",
    title: "Ship portfolio work",
    body: "Projects with requirements, submission, and a public showcase layer.",
    icon: IconBuild,
  },
  {
    id: "prove",
    label: "Prove",
    title: "Earn verifiable credentials",
    body: "Free credentials tied to assessments and projects, with public verification URLs.",
    icon: IconProve,
  },
  {
    id: "grow",
    label: "Grow",
    title: "Share and contribute",
    body: "Community, mentorship, and open-source content, useful past the beginner stage.",
    icon: IconGrow,
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const card = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function LearningLoop() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % steps.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion]);

  return (
    <section id="loop" className="border-t border-border bg-surface-subtle px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl"
        >
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
        </motion.div>

        <motion.div
          variants={reduceMotion ? undefined : container}
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {steps.map((step, index) => {
            const isActive = index === active;
            const Icon = step.icon;
            return (
              <motion.button
                key={step.id}
                type="button"
                variants={reduceMotion ? undefined : card}
                onClick={() => setActive(index)}
                onFocus={() => setActive(index)}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-colors cursor-pointer sm:p-6 ${
                  isActive
                    ? "border-brand bg-brand text-white shadow-[0_18px_40px_rgb(0_76_200/0.28)]"
                    : "border-border bg-surface text-ink hover:border-brand/40"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isActive ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <p
                  className={`mt-5 font-mono text-[11px] font-bold tracking-[0.18em] ${
                    isActive ? "text-white/70" : "text-brand"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")} · {step.label.toUpperCase()}
                </p>

                <h3
                  className={`mt-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl ${
                    isActive ? "text-white" : "text-ink"
                  }`}
                >
                  {step.title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed sm:text-[15px] ${
                    isActive ? "text-white/80" : "text-ink-muted"
                  }`}
                >
                  {step.body}
                </p>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

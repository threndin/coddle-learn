"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const leftItems = [
  { label: "HTML", x: "8%", y: "22%", delay: 0 },
  { label: "React", x: "14%", y: "48%", delay: 0.4 },
  { label: "Git", x: "6%", y: "72%", delay: 0.8 },
  { label: "CSS", x: "18%", y: "34%", delay: 1.1 },
];

const rightItems = [
  { label: "TypeScript", x: "78%", y: "26%", delay: 0.2 },
  { label: "Node", x: "84%", y: "52%", delay: 0.6 },
  { label: "Next.js", x: "76%", y: "70%", delay: 1.0 },
  { label: "Go", x: "88%", y: "38%", delay: 1.3 },
];

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-brand text-white">
      <div
        className="pointer-events-none absolute bottom-[-18%] left-1/2 h-[340px] w-[min(680px,88vw)] -translate-x-1/2 sm:h-[420px] sm:w-[760px]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--brand-deep) 0%, transparent 68%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.12) 0.5px, transparent 0.6px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.1) 0.5px, transparent 0.6px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.08) 0.5px, transparent 0.6px)",
          backgroundSize: "120px 120px, 180px 180px, 90px 90px",
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
        {[...leftItems, ...rightItems].map((item) => (
          <motion.span
            key={item.label}
            className="absolute rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] font-semibold text-white/55 backdrop-blur-sm"
            style={{ left: item.x, top: item.y }}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={
              reduceMotion
                ? { opacity: 0.7 }
                : {
                    opacity: [0.45, 0.85, 0.45],
                    y: [0, -10, 0],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    opacity: {
                      duration: 4.5,
                      repeat: Infinity,
                      delay: item.delay,
                      ease: "easeInOut",
                    },
                    y: {
                      duration: 5 + item.delay,
                      repeat: Infinity,
                      delay: item.delay,
                      ease: "easeInOut",
                    },
                  }
            }
          >
            {item.label}
          </motion.span>
        ))}

        <motion.span
          className="absolute left-[12%] top-[58%] h-3 w-3 rounded-full bg-white/35 blur-[1px]"
          animate={reduceMotion ? undefined : { y: [0, -14, 0], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute right-[16%] top-[44%] h-2 w-2 rounded-full bg-white/50"
          animate={reduceMotion ? undefined : { y: [0, 12, 0], opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.span
          className="absolute left-[22%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/50"
          animate={reduceMotion ? undefined : { scale: [1, 1.6, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.span
          className="absolute right-[10%] top-[78%] h-2.5 w-2.5 rounded-full bg-white/30 blur-[2px]"
          animate={reduceMotion ? undefined : { y: [0, -16, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-4xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8 sm:py-32">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[1.1] tracking-tight text-white">
            Your path to becoming a better developer.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
            Follow structured roadmaps, learn from quality resources, build real
            projects, and develop the skills to grow your career.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#loop"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand transition hover:bg-white/90"
            >
              Start learning
            </Link>
            <Link
              href="#paths"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
            >
              View roadmaps
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

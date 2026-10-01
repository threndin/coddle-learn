"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const labels = [
  "TypeScript",
  "git commit",
  "Python",
  "docker build",
  "Go",
  "vite ready",
  "Rust",
  "pnpm dev",
  "JavaScript",
  "postgres ok",
  "Kotlin",
  "eslint clean",
  "SQL",
  "redis ping",
  "Java",
  "tsc --noEmit",
  "Swift",
  "npm test",
  "Ruby",
  "kubectl apply",
  "C#",
  "PHP",
  "Dart",
  "Elixir",
  "HTML",
  "CSS",
  "Bash",
  "cargo build",
  "next dev",
  "prisma migrate",
  "pip install",
  "bun install",
  "gh pr create",
  "make test",
  "webpack ok",
  "terraform plan",
  "helm upgrade",
  "deno run",
  "Lua",
  "Scala",
] as const;

const columns = 16;

const chips = labels.map((label, index) => {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const jitter = ((index * 29) % 9) - 4;
  return {
    label,
    left: Math.min(
      90,
      Math.max(0, (column / (columns - 1)) * 88 + (row % 2 === 0 ? 0 : 2.4) + jitter * 0.25),
    ),
    y: -row * 20 - ((index * 5) % 8),
    r: ((index * 17) % 31) - 15,
    drift: ((index * 13) % 140) - 70,
    spin: ((index * 19) % 70) - 35,
    start: -1700 - ((index * 11) % 9) * 90,
    duration: 8.4 + ((index * 7) % 32) / 10,
    delay: ((index * 5) % 19) / 10,
  };
});

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-[95svh] overflow-hidden bg-brand text-white">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%]"
        style={{
          background:
            "radial-gradient(ellipse 42% 90% at 50% 100%, #001a44 0%, #003080 46%, transparent 74%)",
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
        {chips.map((chip, index) => (
          <motion.span
            key={chip.label}
            className="absolute bottom-3 whitespace-nowrap rounded-full border border-white/80 bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-brand shadow-[0_10px_24px_rgb(0_26_68/0.18)]"
            style={{ left: `${chip.left}%` }}
            initial={{ x: chip.drift, y: chip.start, rotate: chip.r + chip.spin }}
            animate={
              reduceMotion
                ? { x: 0, y: chip.y, rotate: chip.r }
                : {
                    y: [chip.start, chip.y + 12, chip.y],
                    x: [chip.drift, 0, 0],
                    rotate: [chip.r + chip.spin, chip.r, chip.r],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: chip.duration,
                    times: [0, 0.86, 1],
                    ease: "linear",
                    delay: chip.delay,
                  }
            }
          >
            {chip.label}
          </motion.span>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[95svh] max-w-4xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8 sm:py-32">
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

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const modules = [
  {
    id: "roadmaps",
    tag: "CORE",
    title: "Roadmaps",
    body: "Directed graphs of skills: prerequisites, resources, projects, and assessments on every node.",
    accent: "from-brand to-brand-deep",
    span: "sm:col-span-2 lg:col-span-2 lg:row-span-2",
    large: true,
    image: {
      src: "/images/roadmap-board.jpg",
      alt: "Developer learning roadmap with connected skill nodes from Foundations to Projects",
    },
  },
  {
    id: "courses",
    tag: "CONTENT",
    title: "Courses",
    body: "Modules, lessons, quizzes, and exercises from contributors, with progress tracked end to end.",
    accent: "from-brand-light to-brand",
    span: "",
    large: false,
  },
  {
    id: "resources",
    tag: "OPEN WEB",
    title: "Resources",
    body: "Verified links to docs, MDN, GitHub, YouTube, and blogs. We connect the internet.",
    accent: "from-brand to-brand-light",
    span: "",
    large: false,
  },
  {
    id: "projects",
    tag: "BUILD",
    title: "Projects",
    body: "Practical work with requirements and a public showcase: repos, live URLs, what you learned.",
    accent: "from-brand-deep to-brand",
    span: "sm:col-span-2 lg:col-span-1",
    large: false,
  },
  {
    id: "credentials",
    tag: "PROOF",
    title: "Credentials",
    body: "Free, verifiable certificates tied to real achievements, not watched-video certificates.",
    accent: "from-brand to-brand-deep",
    span: "",
    large: false,
  },
  {
    id: "community",
    tag: "PEOPLE",
    title: "Community",
    body: "Questions, mentorship, contributions, and reviews. Learning stays social and open source.",
    accent: "from-brand-light to-brand-deep",
    span: "sm:col-span-2 lg:col-span-4",
    large: false,
  },
] as const;

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const card = {
  hidden: { opacity: 0, y: 32, rotateX: 8 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function PlatformBoard() {
  const [active, setActive] = useState<string | null>("roadmaps");
  const reduceMotion = useReducedMotion();

  return (
    <section id="platform" className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-28">
      <div
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-brand-light/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl"
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Platform
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Learn, build, and{" "}
            <span className="text-gradient-primary">prove it in one place.</span>
          </h2>
        </motion.div>

        <motion.div
          variants={reduceMotion ? undefined : container}
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 grid auto-rows-[minmax(160px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ perspective: 1200 }}
        >
          {modules.map((mod, index) => {
            const isActive = active === mod.id;
            return (
              <motion.button
                key={mod.id}
                type="button"
                variants={reduceMotion ? undefined : card}
                onClick={() => setActive(mod.id)}
                onMouseEnter={() => setActive(mod.id)}
                onFocus={() => setActive(mod.id)}
                whileHover={reduceMotion ? undefined : { y: -6, scale: 1.015 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left cursor-pointer sm:p-6 ${
                  mod.span
                } ${
                  isActive
                    ? "border-brand/40 bg-brand text-white shadow-[0_20px_50px_rgb(0_76_200/0.25)]"
                    : "border-border bg-surface text-ink shadow-sm"
                }`}
              >
                <motion.div
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-linear-to-br ${mod.accent} opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40`}
                  animate={
                    reduceMotion
                      ? undefined
                      : isActive
                        ? { scale: [1, 1.2, 1], x: [0, 8, 0] }
                        : { scale: 1 }
                  }
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`font-mono text-[10px] font-bold tracking-[0.2em] ${
                        isActive ? "text-white/70" : "text-brand"
                      }`}
                    >
                      {mod.tag}
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        isActive ? "text-white/50" : "text-ink-muted"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3
                    className={`mt-4 font-display font-extrabold tracking-tight ${
                      mod.large ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"
                    } ${isActive ? "text-white" : "text-ink"}`}
                  >
                    {mod.title}
                  </h3>

                  <p
                    className={`mt-3 max-w-md text-sm leading-relaxed sm:text-[15px] ${
                      isActive ? "text-white/80" : "text-ink-muted"
                    } ${mod.large ? "sm:text-base" : ""}`}
                  >
                    {mod.body}
                  </p>

                  {"image" in mod && mod.image ? (
                    <motion.div
                      className={`relative mt-5 aspect-4/3 w-full overflow-hidden rounded-xl ${
                        isActive
                          ? "border border-white/20 shadow-[0_12px_32px_rgb(0_26_68/0.28)]"
                          : "border border-border shadow-sm"
                      }`}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: 0.1 }}
                    >
                      <Image
                        src={mod.image.src}
                        alt={mod.image.alt}
                        fill
                        sizes="(max-width: 1024px) 90vw, 420px"
                        className="object-cover object-center"
                      />
                    </motion.div>
                  ) : null}

                  <motion.span
                    className={`mt-auto pt-6 font-mono text-[11px] font-semibold tracking-wide ${
                      isActive ? "text-white" : "text-brand"
                    }`}
                    animate={
                      reduceMotion
                        ? undefined
                        : isActive
                          ? { x: [0, 4, 0] }
                          : { x: 0 }
                    }
                    transition={{ duration: 1.4, repeat: isActive ? Infinity : 0 }}
                  >
                    Explore →
                  </motion.span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

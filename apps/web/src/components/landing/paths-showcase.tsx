"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

const paths = [
  {
    name: "Frontend Developer",
    nodes: ["HTML", "CSS", "JS", "TS", "React", "Next.js"],
  },
  {
    name: "Node Backend",
    nodes: ["JS", "Node", "APIs", "Auth", "Postgres"],
  },
  {
    name: "TypeScript Mastery",
    nodes: ["JS", "Types", "Generics", "Patterns"],
  },
  {
    name: "System Design",
    nodes: ["Foundations", "Scaling", "Tradeoffs", "Case studies"],
  },
  {
    name: "Cloud Engineering",
    nodes: ["Linux", "Docker", "CI/CD", "Cloud"],
  },
  {
    name: "Go Services",
    nodes: ["Syntax", "Concurrency", "HTTP", "Deploy"],
  },
];

export function PathsShowcase() {
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <section id="paths" className="overflow-hidden bg-brand-navy py-20 text-white sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand-light">
            Ecosystem
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Paths you can{" "}
            <span className="text-brand-light">drag through</span>
          </h2>
          <p className="mt-4 max-w-lg text-lg text-slate-400">
            Inspired by living ecosystem boards — scroll sideways and explore
            what Coddle Learn will teach.
          </p>
        </motion.div>
      </div>

      <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
        ◀ drag ▶
      </p>

      <div
        ref={scrollerRef}
        className="mt-4 flex cursor-grab gap-4 overflow-x-auto px-5 pb-4 active:cursor-grabbing sm:px-[max(1.25rem,calc((100vw-72rem)/2+2rem))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {paths.map((path, index) => (
          <article
            key={path.name}
            className="w-[280px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-brand/60 hover:bg-brand/15 sm:w-[300px]"
          >
            <p className="font-mono text-[11px] font-bold tracking-widest text-brand-light">
              PATH {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-3 font-display text-xl font-bold">{path.name}</h3>
            <ol className="mt-5 space-y-2">
              {path.nodes.map((node, i) => (
                <li
                  key={node}
                  className="flex items-center gap-2 font-mono text-xs text-slate-300"
                >
                  <span className="text-brand">●</span>
                  {node}
                  {i < path.nodes.length - 1 ? (
                    <span className="text-slate-600">↓</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
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
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    axis: "x" | "y" | null;
  } | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      axis: event.pointerType === "touch" ? null : "x",
    };
    if (event.pointerType !== "touch") {
      el.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (drag.axis === "y") {
        dragRef.current = null;
        return;
      }
      el.setPointerCapture(event.pointerId);
    }

    if (drag.axis !== "x") return;
    el.scrollLeft = drag.scrollLeft - dx;
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
  }

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
            Find your path.{" "}
            <span className="text-brand-light">Follow it through.</span>
          </h2>
          <p className="mt-4 max-w-lg text-lg text-slate-400">
            Each roadmap is a sequence of skills, from the first concept to a
            project you can show.
          </p>
        </motion.div>
      </div>

      <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
        ◀ drag ▶
      </p>

      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="mt-4 cursor-grab touch-pan-y overflow-x-auto pb-4 select-none active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max gap-4 px-5 sm:px-[max(1.25rem,calc((100vw-72rem)/2+2rem))]">
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
      </div>
    </section>
  );
}

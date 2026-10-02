"use client";

import { useEffect, useRef, useState } from "react";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: number;
    lastX: number;
    lastTime: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  function maxOffset() {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return 0;
    return Math.max(0, track.scrollWidth - viewport.clientWidth);
  }

  function applyOffset(next: number, withVelocity = 0) {
    const clamped = Math.min(Math.max(next, 0), maxOffset());
    offsetRef.current = clamped;
    velocityRef.current = withVelocity;
    setOffset(clamped);
  }

  function stopMomentum() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function startMomentum() {
    stopMomentum();
    if (reduceMotion) return;

    const tick = () => {
      const next = offsetRef.current + velocityRef.current;
      const max = maxOffset();
      if (next <= 0 || next >= max) {
        applyOffset(Math.min(Math.max(next, 0), max), 0);
        frameRef.current = null;
        return;
      }
      applyOffset(next, velocityRef.current * 0.94);
      if (Math.abs(velocityRef.current) < 0.18) {
        frameRef.current = null;
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (maxOffset() <= 0) return;
      const dominantY = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
      if (!dominantY && Math.abs(event.deltaX) < 0.5) return;
      event.preventDefault();
      stopMomentum();
      applyOffset(offsetRef.current + (dominantY ? event.deltaY : event.deltaX));
    };

    const onResize = () => applyOffset(offsetRef.current);

    viewport.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      stopMomentum();
    };
  }, [reduceMotion]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (maxOffset() <= 0) return;
    stopMomentum();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: offsetRef.current,
      lastX: event.clientX,
      lastTime: performance.now(),
      axis: event.pointerType === "touch" ? null : "x",
    };
    if (event.pointerType !== "touch") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (drag.axis === "y") {
        dragRef.current = null;
        setDragging(false);
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }

    if (drag.axis !== "x") return;
    event.preventDefault();

    const now = performance.now();
    const dt = Math.max(now - drag.lastTime, 1);
    velocityRef.current = ((drag.lastX - event.clientX) / dt) * 16;
    drag.lastX = event.clientX;
    drag.lastTime = now;

    applyOffset(drag.origin - dx);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const wasHorizontal = dragRef.current.axis === "x";
    dragRef.current = null;
    setDragging(false);
    if (wasHorizontal) startMomentum();
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
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`mt-4 overflow-hidden pb-4 select-none ${
          dragging ? "cursor-grabbing touch-none" : "cursor-grab touch-pan-y"
        }`}
      >
        <div
          ref={trackRef}
          className="flex w-max gap-4 px-5 will-change-transform sm:px-[max(1.25rem,calc((100vw-72rem)/2+2rem))]"
          style={{ transform: `translate3d(${-offset}px, 0, 0)` }}
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
      </div>
    </section>
  );
}

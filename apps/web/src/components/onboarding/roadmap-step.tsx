"use client";

import { useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  SKILL_CATALOG,
  STARTER_ROADMAPS,
  levelById,
  recommendRoadmap,
  type ExperienceLevel,
  type StarterRoadmap,
} from "@coddle/shared";

const swipeOffset = 90;
const swipeVelocity = 500;

function skillLabel(slug: string): string {
  return SKILL_CATALOG.find((skill) => skill.slug === slug)?.name ?? slug;
}

function matchLine(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length > 3) return `Matches ${names.length} of your skills`;
  const [first, second, third] = names;
  if (names.length === 1) return `Matches ${first}`;
  if (names.length === 2) return `Matches ${first} and ${second}`;
  return `Matches ${first}, ${second}, and ${third}`;
}

export function RoadmapStep({
  skillSlugs,
  experienceLevel,
  roadmapSlug,
  onSelect,
}: {
  skillSlugs: string[];
  experienceLevel: ExperienceLevel | null;
  roadmapSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const recommended = useMemo(
    () => recommendRoadmap({ skillSlugs, experienceLevel }),
    [skillSlugs, experienceLevel],
  );
  const selectedSet = useMemo(() => new Set(skillSlugs), [skillSlugs]);

  const ordered = useMemo(() => {
    if (!recommended) return [...STARTER_ROADMAPS];
    return [
      recommended,
      ...STARTER_ROADMAPS.filter((roadmap) => roadmap.slug !== recommended.slug),
    ];
  }, [recommended]);

  const selectedIndex = Math.max(
    0,
    ordered.findIndex((roadmap) => roadmap.slug === roadmapSlug),
  );
  const [index, setIndex] = useState(selectedIndex);
  const leaving = useRef(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const reveal = useTransform(x, (value) => Math.min(1, Math.abs(value) / 180));
  const underScale = useTransform(reveal, [0, 1], [0.94, 1]);
  const underY = useTransform(reveal, [0, 1], [18, 0]);
  const nextOpacity = useTransform(x, [-30, 0, 70], [1, 1, 0]);
  const prevOpacity = useTransform(x, [-70, 0, 30], [0, 0, 1]);

  const activeIndex = ordered[index] ? index : selectedIndex;
  const current = ordered[activeIndex];
  const next = ordered[activeIndex + 1];
  const previous = ordered[activeIndex - 1];
  const after = ordered[activeIndex + 2];

  async function fly(dir: 1 | -1) {
    if (leaving.current) return;
    const from = activeIndex;
    const roadmap = ordered[from + dir];
    if (!roadmap) {
      await animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
      return;
    }
    leaving.current = true;
    if (!reduceMotion) {
      await animate(x, dir * -560, {
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }).finished;
    }
    x.set(0);
    setIndex(from + dir);
    onSelect(roadmap.slug);
    leaving.current = false;
  }

  if (!current) return null;

  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Roadmap
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Pick one roadmap to start
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        Swipe the top card aside. The next roadmap is waiting underneath.
      </p>

      <div
        className="relative mt-8 h-[25.5rem] outline-none"
        role="group"
        aria-roledescription="carousel"
        aria-label="Roadmaps"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            void fly(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            void fly(-1);
          }
        }}
      >
        {after ? (
          <motion.div
            key={after.slug}
            aria-hidden
            className="absolute inset-x-0 top-0 h-[23rem]"
            style={{ opacity: nextOpacity, zIndex: 10 }}
            animate={{ scale: 0.88, y: 36 }}
          >
            <DeckCard roadmap={after} muted />
          </motion.div>
        ) : null}

        {previous ? (
          <motion.div
            key={previous.slug}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[23rem]"
            style={{ scale: underScale, y: underY, opacity: prevOpacity, zIndex: 20 }}
          >
            <DeckCard
              roadmap={previous}
              recommended={recommended?.slug === previous.slug}
              fit={fitFor(previous, selectedSet)}
            />
          </motion.div>
        ) : null}

        {next ? (
          <motion.div
            key={next.slug}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[23rem]"
            style={{ scale: underScale, y: underY, opacity: nextOpacity, zIndex: 20 }}
          >
            <DeckCard
              roadmap={next}
              recommended={recommended?.slug === next.slug}
              fit={fitFor(next, selectedSet)}
            />
          </motion.div>
        ) : null}

        <motion.div
          key={current.slug}
          className="absolute inset-x-0 top-0 z-30 h-[23rem] cursor-grab touch-pan-y active:cursor-grabbing"
          style={{ x, rotate }}
          drag={reduceMotion ? false : "x"}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            const goNext = info.offset.x < -swipeOffset || info.velocity.x < -swipeVelocity;
            const goPrev = info.offset.x > swipeOffset || info.velocity.x > swipeVelocity;
            if (goNext) void fly(1);
            else if (goPrev) void fly(-1);
            else void animate(x, 0, { type: "spring", stiffness: 420, damping: 30 });
          }}
        >
          <DeckCard
            roadmap={current}
            recommended={recommended?.slug === current.slug}
            fit={fitFor(current, selectedSet)}
          />
          <p className="sr-only" aria-live="polite">
            {current.name}, {activeIndex + 1} of {ordered.length}
          </p>
        </motion.div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => void fly(-1)}
          disabled={activeIndex === 0}
          aria-label="Previous roadmap"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand hover:text-brand disabled:opacity-40"
        >
          <Chevron direction="left" />
        </button>
        <p className="min-w-16 text-center text-sm font-medium text-ink-muted">
          {activeIndex + 1} / {ordered.length}
        </p>
        <button
          type="button"
          onClick={() => void fly(1)}
          disabled={activeIndex === ordered.length - 1}
          aria-label="Next roadmap"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand hover:text-brand disabled:opacity-40"
        >
          <Chevron direction="right" />
        </button>
      </div>
    </div>
  );
}

function fitFor(roadmap: StarterRoadmap, selected: Set<string>) {
  return matchLine(
    roadmap.skillSlugs.filter((slug) => selected.has(slug)).map((slug) => skillLabel(slug)),
  );
}

function DeckCard({
  roadmap,
  recommended = false,
  fit = null,
  muted = false,
}: {
  roadmap: StarterRoadmap;
  recommended?: boolean;
  fit?: string | null;
  muted?: boolean;
}) {
  const level = levelById(roadmap.level);

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-6 text-white shadow-[0_18px_40px_rgb(0_76_200/0.28)] sm:p-7 ${
        muted ? "brightness-75" : ""
      }`}
    >
      <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/10" aria-hidden />

      <div className="relative flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          {level?.label}
        </p>
        {recommended ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
            Suggested
          </span>
        ) : null}
      </div>

      <h2 className="relative mt-4 font-display text-3xl font-extrabold tracking-tight">{roadmap.name}</h2>
      <p className="relative mt-3 max-w-md text-sm leading-relaxed text-white/80">{roadmap.summary}</p>

      <div className="relative mt-5 flex flex-wrap items-center gap-1.5">
        {roadmap.steps.map((step, stepIndex) => (
          <span key={step.slug} className="inline-flex items-center gap-1.5">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white">
              {step.title}
            </span>
            {stepIndex < roadmap.steps.length - 1 ? (
              <span className="text-xs text-white/45" aria-hidden>
                →
              </span>
            ) : null}
          </span>
        ))}
      </div>

      <div className="relative mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-white/15 pt-4">
        <p className="text-sm font-medium text-white/85">About {roadmap.weeks} weeks</p>
        {fit ? <p className="text-sm font-medium text-white">{fit}</p> : null}
      </div>
    </article>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
      <path
        d={direction === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

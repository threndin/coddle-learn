"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const roles = [
  "Better Developer",
  "Frontend developer",
  "Backend developer",
  "Full-stack developer",
  "Cloud engineer",
  "Mobile developer",
  "DevOps engineer",
  "System designer",
] as const;

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
  const y = -row * 20 - ((index * 5) % 8);
  const r = ((index * 17) % 31) - 15;
  const drift = ((index * 13) % 140) - 70;
  const spin = ((index * 19) % 70) - 35;
  // Start just above the hero top so pills enter sooner, then settle in the same pile.
  const start = -980 - row * 36 - ((index * 11) % 6) * 28;
  return {
    label,
    left: Math.min(
      90,
      Math.max(0, (column / (columns - 1)) * 88 + (row % 2 === 0 ? 0 : 2.4) + jitter * 0.25),
    ),
    y,
    r,
    drift,
    spin,
    start,
    duration: 5.6 + ((index * 7) % 28) / 10,
    delay: ((index * 5) % 15) / 10,
    fallY: [start, y + 12, y],
    fallX: [drift, 0, 0],
    fallR: [r + spin, r, r],
  };
});

function chipDistance(
  a: { left: number; y: number },
  b: { left: number; y: number },
) {
  const dx = (a.left - b.left) * 8;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function shakeKeyframes(amp: number, seed: number) {
  const sx = seed % 2 === 0 ? 1 : -1;
  const sy = seed % 3 === 0 ? -1 : 1;
  return {
    x: [0, sx * amp * 7, -sx * amp * 6, sx * amp * 4, -sx * amp * 2.5, 0],
    y: [0, sy * amp * -5, -sy * amp * 4, sy * amp * 5, -sy * amp * 2, 0],
    rotate: [0, sx * amp * 10, -sx * amp * 8, sx * amp * 5, 0],
  };
}

const MOBILE_CHIP_COUNT = 12;

function useIsMobile() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}

function pickMobileChips() {
  const selected = Array.from({ length: MOBILE_CHIP_COUNT }, (_, index) => {
    const source = Math.floor((index * chips.length) / MOBILE_CHIP_COUNT);
    return chips[source]!;
  });

  return selected.map((chip, index, list) => {
    const left = (index / Math.max(list.length - 1, 1)) * 86 + (index % 2 === 0 ? 0 : 2);
    const y = -((index % 3) * 16) - ((index * 3) % 6);
    const start = -720 - (index % 4) * 40;
    return {
      ...chip,
      left,
      y,
      start,
      fallY: [start, y + 10, y],
      fallX: [chip.drift * 0.45, 0, 0],
      duration: 4.8 + (index % 5) * 0.3,
      delay: (index % 7) * 0.12,
    };
  });
}

const mobileChips = pickMobileChips();

function RotatingRole({ reduceMotion }: { reduceMotion: boolean | null }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % roles.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const role = roles[index]!;

  if (reduceMotion) {
    return (
      <span className="block text-center text-white">Frontend developer.</span>
    );
  }

  return (
    <span className="relative block h-[1.15em] w-full overflow-hidden" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={role}
          initial={{ y: "60%", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-55%", opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-0 text-center whitespace-nowrap text-white"
        >
          {role}.
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function HeroChips({ reduceMotion }: { reduceMotion: boolean | null }) {
  const isMobile = useIsMobile();
  const visible = isMobile ? mobileChips : chips;
  const [focus, setFocus] = useState<number | null>(null);
  const [pulse, setPulse] = useState(0);
  const [boost, setBoost] = useState(1);

  useEffect(() => {
    setFocus(null);
    setPulse(0);
    setBoost(1);
  }, [isMobile]);

  const intensities = useMemo(() => {
    if (focus === null) return visible.map(() => 0);
    return visible.map((chip, index) => {
      const dist = chipDistance(chip, visible[focus]!);
      const reach = isMobile ? 42 : 34;
      if (dist > reach) return 0;
      const falloff = 1 - dist / reach;
      const base = index === focus ? 1.15 : 0.55;
      return base * falloff * boost;
    });
  }, [focus, boost, visible, isMobile]);

  function trigger(index: number, nextBoost = 1) {
    if (reduceMotion) return;
    setFocus(index);
    setBoost(nextBoost);
    setPulse((value) => value + 1);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-5">
      {visible.map((chip, index) => (
        <ChipPill
          key={`${isMobile ? "m" : "d"}-${chip.label}`}
          chip={chip}
          index={index}
          amp={intensities[index] ?? 0}
          pulse={pulse}
          reduceMotion={reduceMotion}
          onHover={() => trigger(index, 1)}
          onActivate={() => trigger(index, 1.55)}
        />
      ))}
    </div>
  );
}

function ChipPill({
  chip,
  index,
  amp,
  pulse,
  reduceMotion,
  onHover,
  onActivate,
}: {
  chip: (typeof chips)[number];
  index: number;
  amp: number;
  pulse: number;
  reduceMotion: boolean | null;
  onHover: () => void;
  onActivate: () => void;
}) {
  const shake = amp > 0.04 ? shakeKeyframes(amp, index + pulse) : null;

  return (
    <motion.div
      className="absolute bottom-3"
      style={{ left: `${chip.left}%` }}
      initial={{ x: chip.drift, y: chip.start, rotate: chip.r + chip.spin }}
      animate={
        reduceMotion
          ? { x: 0, y: chip.y, rotate: chip.r }
          : {
              y: chip.fallY,
              x: chip.fallX,
              rotate: chip.fallR,
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
      <motion.button
        key={amp > 0 ? `shake-${pulse}` : "rest"}
        type="button"
        aria-label={chip.label}
        onMouseEnter={onHover}
        onPointerDown={onActivate}
        className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/80 bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-brand shadow-[0_10px_24px_rgb(0_26_68/0.18)]"
        initial={{ x: 0, y: 0, rotate: 0 }}
        animate={shake ?? { x: 0, y: 0, rotate: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {chip.label}
      </motion.button>
    </motion.div>
  );
}

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

      <HeroChips reduceMotion={reduceMotion} />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[95svh] max-w-4xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8 sm:py-32">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto"
        >
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[1.12] tracking-tight text-white">
            <span className="block">Your path to becoming a</span>
            <span className="mt-1 block">
              <RotatingRole reduceMotion={reduceMotion} />
            </span>
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

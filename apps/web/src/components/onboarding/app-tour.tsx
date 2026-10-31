"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useAppUser } from "@/components/app/app-user-context";
import {
  APP_TOUR_STEPS,
  APP_TOUR_VERSION,
  tourStorageKey,
  type AppTourStep,
  type TourPlacement,
} from "@/components/onboarding/app-tour-steps";

const HIGHLIGHT_PAD = 8;
const CARD_GAP = 14;
const VIEW_PAD = 16;
const CARD_WIDTH = 360;

type AppTourContextValue = {
  active: boolean;
  startTour: () => void;
};

const AppTourContext = createContext<AppTourContextValue | null>(null);

export function useAppTour() {
  const ctx = useContext(AppTourContext);
  if (!ctx) {
    throw new Error("useAppTour must be used within AppTourProvider");
  }
  return ctx;
}

export function AppTourProvider({
  children,
  ensureSidebarVisible,
}: {
  children: ReactNode;
  ensureSidebarVisible: () => () => void;
}) {
  const user = useAppUser();
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const restoreSidebar = useRef<(() => void) | null>(null);
  const launched = useRef(false);

  const finish = useCallback(() => {
    restoreSidebar.current?.();
    restoreSidebar.current = null;
    setActive(false);
    setIndex(0);
    try {
      localStorage.setItem(
        tourStorageKey(user.id),
        JSON.stringify({ version: APP_TOUR_VERSION, completedAt: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
  }, [user.id]);

  const startTour = useCallback(() => {
    launched.current = true;
    setIndex(0);
    setActive(true);
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    }
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== "/dashboard" || launched.current) return;
    try {
      const raw = localStorage.getItem(tourStorageKey(user.id));
      if (raw) {
        const parsed = JSON.parse(raw) as { version?: number };
        if (parsed.version === APP_TOUR_VERSION) return;
      }
    } catch {
      /* start anyway */
    }
    const timer = window.setTimeout(() => {
      if (!launched.current) startTour();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [pathname, startTour, user.id]);

  const step = active ? APP_TOUR_STEPS[index] ?? null : null;

  useEffect(() => {
    if (active) {
      document.documentElement.dataset.appTour = "1";
    } else {
      delete document.documentElement.dataset.appTour;
    }
    return () => {
      delete document.documentElement.dataset.appTour;
    };
  }, [active]);

  useEffect(() => {
    restoreSidebar.current?.();
    restoreSidebar.current = null;
    if (!step?.revealSidebar) return;
    restoreSidebar.current = ensureSidebarVisible();
    return () => {
      restoreSidebar.current?.();
      restoreSidebar.current = null;
    };
  }, [step, pathname, ensureSidebarVisible]);

  useEffect(() => {
    if (!step?.href) return;
    if (pathname !== step.href) {
      router.push(step.href);
    }
  }, [step, pathname, router]);

  const value = useMemo(() => ({ active, startTour }), [active, startTour]);

  return (
    <AppTourContext.Provider value={value}>
      {children}
      {step ? (
        <TourOverlay
          step={step}
          pathname={pathname}
          index={index}
          total={APP_TOUR_STEPS.length}
          onNext={() => {
            if (index >= APP_TOUR_STEPS.length - 1) {
              finish();
              return;
            }
            setIndex((current) => current + 1);
          }}
          onBack={() => setIndex((current) => Math.max(0, current - 1))}
          onSkip={finish}
        />
      ) : null}
    </AppTourContext.Provider>
  );
}

function TourOverlay({
  step,
  pathname,
  index,
  total,
  onNext,
  onBack,
  onSkip,
}: {
  step: AppTourStep;
  pathname: string;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardSize, setCardSize] = useState({ width: CARD_WIDTH, height: 200 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    let frames = 0;
    const waitingForPage = Boolean(step.href && pathname !== step.href);
    if (waitingForPage) {
      setRect(null);
    }

    function measure() {
      const el = document.querySelector<HTMLElement>(step.target);
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        const next = el.getBoundingClientRect();
        if (!cancelled) setRect(next);
        return true;
      }
      if (!cancelled) setRect(null);
      return false;
    }

    if (!waitingForPage) measure();
    const wait = window.setInterval(() => {
      frames += 1;
      if (measure() || frames > 40) {
        window.clearInterval(wait);
      }
    }, 80);

    const observer = new ResizeObserver(() => measure());
    observer.observe(document.documentElement);
    const target = document.querySelector(step.target);
    if (target) observer.observe(target);

    function onMove() {
      measure();
    }
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);

    return () => {
      cancelled = true;
      window.clearInterval(wait);
      observer.disconnect();
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [step, pathname]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    setCardSize({ width: box.width, height: box.height });
  }, [step, rect]);

  useEffect(() => {
    nextRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onBack();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [index, onBack, onNext, onSkip]);

  if (!mounted) return null;

  const last = index === total - 1;
  const cardPos = placeCard(rect, step.placement ?? "auto", cardSize.width, cardSize.height);
  const highlight = rect ? paddedRect(rect) : null;
  const titleId = "app-tour-title";

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0" />
      {highlight ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-white shadow-[0_0_0_9999px_rgb(6_24_51_/_0.55)]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-brand-navy/55" />
      )}

      <div
        ref={cardRef}
        className="absolute w-[min(22.5rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-5 shadow-xl"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
        <h2 id={titleId} className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
          >
            Skip
          </button>
          <div
            className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-surface-subtle"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-200"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
              >
                Back
              </button>
            ) : null}
            <button
              ref={nextRef}
              type="button"
              onClick={onNext}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function paddedRect(rect: DOMRect) {
  return {
    top: rect.top - HIGHLIGHT_PAD,
    left: rect.left - HIGHLIGHT_PAD,
    width: rect.width + HIGHLIGHT_PAD * 2,
    height: rect.height + HIGHLIGHT_PAD * 2,
  };
}

function placeCard(
  rect: DOMRect | null,
  preferred: TourPlacement,
  width: number,
  height: number,
) {
  const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const maxLeft = Math.max(VIEW_PAD, vw - width - VIEW_PAD);
  const maxTop = Math.max(VIEW_PAD, vh - height - VIEW_PAD);

  if (!rect) {
    return { top: Math.min(vh * 0.3, maxTop), left: Math.min((vw - width) / 2, maxLeft) };
  }

  const placement = resolvePlacement(rect, preferred, width, height, vw, vh);
  let left = rect.left;
  let top = rect.bottom + CARD_GAP;

  if (placement === "right") {
    left = rect.right + CARD_GAP;
    top = rect.top + rect.height / 2 - height / 2;
  } else if (placement === "left") {
    left = rect.left - width - CARD_GAP;
    top = rect.top + rect.height / 2 - height / 2;
  } else if (placement === "top") {
    left = rect.left;
    top = rect.top - height - CARD_GAP;
  } else {
    left = rect.left;
    top = rect.bottom + CARD_GAP;
  }

  return {
    top: clamp(top, VIEW_PAD, maxTop),
    left: clamp(left, VIEW_PAD, maxLeft),
  };
}

function resolvePlacement(
  rect: DOMRect,
  preferred: TourPlacement,
  width: number,
  height: number,
  vw: number,
  vh: number,
): Exclude<TourPlacement, "auto"> {
  if (preferred !== "auto") {
    if (preferred === "right" && rect.right + CARD_GAP + width <= vw - VIEW_PAD) return "right";
    if (preferred === "left" && rect.left - CARD_GAP - width >= VIEW_PAD) return "left";
    if (preferred === "bottom" && rect.bottom + CARD_GAP + height <= vh - VIEW_PAD) return "bottom";
    if (preferred === "top" && rect.top - CARD_GAP - height >= VIEW_PAD) return "top";
  }
  if (rect.right + CARD_GAP + width <= vw - VIEW_PAD) return "right";
  if (rect.bottom + CARD_GAP + height <= vh - VIEW_PAD) return "bottom";
  if (rect.left - CARD_GAP - width >= VIEW_PAD) return "left";
  return "top";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

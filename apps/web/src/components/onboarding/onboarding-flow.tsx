"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BIO_MAX,
  SKILL_MAX,
  SKILL_MIN,
  isExperienceLevel,
  isValidDailyGoal,
  normalizePracticeDays,
  recommendRoadmap,
  roadmapBySlug,
  type ExperienceLevel,
  type PracticeDay,
} from "@coddle/shared";
import { GoalStep } from "@/components/onboarding/goal-step";
import { ProfileStep } from "@/components/onboarding/profile-step";
import { ReviewStep } from "@/components/onboarding/review-step";
import { RoadmapStep } from "@/components/onboarding/roadmap-step";
import { SkillsStep } from "@/components/onboarding/skills-step";
import { ThemeToggle } from "@/components/theme-toggle";
import { completeOnboarding, logout, type PublicUser } from "@/lib/auth";

const STEPS = [
  { id: "profile", label: "Profile" },
  { id: "skills", label: "Skills" },
  { id: "roadmap", label: "Roadmap" },
  { id: "goal", label: "Daily goal" },
  { id: "review", label: "Review" },
] as const;

const STORAGE_KEY = "coddle-learn.onboarding";

type SkillChoice = { slug: string; name: string };

type Draft = {
  bio: string;
  experienceLevel: ExperienceLevel | null;
  skills: SkillChoice[];
  roadmapSlug: string | null;
  roadmapTouched: boolean;
  dailyGoalMinutes: number;
  practiceDays: PracticeDay[];
};

function fallbackDraft(user: PublicUser): Draft {
  const minutes =
    user.dailyGoalMinutes !== null && isValidDailyGoal(user.dailyGoalMinutes)
      ? user.dailyGoalMinutes
      : 30;
  const roadmapSlug =
    user.startingRoadmapSlug && roadmapBySlug(user.startingRoadmapSlug)
      ? user.startingRoadmapSlug
      : null;
  return {
    bio: (user.bio ?? "").slice(0, BIO_MAX),
    experienceLevel: user.experienceLevel,
    skills: user.skills.slice(0, SKILL_MAX).map((skill) => ({ slug: skill.slug, name: skill.name })),
    roadmapSlug,
    roadmapTouched: roadmapSlug !== null,
    dailyGoalMinutes: minutes,
    practiceDays: normalizePracticeDays(user.practiceDays),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStored(userId: string): { step: number; maxReached: number; draft: Draft } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.userId !== userId) return null;

    const step =
      typeof parsed.step === "number" && parsed.step >= 0 && parsed.step < STEPS.length
        ? Math.floor(parsed.step)
        : 0;
    const maxReached =
      typeof parsed.maxReached === "number"
        ? Math.min(STEPS.length - 1, Math.max(step, Math.floor(parsed.maxReached)))
        : step;
    const bio = typeof parsed.bio === "string" ? parsed.bio.slice(0, BIO_MAX) : "";
    const experienceLevel = isExperienceLevel(parsed.experienceLevel) ? parsed.experienceLevel : null;
    const skills = Array.isArray(parsed.skills)
      ? parsed.skills.flatMap((item) => {
          if (!isRecord(item) || typeof item.slug !== "string" || typeof item.name !== "string") {
            return [];
          }
          if (!item.slug || !item.name) return [];
          return [{ slug: item.slug, name: item.name }];
        }).slice(0, SKILL_MAX)
      : [];
    const roadmapSlug =
      typeof parsed.roadmapSlug === "string" && roadmapBySlug(parsed.roadmapSlug)
        ? parsed.roadmapSlug
        : null;

    return {
      step,
      maxReached,
      draft: {
        bio,
        experienceLevel,
        skills,
        roadmapSlug,
        roadmapTouched: parsed.roadmapTouched === true && roadmapSlug !== null,
        dailyGoalMinutes:
          typeof parsed.dailyGoalMinutes === "number" && isValidDailyGoal(parsed.dailyGoalMinutes)
            ? parsed.dailyGoalMinutes
            : 30,
        practiceDays: normalizePracticeDays(parsed.practiceDays),
      },
    };
  } catch {
    return null;
  }
}

function stepReady(index: number, draft: Draft): boolean {
  if (index === 0) return draft.experienceLevel !== null && draft.bio.length <= BIO_MAX;
  if (index === 1) return draft.skills.length >= SKILL_MIN && draft.skills.length <= SKILL_MAX;
  if (index === 2) return draft.roadmapSlug !== null;
  if (index === 3) return draft.practiceDays.length > 0;
  return true;
}

function readyThrough(index: number, draft: Draft): boolean {
  for (let cursor = 0; cursor <= index; cursor += 1) {
    if (!stepReady(cursor, draft)) return false;
  }
  return true;
}

function blockReason(index: number, draft: Draft): string | null {
  if (index === 0 && draft.experienceLevel === null) return "Choose the level that fits you.";
  if (index === 1 && draft.skills.length < SKILL_MIN) return "Add at least one skill.";
  if (index === 2 && draft.roadmapSlug === null) return "Pick one roadmap to start.";
  if (index === 3 && draft.practiceDays.length === 0) return "Choose at least one day.";
  return null;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M3.5 8.2 6.4 11l6.1-6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OnboardingFlow({ user }: { user: PublicUser }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => fallbackDraft(user));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStored(user.id);
    if (stored) {
      setStep(stored.step);
      setMaxReached(stored.maxReached);
      setDraft(stored.draft);
    }
    setHydrated(true);
  }, [user.id]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: user.id,
        step,
        maxReached,
        ...draft,
      }),
    );
  }, [hydrated, user.id, step, maxReached, draft]);

  useEffect(() => {
    if (!hydrated) return;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [hydrated, step, reduceMotion]);

  const current = STEPS[step] ?? STEPS[0];
  const canContinue = stepReady(step, draft);
  const reason = blockReason(step, draft);
  const last = step === STEPS.length - 1;

  function goTo(index: number) {
    if (pending || index === step || index > maxReached) return;
    if (index > step && !readyThrough(index - 1, draft)) return;
    setError(null);
    setDirection(index > step ? 1 : -1);
    setStep(index);
  }

  function goBack() {
    if (step === 0 || pending) return;
    setError(null);
    setDirection(-1);
    setStep((value) => value - 1);
  }

  function goNext() {
    if (!canContinue || pending || last) return;
    setError(null);
    setDirection(1);
    if (step === 1 && !draft.roadmapTouched) {
      const best = recommendRoadmap({
        skillSlugs: draft.skills.map((skill) => skill.slug),
        experienceLevel: draft.experienceLevel,
      });
      if (best) {
        setDraft((currentDraft) => ({ ...currentDraft, roadmapSlug: best.slug }));
      }
    }
    const next = step + 1;
    setMaxReached((value) => Math.max(value, next));
    setStep(next);
  }

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  async function onSubmit() {
    if (!draft.experienceLevel || !draft.roadmapSlug || draft.practiceDays.length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      await completeOnboarding({
        bio: draft.bio,
        experienceLevel: draft.experienceLevel,
        skills: draft.skills,
        roadmapSlug: draft.roadmapSlug,
        dailyGoalMinutes: draft.dailyGoalMinutes,
        practiceDays: draft.practiceDays,
      });
      sessionStorage.removeItem(STORAGE_KEY);
      router.replace("/dashboard");
    } catch (caught) {
      if (caught instanceof Error && caught.message === "UNAUTHENTICATED") {
        router.replace("/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not save your setup");
      setPending(false);
    }
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface text-ink-muted">
        <p className="font-mono text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col bg-surface text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex shrink-0 items-center">
            <Image
              src="/logo.png"
              alt="Coddle Learn"
              width={140}
              height={34}
              className="h-8 w-auto dark:brightness-0 dark:invert"
            />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void onLogout()}
              className="text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Onboarding" className="bg-surface">
        <div className="mx-auto w-full max-w-4xl px-5 pt-6 sm:px-8">
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5">
          <p className="text-sm text-ink-muted md:hidden">
            Step {step + 1} of {STEPS.length} · {current.label}
          </p>
          <ol className="hidden w-full items-center md:flex">
            {STEPS.map((item, index) => {
              const state = index < step ? "done" : index === step ? "current" : "upcoming";
              const locked = index > maxReached;
              const last = index === STEPS.length - 1;
              return (
                <li key={item.id} className={`flex items-center ${last ? "" : "min-w-0 flex-1"}`}>
                  <button
                    type="button"
                    aria-current={index === step ? "step" : undefined}
                    disabled={locked}
                    onClick={() => goTo(index)}
                    className="flex shrink-0 items-center gap-2 disabled:cursor-not-allowed"
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        state === "current"
                          ? "bg-brand text-white"
                          : state === "done"
                            ? "bg-brand-soft text-brand"
                            : "bg-surface text-ink-muted ring-1 ring-border"
                      }`}
                    >
                      {state === "done" ? <CheckIcon /> : index + 1}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        state === "upcoming" ? "text-ink-muted" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                  {last ? null : (
                    <span
                      aria-hidden
                      className={`mx-3 h-px min-w-3 flex-1 ${index < step ? "bg-brand" : "bg-border"}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8 sm:py-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction * -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 ? (
              <ProfileStep
                name={user.name}
                email={user.email}
                avatarUrl={user.avatarUrl}
                bio={draft.bio}
                experienceLevel={draft.experienceLevel}
                onBio={(bio) => setDraft((currentDraft) => ({ ...currentDraft, bio }))}
                onLevel={(experienceLevel) =>
                  setDraft((currentDraft) => ({ ...currentDraft, experienceLevel }))
                }
              />
            ) : null}
            {step === 1 ? (
              <SkillsStep
                skills={draft.skills}
                experienceLevel={draft.experienceLevel}
                onChange={(skills) => setDraft((currentDraft) => ({ ...currentDraft, skills }))}
              />
            ) : null}
            {step === 2 ? (
              <RoadmapStep
                skillSlugs={draft.skills.map((skill) => skill.slug)}
                experienceLevel={draft.experienceLevel}
                roadmapSlug={draft.roadmapSlug}
                onSelect={(roadmapSlug) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    roadmapSlug,
                    roadmapTouched: true,
                  }))
                }
              />
            ) : null}
            {step === 3 ? (
              <GoalStep
                minutes={draft.dailyGoalMinutes}
                days={draft.practiceDays}
                onChange={(dailyGoalMinutes) =>
                  setDraft((currentDraft) => ({ ...currentDraft, dailyGoalMinutes }))
                }
                onDaysChange={(practiceDays) =>
                  setDraft((currentDraft) => ({ ...currentDraft, practiceDays }))
                }
              />
            ) : null}
            {step === 4 ? (
              <ReviewStep
                name={user.name}
                email={user.email}
                avatarUrl={user.avatarUrl}
                bio={draft.bio}
                experienceLevel={draft.experienceLevel}
                skills={draft.skills}
                roadmapSlug={draft.roadmapSlug}
                minutes={draft.dailyGoalMinutes}
                days={draft.practiceDays}
                onEdit={goTo}
              />
            ) : null}
            {reason ? <p className="mt-6 text-sm text-ink-muted">{reason}</p> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="sticky bottom-0 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
          {error ? (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || pending}
              className={`rounded-xl px-4 py-3 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:pointer-events-none ${
                step === 0 ? "invisible" : ""
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (last) void onSubmit();
                else goNext();
              }}
              disabled={!canContinue || pending}
              className="rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : last ? "Start learning" : "Continue"}
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

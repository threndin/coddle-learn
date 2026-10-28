"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  isValidDailyGoal,
  normalizePracticeDays,
  roadmapBySlug,
  type PracticeDay,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { useAppUser, useAppUserActions } from "@/components/app/app-user-context";
import { DailyGoalPicker } from "@/components/onboarding/daily-goal-picker";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { updateSettings } from "@/lib/auth";

function initialMinutes(value: number | null): number {
  return value !== null && isValidDailyGoal(value) ? value : 30;
}

export function LearningPanel() {
  const user = useAppUser();
  const { patchUser } = useAppUserActions();
  const { pushToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState(() => initialMinutes(user.dailyGoalMinutes));
  const [days, setDays] = useState<PracticeDay[]>(() => normalizePracticeDays(user.practiceDays));
  const [error, setError] = useState<string | null>(null);

  const roadmap = user.startingRoadmapSlug ? roadmapBySlug(user.startingRoadmapSlug) : null;

  function onSave() {
    if (days.length < 1) {
      setError("Choose at least one day.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const next = await updateSettings({
          dailyGoalMinutes: minutes,
          practiceDays: days,
        });
        patchUser(next);
        setMinutes(initialMinutes(next.dailyGoalMinutes));
        setDays(normalizePracticeDays(next.practiceDays));
        pushToast("Practice schedule saved", "success");
      } catch (err) {
        const message = errorMessage(err, "Could not save your practice schedule");
        setError(message);
        pushToast(message, "error");
      }
    });
  }

  return (
    <div>
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Daily goal
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Practice schedule
        </h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
          The dashboard uses this as your daily goal. Pick a block you can repeat, and the days
          it applies to.
        </p>
        <div className="mt-8">
          <DailyGoalPicker
            minutes={minutes}
            days={days}
            onChange={setMinutes}
            onDaysChange={setDays}
          />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Starting path
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
          {roadmap ? roadmap.name : "Choose a roadmap"}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          {roadmap
            ? "This is the path you picked during setup. You can start others anytime."
            : "Pick a structured path so you always know what to learn next."}
        </p>
        <Link
          href={roadmap ? `/roadmaps/${roadmap.slug}` : "/roadmaps"}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-deep"
        >
          {roadmap ? "Open roadmap" : "Browse roadmaps"}
          <Icon name="chevronRight" className="h-3.5 w-3.5" />
        </Link>
      </section>

      <p className="mt-6 text-sm leading-relaxed text-ink-muted">
        Bio, skills, experience level, and what visitors can see are on your{" "}
        <Link href="/profile" className="font-semibold text-brand hover:text-brand-deep">
          profile
        </Link>
        .
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" role="status">
          {error ? <span className="text-rose-600">{error}</span> : null}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save schedule"}
        </button>
      </div>
    </div>
  );
}

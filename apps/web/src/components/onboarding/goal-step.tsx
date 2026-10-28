import type { PracticeDay } from "@coddle/shared";
import { DailyGoalPicker } from "@/components/onboarding/daily-goal-picker";

export function GoalStep({
  minutes,
  days,
  onChange,
  onDaysChange,
}: {
  minutes: number;
  days: PracticeDay[];
  onChange: (minutes: number) => void;
  onDaysChange: (days: PracticeDay[]) => void;
}) {
  return (
    <div>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Daily goal
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        How long will you learn each day?
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
        Pick a block you can repeat, and the days it applies to. The dashboard will use this as
        your daily goal.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-8">
        <DailyGoalPicker
          minutes={minutes}
          days={days}
          onChange={onChange}
          onDaysChange={onDaysChange}
        />
      </div>
    </div>
  );
}

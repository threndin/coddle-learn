import {
  PRACTICE_DAYS,
  formatMinutes,
  practiceDaysLabel,
  weeklyPracticeLabel,
  type PracticeDay,
} from "@coddle/shared";

const PRESETS = [15, 30, 45, 60, 90, 120] as const;

function goalNote(minutes: number): string {
  if (minutes <= 15) return "A short daily practice. Enough to keep moving.";
  if (minutes <= 30) return "A focused half hour. A pace most people can keep.";
  if (minutes <= 45) return "Room for a lesson and a short exercise.";
  if (minutes <= 60) return "A full hour of deep work, most days.";
  if (minutes <= 90) return "A serious block. Worth protecting on your calendar.";
  return "Two hours. For the days you want to go further.";
}

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
  const selected = new Set(days);

  function toggle(day: PracticeDay) {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onDaysChange(PRACTICE_DAYS.map((item) => item.id).filter((id) => next.has(id)));
  }

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
        <p className="font-display text-5xl font-extrabold tracking-tight text-ink sm:text-6xl" aria-live="polite">
          {formatMinutes(minutes)}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {practiceDaysLabel(days)} · {weeklyPracticeLabel(minutes, days.length)}
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink">{goalNote(minutes)}</p>

        <div className="mt-8 flex h-28 items-end gap-2 sm:gap-3" role="group" aria-label="Days you'll learn">
          {PRACTICE_DAYS.map((day) => {
            const on = selected.has(day.id);
            return (
              <button
                key={day.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(day.id)}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="flex h-20 w-full items-end rounded-lg bg-brand-soft">
                  <span
                    className="w-full rounded-lg bg-brand transition-[height] duration-300 ease-out"
                    style={{ height: on ? `${(minutes / 120) * 100}%` : "0%" }}
                  />
                </span>
                <span className={`text-[11px] font-medium ${on ? "text-ink" : "text-ink-muted"}`}>
                  {day.label}
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-8 block">
          <span className="sr-only">Minutes per day</span>
          <input
            type="range"
            min={15}
            max={120}
            step={15}
            value={minutes}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-valuemin={15}
            aria-valuemax={120}
            aria-valuenow={minutes}
            aria-valuetext={`${formatMinutes(minutes)} a day`}
            className="w-full accent-brand"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = preset === minutes;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(preset)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand text-white"
                    : "bg-brand-soft text-ink hover:bg-brand/10"
                }`}
              >
                {formatMinutes(preset)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

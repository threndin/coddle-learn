"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ActivityWeek = {
  week: number;
  days: number[];
  total: number;
};

export type DaySelection = {
  date: Date;
  count: number;
};

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
/** Explicit blues - Tailwind opacity on CSS-variable colors does not paint reliably. */
const LEVEL_COLORS = [
  "var(--surface-subtle)",
  "rgb(0 76 200 / 0.22)",
  "rgb(0 76 200 / 0.42)",
  "rgb(0 76 200 / 0.68)",
  "var(--brand)",
];

function levelFor(count: number, max: number) {
  if (count <= 0) return 0;
  // Cap the scale so one large day (e.g. onboarding bonus) does not wash out the rest.
  const scale = Math.min(Math.max(max, 4), 12);
  const ratio = count / scale;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

function monthLabel(weekUnix: number) {
  return new Date(weekUnix * 1000).toLocaleDateString(undefined, { month: "short" });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function ContributionGraph({
  weeks,
  busiest,
  selected,
  onSelect,
}: {
  weeks: ActivityWeek[];
  busiest: number;
  selected?: Date | null;
  onSelect?: (day: DaySelection) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ count: number; date: Date } | null>(null);
  const max = Math.max(1, busiest);

  const monthMarks = useMemo(() => {
    const marks: { index: number; label: string }[] = [];
    let last = "";
    weeks.forEach((week, index) => {
      const label = monthLabel(week.week);
      if (label !== last) {
        marks.push({ index, label });
        last = label;
      }
    });
    return marks;
  }, [weeks]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !weeks.length) return;

    // Show the most recent weeks first (right edge of the year).
    const scrollToEnd = () => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    };

    scrollToEnd();
    const raf = requestAnimationFrame(scrollToEnd);
    return () => cancelAnimationFrame(raf);
  }, [weeks]);

  if (!weeks.length) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-ink-muted">
        Points you earn will show up on this graph.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <div
        ref={scrollRef}
        className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
      >
        <div className="inline-flex w-max min-w-full flex-col gap-1.5">
          <div className="relative ml-7 h-4 text-[10px] text-ink-muted">
            {monthMarks.map((mark) => (
              <span
                key={`${mark.label}-${mark.index}`}
                className="absolute"
                style={{ left: `${mark.index * 14}px` }}
              >
                {mark.label}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <div className="sticky left-0 z-10 flex shrink-0 flex-col justify-between bg-surface py-0.5 pr-1 text-[10px] leading-3 text-ink-muted">
              {DAY_LABELS.map((label, i) => (
                <span key={i} className="h-3">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week) => (
                <div key={week.week} className="flex flex-col gap-[3px]">
                  {(week.days.length ? week.days : [0, 0, 0, 0, 0, 0, 0])
                    .slice(0, 7)
                    .map((count, day) => {
                      const date = new Date((week.week + day * 86400) * 1000);
                      const level = levelFor(count, max);
                      const isSelected = selected ? isSameDay(selected, date) : false;
                      return (
                        <button
                          key={`${week.week}-${day}`}
                          type="button"
                          aria-label={`${count} points on ${date.toDateString()}`}
                          onMouseEnter={() => setHover({ count, date })}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => onSelect?.({ date, count })}
                          style={{ backgroundColor: LEVEL_COLORS[level] }}
                          className={cn(
                            "size-3 shrink-0 rounded-[3px] transition-transform hover:scale-125 hover:ring-1 hover:ring-ink/30",
                            isSelected && "scale-125 ring-1 ring-ink",
                          )}
                        />
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-0 text-[10px] text-ink-muted sm:pl-7">
        <span className="min-w-0 tabular-nums">
          {hover
            ? `${hover.count} pt${hover.count === 1 ? "" : "s"} on ${hover.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
            : "Hover a square to see points earned that day"}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          Less
          {LEVEL_COLORS.map((color, i) => (
            <span
              key={i}
              className="size-2.5 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

/** Build a year of Sunday-start weeks from real UTC daily point totals. */
export function buildWeeksFromDailyPoints(
  days: { date: string; points: number }[],
): {
  weeks: ActivityWeek[];
  busiest: number;
  total: number;
  activeDays: number;
} {
  const byDay = new Map(days.map((day) => [day.date, day.points]));
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = end - 52 * 7 * 86400 * 1000;
  const startDate = new Date(start);
  const weekStart = start - startDate.getUTCDay() * 86400 * 1000;

  const weeks: ActivityWeek[] = [];
  let busiest = 0;
  let total = 0;
  let activeDays = 0;

  for (let w = 0; w < 53; w++) {
    const weekUnix = Math.floor(weekStart / 1000) + w * 7 * 86400;
    const counts: number[] = [];
    let weekTotal = 0;
    for (let d = 0; d < 7; d++) {
      const dayMs = (weekUnix + d * 86400) * 1000;
      if (dayMs > end) {
        counts.push(0);
        continue;
      }
      const key = new Date(dayMs).toISOString().slice(0, 10);
      const count = Math.max(0, byDay.get(key) ?? 0);
      counts.push(count);
      weekTotal += count;
      total += count;
      if (count > 0) activeDays += 1;
      if (count > busiest) busiest = count;
    }
    weeks.push({ week: weekUnix, days: counts, total: weekTotal });
  }

  return { weeks, busiest, total, activeDays };
}

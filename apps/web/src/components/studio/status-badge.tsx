import { COURSE_STATUS_META, type CourseStatus } from "@coddle/shared";

const TONES: Record<CourseStatus, { chip: string; dot: string }> = {
  draft: {
    chip: "bg-surface-subtle text-ink-muted ring-border",
    dot: "bg-ink-muted",
  },
  in_review: {
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
  },
  changes_requested: {
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    dot: "bg-rose-500",
  },
  published: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  archived: {
    chip: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: CourseStatus;
  size?: "sm" | "md";
}) {
  const tone = TONES[status];
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]",
        tone.chip,
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone.dot,
          status === "in_review" ? "animate-pulse" : "",
        ].join(" ")}
      />
      {COURSE_STATUS_META[status].label}
    </span>
  );
}

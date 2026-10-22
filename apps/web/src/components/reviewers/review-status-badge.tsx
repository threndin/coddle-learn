import { COURSE_STATUS_META, isCourseStatus } from "@coddle/shared";

const FALLBACK: Record<string, { label: string; chip: string; dot: string; pulse?: boolean }> = {
  pending: {
    label: "Pending",
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
    pulse: true,
  },
  in_review: {
    label: COURSE_STATUS_META.in_review.label,
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
    pulse: true,
  },
  changes_requested: {
    label: COURSE_STATUS_META.changes_requested.label,
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    dot: "bg-rose-500",
  },
  rejected: {
    label: "Declined",
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    dot: "bg-rose-500",
  },
  published: {
    label: COURSE_STATUS_META.published.label,
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  archived: {
    label: COURSE_STATUS_META.archived.label,
    chip: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
    dot: "bg-slate-400",
  },
};

export function ReviewStatusBadge({ status }: { status: string }) {
  const tone =
    FALLBACK[status] ??
    (isCourseStatus(status)
      ? {
          label: COURSE_STATUS_META[status].label,
          chip: "bg-surface-subtle text-ink-muted ring-border",
          dot: "bg-ink-muted",
        }
      : {
          label: status.replaceAll("_", " "),
          chip: "bg-surface-subtle text-ink-muted ring-border",
          dot: "bg-ink-muted",
        });

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tone.chip,
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone.dot,
          tone.pulse ? "animate-pulse" : "",
        ].join(" ")}
      />
      {tone.label}
    </span>
  );
}

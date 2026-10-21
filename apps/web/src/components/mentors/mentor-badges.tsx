import {
  MENTOR_AVAILABILITY_LABELS,
  MENTOR_TOPIC_LABELS,
  MENTORSHIP_APPLICATION_STATUS_LABELS,
  isMentorAvailability,
  isMentorTopic,
  isMentorshipApplicationStatus,
} from "@coddle/shared";

export function topicLabel(topic: string) {
  return isMentorTopic(topic) ? MENTOR_TOPIC_LABELS[topic] : topic.replaceAll("_", " ");
}

export function AvailabilityBadge({ availability }: { availability: string }) {
  const label = isMentorAvailability(availability)
    ? MENTOR_AVAILABILITY_LABELS[availability]
    : availability;
  const tone =
    availability === "open"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
      : availability === "limited"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        : availability === "waitlist"
          ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300"
          : "bg-surface-subtle text-ink-muted";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  const label = isMentorshipApplicationStatus(status)
    ? MENTORSHIP_APPLICATION_STATUS_LABELS[status]
    : status;
  const tone =
    status === "approved" || status === "completed"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "pending"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        : status === "declined"
          ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
          : "bg-surface-subtle text-ink-muted";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

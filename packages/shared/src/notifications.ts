export const NOTIFICATION_TYPES = [
  "welcome",
  "login",
  "role_granted",
  "onboarding_complete",
  "profile_updated",
  "follow",
  "community_comment",
  "community_reply",
  "community_reaction",
  "community_quote",
  "community_post",
  "mentor_application",
  "mentor_application_update",
  "review_decision",
  "achievement",
  "course_complete",
  "course_review",
  "course_started",
  "roadmap_complete",
  "assessment_passed",
  "project_submitted",
  "challenge_solved",
  "resource_saved",
  "tool_saved",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_GROUPS = [
  "account",
  "community",
  "learning",
  "mentorship",
  "moderation",
] as const;

export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

export const NOTIFICATION_TYPE_GROUP: Record<NotificationType, NotificationGroup> = {
  welcome: "account",
  login: "account",
  role_granted: "account",
  onboarding_complete: "account",
  profile_updated: "account",
  follow: "community",
  community_comment: "community",
  community_reply: "community",
  community_reaction: "community",
  community_quote: "community",
  community_post: "community",
  mentor_application: "mentorship",
  mentor_application_update: "mentorship",
  review_decision: "moderation",
  achievement: "learning",
  course_complete: "learning",
  course_review: "learning",
  course_started: "learning",
  roadmap_complete: "learning",
  assessment_passed: "learning",
  project_submitted: "learning",
  challenge_solved: "learning",
  resource_saved: "learning",
  tool_saved: "learning",
};

export const NOTIFICATION_GROUP_LABELS: Record<NotificationGroup, string> = {
  account: "Account",
  community: "Community",
  learning: "Learning",
  mentorship: "Mentorship",
  moderation: "Review",
};

export type NotificationPrefs = Record<NotificationGroup, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  account: true,
  community: true,
  learning: true,
  mentorship: true,
  moderation: true,
};

export const NOTIFICATION_PREF_OPTIONS: {
  id: NotificationGroup;
  label: string;
  description: string;
}[] = [
  {
    id: "account",
    label: NOTIFICATION_GROUP_LABELS.account,
    description: "Sign-in, profile updates, and role changes.",
  },
  {
    id: "community",
    label: NOTIFICATION_GROUP_LABELS.community,
    description: "Follows, comments, replies, and reactions.",
  },
  {
    id: "learning",
    label: NOTIFICATION_GROUP_LABELS.learning,
    description: "Courses, roadmaps, projects, achievements, and challenges.",
  },
  {
    id: "mentorship",
    label: NOTIFICATION_GROUP_LABELS.mentorship,
    description: "Mentor applications and program updates.",
  },
  {
    id: "moderation",
    label: NOTIFICATION_GROUP_LABELS.moderation,
    description: "Review decisions on content you submitted.",
  },
];

export function parseNotificationPrefs(
  raw: unknown,
): { ok: true; value: NotificationPrefs } | { ok: false; message: string } {
  if (!isPrefRecord(raw)) {
    return { ok: false, message: "Notification preferences could not be read." };
  }

  const value = { ...DEFAULT_NOTIFICATION_PREFS };
  for (const group of NOTIFICATION_GROUPS) {
    const flag = raw[group];
    if (flag === undefined) continue;
    if (typeof flag !== "boolean") {
      return {
        ok: false,
        message: `Preference for ${NOTIFICATION_GROUP_LABELS[group].toLowerCase()} must be on or off.`,
      };
    }
    value[group] = flag;
  }
  return { ok: true, value };
}

function isPrefRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const NOTIFICATION_FILTERS = [
  "all",
  "unread",
  "community",
  "learning",
  "mentorship",
  "account",
] as const;

export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

export const NOTIFICATION_FILTER_LABELS: Record<NotificationFilter, string> = {
  all: "All",
  unread: "Unread",
  community: "Community",
  learning: "Learning",
  mentorship: "Mentorship",
  account: "Account",
};

export const NOTIFICATION_LIMITS = {
  pageSize: 40,
  titleMax: 120,
  bodyMax: 280,
  hrefMax: 500,
} as const;

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

export function isNotificationFilter(value: unknown): value is NotificationFilter {
  return (
    typeof value === "string" &&
    (NOTIFICATION_FILTERS as readonly string[]).includes(value)
  );
}

export function notificationGroup(type: string): NotificationGroup | null {
  return isNotificationType(type) ? NOTIFICATION_TYPE_GROUP[type] : null;
}

/** Types included by a catalog filter. `null` means every type (all / unread). */
export function typesForNotificationFilter(
  filter: NotificationFilter,
): NotificationType[] | null {
  if (filter === "all" || filter === "unread") return null;
  if (filter === "account") {
    return NOTIFICATION_TYPES.filter(
      (type) =>
        NOTIFICATION_TYPE_GROUP[type] === "account" ||
        NOTIFICATION_TYPE_GROUP[type] === "moderation",
    );
  }
  return NOTIFICATION_TYPES.filter((type) => NOTIFICATION_TYPE_GROUP[type] === filter);
}

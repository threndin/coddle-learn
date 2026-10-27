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

export const USER_ROLES = ["learner", "reviewer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  learner: "Learner",
  reviewer: "Reviewer",
  admin: "Admin",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function parseUserRole(value: unknown): UserRole {
  return isUserRole(value) ? value : "learner";
}

/** Reviewers and admins can moderate the content queue. */
export function canReviewContent(role: unknown): boolean {
  return role === "reviewer" || role === "admin";
}

/** Admins can open the /admin usage dashboard. */
export function isAdminRole(role: unknown): boolean {
  return role === "admin";
}

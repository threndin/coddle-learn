import { COURSE_LIMITS } from "./course-studio.js";

export const REVIEW_KINDS = ["course", "project", "resource", "tool"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const REVIEW_KIND_LABELS: Record<ReviewKind, string> = {
  course: "Course",
  project: "Project",
  resource: "Resource",
  tool: "Tool",
};

export function isReviewKind(value: unknown): value is ReviewKind {
  return typeof value === "string" && (REVIEW_KINDS as readonly string[]).includes(value);
}

export const REVIEW_TABS = ["pending", "flagged", "decided"] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];

export const REVIEW_TAB_LABELS: Record<ReviewTab, string> = {
  pending: "Needs review",
  flagged: "Flagged",
  decided: "Recent decisions",
};

export function isReviewTab(value: unknown): value is ReviewTab {
  return typeof value === "string" && (REVIEW_TABS as readonly string[]).includes(value);
}

export const REVIEW_ACTIONS = ["approve", "decline", "flag"] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export function isReviewAction(value: unknown): value is ReviewAction {
  return typeof value === "string" && (REVIEW_ACTIONS as readonly string[]).includes(value);
}

export const REVIEW_LIMITS = {
  noteMax: COURSE_LIMITS.reviewNoteMax,
  pageSize: 20,
  queryMax: 100,
} as const;

export type ReviewPerson = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type ReviewQueueItem = {
  kind: ReviewKind;
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  href: string;
  external: boolean;
  imageUrl: string | null;
  status: string;
  flagged: boolean;
  flagNote: string | null;
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  submittedBy: ReviewPerson | null;
  skills: { slug: string; name: string }[];
  meta: {
    level?: string;
    type?: string;
    category?: string;
    estimatedHours?: number;
  };
};

export type ReviewCounts = {
  pending: number;
  flagged: number;
  decided: number;
  kinds: Record<ReviewKind, number>;
};

export type ReviewQueue = {
  items: ReviewQueueItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  counts: ReviewCounts;
  reviewMode: "auto" | "manual";
};

export type ReviewFilters = {
  tab: ReviewTab;
  kind: ReviewKind | "all";
  q: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseReviewNote(
  input: unknown,
  options: { required: boolean },
): { ok: true; note: string | null } | { ok: false; message: string } {
  const raw = isRecord(input) ? input.note : undefined;
  const note = typeof raw === "string" ? raw.trim() : "";
  if (options.required && note.length === 0) {
    return { ok: false, message: "Add a short note so the author knows what to do next." };
  }
  if (note.length > REVIEW_LIMITS.noteMax) {
    return { ok: false, message: `Keep the note under ${REVIEW_LIMITS.noteMax} characters.` };
  }
  return { ok: true, note: note.length > 0 ? note : null };
}

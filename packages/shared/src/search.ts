export const SEARCH_TYPES = [
  "course",
  "roadmap",
  "resource",
  "project",
  "developer",
  "mentor",
  "skill",
  "tool",
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  course: "Courses",
  roadmap: "Roadmaps",
  resource: "Resources",
  project: "Projects",
  developer: "Developers",
  mentor: "Mentors",
  skill: "Skills",
  tool: "Tools",
};

export const SEARCH_TYPE_SINGULAR: Record<SearchType, string> = {
  course: "Course",
  roadmap: "Roadmap",
  resource: "Resource",
  project: "Project",
  developer: "Developer",
  mentor: "Mentor",
  skill: "Skill",
  tool: "Tool",
};

export function isSearchType(value: unknown): value is SearchType {
  return typeof value === "string" && (SEARCH_TYPES as readonly string[]).includes(value);
}

export const SEARCH_LIMITS = {
  queryMax: 160,
  perTypeCandidates: 80,
  defaultLimit: 24,
  assistantHits: 10,
} as const;

/** Assistant chat sends per learner per UTC week (Monday 00:00). Catalog search is unlimited. */
export const ASSISTANT_WEEKLY_LIMIT = 10;

export type AssistantQuota = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
};

export function assistantQuotaFromUsed(used: number, weekStart: Date): AssistantQuota {
  const clamped = Math.max(0, used);
  return {
    limit: ASSISTANT_WEEKLY_LIMIT,
    used: clamped,
    remaining: Math.max(0, ASSISTANT_WEEKLY_LIMIT - clamped),
    resetsAt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Monday 00:00 UTC for the week containing `at`. */
export function utcWeekStart(at = new Date()): Date {
  const day = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const weekday = day.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  day.setUTCDate(day.getUTCDate() + offset);
  return day;
}

export type SearchSkill = {
  slug: string;
  name: string;
};

export type SearchHit = {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string;
  snippet: string;
  href: string;
  imageUrl: string | null;
  skills: SearchSkill[];
  score: number;
};

export type SearchGroup = {
  type: SearchType;
  total: number;
  hits: SearchHit[];
};

export type ParsedSearchQuery = {
  raw: string;
  text: string;
  terms: string[];
  expanded: string[];
  inferredTypes: SearchType[];
};

export type SearchResult = {
  q: string;
  type: SearchType | "all";
  parsed: ParsedSearchQuery;
  total: number;
  hits: SearchHit[];
  groups: SearchGroup[];
};

export type AssistantProvider = "gemini" | "search";

export type AssistantAskInput = {
  message: string;
  conversationId?: string | null;
};

export type AssistantThreadMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  hits: SearchHit[];
  followUps: string[];
  provider: AssistantProvider | null;
  createdAt: string;
};

export type AssistantConversationSummary = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
};

export type AssistantConversationDetail = {
  id: string;
  title: string;
  updatedAt: string;
  messages: AssistantThreadMessage[];
};

export type AssistantAskResult = {
  reply: string;
  conversationId: string | null;
  provider: AssistantProvider;
  hits: SearchHit[];
  followUps: string[];
  quota: AssistantQuota;
};

/** In-app paths or public http(s) URLs. Blocks javascript: and credentialed URLs. */
export function isSafeAssistantHref(href: string): boolean {
  const trimmed = href.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("://") &&
    !trimmed.includes("\\")
  ) {
    return trimmed.length > 0 && trimmed.length < 2048;
  }
  try {
    const url = new URL(trimmed);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export type AssistantStatus = {
  available: boolean;
  provider: AssistantProvider;
  quota: AssistantQuota;
};

export const SEARCH_SUGGESTIONS = [
  "React",
  "Become a frontend developer",
  "TypeScript course",
  "Find a mentor for system design",
  "PostgreSQL tools",
  "Beginner projects",
] as const;

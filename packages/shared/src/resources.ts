export const RESOURCE_TYPES = ["docs", "article", "video", "course", "tool"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  docs: "Docs",
  article: "Article",
  video: "Video",
  course: "Course",
  tool: "Tool",
};

export function isResourceType(value: unknown): value is ResourceType {
  return typeof value === "string" && (RESOURCE_TYPES as readonly string[]).includes(value);
}

/**
 * Lifecycle: pending -> published | rejected. `pending` only exists when
 * `RESOURCE_REVIEW_MODE=manual`; moderation tooling will move items on.
 */
export const RESOURCE_STATUSES = ["pending", "published", "rejected"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const RESOURCE_SCOPES = ["all", "saved", "mine"] as const;
export type ResourceScope = (typeof RESOURCE_SCOPES)[number];

export const RESOURCE_SORTS = ["popular", "newest", "title"] as const;
export type ResourceSort = (typeof RESOURCE_SORTS)[number];

export const RESOURCE_LIMITS = {
  titleMin: 4,
  titleMax: 120,
  descriptionMin: 20,
  descriptionMax: 400,
  urlMax: 2048,
  skillMax: 4,
  queryMax: 100,
  pageSize: 24,
  /** Submissions per learner per rolling 24 hours. */
  dailySubmissions: 10,
} as const;

/**
 * Canonical form used for duplicate detection. Returns null for anything that
 * is not a public http(s) URL. Tracking params are dropped; fragments are kept
 * because docs often deep-link to a section.
 */
export function normalizeResourceUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > RESOURCE_LIMITS.urlMax) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return null;
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  return url.toString();
}

export function resourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

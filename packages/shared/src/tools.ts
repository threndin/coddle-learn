import { slugify, uniqueSlug } from "./course-studio.js";
import { normalizeResourceUrl } from "./resources.js";

export const TOOL_CATEGORIES = [
  "workspace",
  "editor",
  "terminal",
  "productivity",
  "collaboration",
  "design",
  "api",
  "database",
  "devops",
  "hosting",
  "backend",
  "testing",
  "monitoring",
  "cli",
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  workspace: "Workspace",
  editor: "Editor",
  terminal: "Terminal",
  productivity: "Productivity",
  collaboration: "Collaboration",
  design: "Design",
  api: "API",
  database: "Database",
  devops: "DevOps",
  hosting: "Hosting",
  backend: "Backend",
  testing: "Testing",
  monitoring: "Monitoring",
  cli: "CLI",
};

export function isToolCategory(value: unknown): value is ToolCategory {
  return typeof value === "string" && (TOOL_CATEGORIES as readonly string[]).includes(value);
}

export const TOOL_PRICING = ["free", "freemium", "paid"] as const;
export type ToolPricing = (typeof TOOL_PRICING)[number];

export const TOOL_PRICING_LABELS: Record<ToolPricing, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
};

export function isToolPricing(value: unknown): value is ToolPricing {
  return typeof value === "string" && (TOOL_PRICING as readonly string[]).includes(value);
}

export const TOOL_PLATFORMS = ["web", "mac", "windows", "linux", "cli", "ios", "android"] as const;
export type ToolPlatform = (typeof TOOL_PLATFORMS)[number];

export const TOOL_PLATFORM_LABELS: Record<ToolPlatform, string> = {
  web: "Web",
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
  cli: "CLI",
  ios: "iOS",
  android: "Android",
};

export function isToolPlatform(value: unknown): value is ToolPlatform {
  return typeof value === "string" && (TOOL_PLATFORMS as readonly string[]).includes(value);
}

/**
 * Lifecycle: pending -> published | rejected. `pending` only exists when
 * `TOOL_REVIEW_MODE=manual`; moderation tooling will move items on.
 */
export const TOOL_STATUSES = ["pending", "published", "rejected"] as const;
export type ToolStatus = (typeof TOOL_STATUSES)[number];

export const TOOL_SCOPES = ["all", "saved", "mine"] as const;
export type ToolScope = (typeof TOOL_SCOPES)[number];

export const TOOL_SORTS = ["featured", "popular", "newest", "title"] as const;
export type ToolSort = (typeof TOOL_SORTS)[number];

export const TOOL_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export const TOOL_LIMITS = {
  titleMin: 2,
  titleMax: 80,
  summaryMin: 24,
  summaryMax: 400,
  urlMax: 2048,
  imageUrlMax: 2048,
  imageBytesMax: 3 * 1024 * 1024,
  skillMax: 4,
  platformMax: 6,
  queryMax: 100,
  pageSize: 24,
  dailySubmissions: 10,
} as const;

const RESERVED_TOOL_SLUGS = new Set(["images", "new", "mine"]);

export function toolSlugFromTitle(title: string, taken: Iterable<string>): string {
  const base = slugify(title, "tool");
  const safe = RESERVED_TOOL_SLUGS.has(base) ? `${base}-app` : base;
  return uniqueSlug(safe, taken);
}

/**
 * Public image URLs only. Seeded covers live under `/tools/…` and skip this
 * helper. Data URIs are rejected so the catalog never stores a multi-MB payload.
 */
export function normalizeToolImageUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > TOOL_LIMITS.imageUrlMax) return null;
  if (trimmed.startsWith("data:")) return null;
  return normalizeResourceUrl(trimmed);
}

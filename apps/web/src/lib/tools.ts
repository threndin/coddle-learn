import type {
  ToolCategory,
  ToolPricing,
  ToolScope,
  ToolSort,
  ToolStatus,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type ToolItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  url: string;
  host: string;
  imageUrl: string;
  category: ToolCategory | string;
  pricing: ToolPricing | string;
  platforms: string[];
  status: ToolStatus | string;
  reviewNote: string | null;
  skills: { slug: string; name: string }[];
  bookmarked: boolean;
  bookmarkCount: number;
  submittedBy: {
    id: string;
    username?: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  isOwner: boolean;
  createdAt: string;
  publishedAt: string | null;
};

export type ToolCatalog = {
  tools: ToolItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  categoryCounts: Record<ToolCategory, number>;
  skills: { slug: string; name: string; category: string }[];
  counts: { saved: number; mine: number };
  uploadsEnabled: boolean;
};

export type ToolFilters = {
  q: string;
  category: ToolCategory | null;
  pricing: ToolPricing | null;
  skill: string | null;
  scope: ToolScope;
  sort: ToolSort;
};

export const DEFAULT_TOOL_FILTERS: ToolFilters = {
  q: "",
  category: null,
  pricing: null,
  skill: null,
  scope: "all",
  sort: "featured",
};

export function toolQueryString(filters: ToolFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.pricing) params.set("pricing", filters.pricing);
  if (filters.skill) params.set("skill", filters.skill);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function fetchTools(filters: ToolFilters, page = 1, signal?: AbortSignal) {
  const query = toolQueryString(filters, page);
  return apiRequest<ToolCatalog>(`/tools${query ? `?${query}` : ""}`, { signal });
}

export function fetchTool(slug: string, signal?: AbortSignal) {
  return apiRequest<{ tool: ToolItem }>(`/tools/${encodeURIComponent(slug)}`, { signal });
}

export type ToolSubmission = {
  url: string;
  title: string;
  summary: string;
  imageUrl: string;
  category: ToolCategory;
  pricing: ToolPricing;
  platforms: string[];
  skillSlugs: string[];
};

export function submitTool(input: ToolSubmission) {
  return apiRequest<{ tool: ToolItem }>("/tools", { method: "POST", json: input });
}

export function uploadToolImage(file: File) {
  return apiRequest<{ url: string }>("/tools/images", {
    method: "POST",
    body: file,
    contentType: file.type,
  });
}

export function deleteTool(id: string) {
  return apiRequest<{ deleted: boolean }>(`/tools/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function setToolBookmark(id: string, saved: boolean) {
  return apiRequest<{ bookmarked: boolean; bookmarkCount: number }>(
    `/tools/${encodeURIComponent(id)}/bookmark`,
    { method: saved ? "PUT" : "DELETE" },
  );
}

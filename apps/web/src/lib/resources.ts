import type {
  ExperienceLevel,
  ResourceScope,
  ResourceSort,
  ResourceStatus,
  ResourceType,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type ResourceItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  host: string;
  type: ResourceType | string;
  level: ExperienceLevel | string;
  status: ResourceStatus | string;
  reviewNote: string | null;
  skills: { slug: string; name: string }[];
  bookmarked: boolean;
  bookmarkCount: number;
  submittedBy: { id: string; name: string; avatarUrl: string | null } | null;
  isOwner: boolean;
  usedIn: {
    roadmapSlug: string;
    roadmapName: string;
    stepSlug: string;
    stepTitle: string;
  }[];
  createdAt: string;
  publishedAt: string | null;
};

export type ResourceCatalog = {
  resources: ResourceItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  typeCounts: Record<ResourceType, number>;
  skills: { slug: string; name: string; category: string }[];
  counts: { saved: number; mine: number };
};

export type ResourceFilters = {
  q: string;
  type: ResourceType | null;
  level: ExperienceLevel | null;
  skill: string | null;
  scope: ResourceScope;
  sort: ResourceSort;
};

export const DEFAULT_RESOURCE_FILTERS: ResourceFilters = {
  q: "",
  type: null,
  level: null,
  skill: null,
  scope: "all",
  sort: "popular",
};

/** Only non-default values, so shared URLs stay short. */
export function resourceQueryString(filters: ResourceFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.level) params.set("level", filters.level);
  if (filters.skill) params.set("skill", filters.skill);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  if (filters.sort !== "popular") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function fetchResources(filters: ResourceFilters, page = 1, signal?: AbortSignal) {
  const query = resourceQueryString(filters, page);
  return apiRequest<ResourceCatalog>(`/resources${query ? `?${query}` : ""}`, { signal });
}

export type ResourceSubmission = {
  url: string;
  title: string;
  description: string;
  type: ResourceType;
  level: ExperienceLevel;
  skillSlugs: string[];
};

export function submitResource(input: ResourceSubmission) {
  return apiRequest<{ resource: ResourceItem }>("/resources", { method: "POST", json: input });
}

export function deleteResource(id: string) {
  return apiRequest<{ deleted: boolean }>(`/resources/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function setResourceBookmark(id: string, saved: boolean) {
  return apiRequest<{ bookmarked: boolean; bookmarkCount: number }>(
    `/resources/${encodeURIComponent(id)}/bookmark`,
    { method: saved ? "PUT" : "DELETE" },
  );
}

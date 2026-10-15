import type {
  CommunityKind,
  CommunityReactionEmoji,
  CommunityScope,
  CommunityTopic,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type CommunityPostItem = {
  id: string;
  kind: CommunityKind | string;
  topic: CommunityTopic | string;
  relatedSlug: string | null;
  relatedTitle: string | null;
  relatedHref: string | null;
  title: string;
  body: string;
  imageUrls: string[];
  impressionCount: number;
  commentCount: number;
  reactionCounts: Record<CommunityReactionEmoji, number>;
  myReaction: CommunityReactionEmoji | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
  isMine: boolean;
};

export type CommunityCatalog = {
  posts: CommunityPostItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  kindCounts: Record<CommunityKind, number>;
  counts: { mine: number };
  filters: {
    q: string;
    kind: CommunityKind | null;
    topic: CommunityTopic | null;
    scope: CommunityScope;
  };
};

export type CommunityFilters = {
  kind: CommunityKind | null;
  topic: CommunityTopic | null;
  scope: CommunityScope;
};

export type RelatedOption = {
  slug: string;
  title: string;
  subtitle: string | null;
};

export type SpotlightLearner = {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  experienceLevel: string | null;
  postCount: number;
  projectCount: number;
  note: string;
};

export const DEFAULT_COMMUNITY_FILTERS: CommunityFilters = {
  kind: null,
  topic: null,
  scope: "all",
};

/** Only non-default values, so shared URLs stay short. */
export function communityQueryString(filters: CommunityFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function fetchCommunity(filters: CommunityFilters, page = 1, signal?: AbortSignal) {
  const query = communityQueryString(filters, page);
  return apiRequest<CommunityCatalog>(`/community${query ? `?${query}` : ""}`, { signal });
}

export function fetchRelatedOptions(
  topic: Exclude<CommunityTopic, "general">,
  q = "",
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ topic });
  if (q.trim()) params.set("q", q.trim());
  return apiRequest<{ options: RelatedOption[] }>(`/community/related?${params}`, { signal });
}

export function fetchSpotlightLearners(signal?: AbortSignal) {
  return apiRequest<{ learners: SpotlightLearner[] }>("/community/spotlight", { signal });
}

export function createCommunityPost(input: {
  kind: CommunityKind;
  topic: CommunityTopic;
  relatedSlug?: string;
  title: string;
  body: string;
  images?: File[];
}) {
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("topic", input.topic);
  form.append("title", input.title);
  form.append("body", input.body);
  if (input.relatedSlug) form.append("relatedSlug", input.relatedSlug);
  for (const image of input.images ?? []) {
    form.append("images", image);
  }
  return apiRequest<{ post: CommunityPostItem }>("/community", {
    method: "POST",
    body: form,
  });
}

export function deleteCommunityPost(postId: string) {
  return apiRequest<{ ok: true }>(`/community/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
}

export function recordCommunityImpression(postId: string) {
  return apiRequest<{ impressionCount: number; recorded: boolean }>(
    `/community/${encodeURIComponent(postId)}/impressions`,
    { method: "POST" },
  );
}

export function setCommunityReaction(postId: string, emoji: CommunityReactionEmoji) {
  return apiRequest<{
    reactionCounts: Record<CommunityReactionEmoji, number>;
    myReaction: CommunityReactionEmoji | null;
  }>(`/community/${encodeURIComponent(postId)}/reactions`, {
    method: "PUT",
    json: { emoji },
  });
}

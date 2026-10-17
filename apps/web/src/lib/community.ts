import type {
  CommunityKind,
  CommunityPeopleSort,
  CommunityReactionEmoji,
  CommunityReportReason,
  CommunityScope,
  CommunitySearchType,
  CommunitySearchWhen,
  CommunitySort,
  CommunityTopic,
  ExperienceLevel,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type CommunityAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type QuotedPostSummary = {
  id: string;
  slug: string;
  kind: CommunityKind | string;
  title: string;
  body: string;
  imageUrls: string[];
  createdAt: string;
  isDeleted: boolean;
  author: CommunityAuthor;
};

export type CommunityPostItem = {
  id: string;
  slug: string;
  kind: CommunityKind | string;
  topic: CommunityTopic | string;
  relatedSlug: string | null;
  relatedTitle: string | null;
  relatedHref: string | null;
  title: string;
  body: string;
  imageUrls: string[];
  quotePostId: string | null;
  quotedPost: QuotedPostSummary | null;
  impressionCount: number;
  commentCount: number;
  reactionCounts: Record<CommunityReactionEmoji, number>;
  myReaction: CommunityReactionEmoji | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isEdited: boolean;
  author: CommunityAuthor;
  isMine: boolean;
};

/** Canonical public path for a community post. */
export function communityPostPath(post: { slug: string }) {
  return `/community/${encodeURIComponent(post.slug)}`;
}

/** Remember last search URL so post detail can return with filters intact. */
export const COMMUNITY_SEARCH_RETURN_KEY = "coddle:community-search-return";

export function rememberCommunitySearchReturn(href: string) {
  try {
    sessionStorage.setItem(COMMUNITY_SEARCH_RETURN_KEY, href);
  } catch {
    // Private mode / blocked storage — ignore.
  }
}

export function clearCommunitySearchReturn() {
  try {
    sessionStorage.removeItem(COMMUNITY_SEARCH_RETURN_KEY);
  } catch {
    // ignore
  }
}

export function peekCommunitySearchReturn(): string | null {
  try {
    const value = sessionStorage.getItem(COMMUNITY_SEARCH_RETURN_KEY);
    return value?.startsWith("/community/search") ? value : null;
  } catch {
    return null;
  }
}

/** Reactions list for a community post. */
export function communityPostReactionsPath(post: { slug: string }) {
  return `${communityPostPath(post)}/reactions`;
}

export type CommunityPostReactionItem = {
  id: string;
  emoji: CommunityReactionEmoji;
  createdAt: string;
  user: CommunityAuthor;
};

export type CommunityPostQuoteItem = {
  id: string;
  slug: string;
  title: string;
  body: string;
  createdAt: string;
  author: CommunityAuthor;
};

export type CommunityPostReactions = {
  post: { id: string; slug: string; title: string };
  reactions: CommunityPostReactionItem[];
  reactionCounts: Record<CommunityReactionEmoji, number>;
  total: number;
  quotes: CommunityPostQuoteItem[];
  quoteCount: number;
};

export type CommunityCommentItem = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isEdited: boolean;
  author: CommunityAuthor;
  isMine: boolean;
  reactionCounts: Record<CommunityReactionEmoji, number>;
  myReaction: CommunityReactionEmoji | null;
  replies: CommunityCommentItem[];
};

export type CommunityPostDetail = {
  post: CommunityPostItem;
  comments: CommunityCommentItem[];
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

export type CommunitySearchPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  points: number;
  experienceLevel: string | null;
  postCount: number;
  projectCount: number;
  note: string;
};

export type CommunitySearchFilters = {
  q: string;
  type: CommunitySearchType;
  kind: CommunityKind | null;
  topic: CommunityTopic | null;
  sort: CommunitySort;
  peopleSort: CommunityPeopleSort;
  when: CommunitySearchWhen;
  experienceLevel: ExperienceLevel | null;
};

export const DEFAULT_COMMUNITY_SEARCH_FILTERS: CommunitySearchFilters = {
  q: "",
  type: "all",
  kind: null,
  topic: null,
  sort: "newest",
  peopleSort: "posts",
  when: "any",
  experienceLevel: null,
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

export function communitySearchQueryString(
  filters: CommunitySearchFilters,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.sort !== (filters.q.trim() ? "relevant" : "newest")) {
    params.set("sort", filters.sort);
  }
  if (filters.peopleSort !== (filters.q.trim() ? "relevant" : "posts")) {
    params.set("peopleSort", filters.peopleSort);
  }
  if (filters.when !== "any") params.set("when", filters.when);
  if (filters.experienceLevel) params.set("experienceLevel", filters.experienceLevel);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function fetchCommunity(filters: CommunityFilters, page = 1, signal?: AbortSignal) {
  const query = communityQueryString(filters, page);
  return apiRequest<CommunityCatalog>(`/community${query ? `?${query}` : ""}`, { signal });
}

export type CommunitySearchResponse = {
  posts: CommunityPostItem[];
  people: CommunitySearchPerson[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  peopleTotal: number;
  peopleHasMore: boolean;
  peoplePageSize: number;
  filters: CommunitySearchFilters;
};

export function fetchCommunitySearch(
  filters: CommunitySearchFilters,
  page = 1,
  signal?: AbortSignal,
) {
  const query = communitySearchQueryString(filters, page);
  return apiRequest<CommunitySearchResponse>(
    `/community/search${query ? `?${query}` : ""}`,
    { signal },
  );
}

export function fetchCommunityPost(postId: string, signal?: AbortSignal) {
  return apiRequest<CommunityPostDetail>(`/community/${encodeURIComponent(postId)}`, {
    signal,
  });
}

export function fetchCommunityPostReactions(postRef: string, signal?: AbortSignal) {
  return apiRequest<CommunityPostReactions>(
    `/community/${encodeURIComponent(postRef)}/reactions`,
    { signal },
  );
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
  quotePostId?: string;
}) {
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("topic", input.topic);
  form.append("title", input.title);
  form.append("body", input.body);
  if (input.relatedSlug) form.append("relatedSlug", input.relatedSlug);
  if (input.quotePostId) form.append("quotePostId", input.quotePostId);
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

export function updateCommunityPost(
  postId: string,
  input: {
    title: string;
    body: string;
    topic: CommunityTopic;
    relatedSlug?: string | null;
  },
) {
  return apiRequest<{ post: CommunityPostItem }>(
    `/community/${encodeURIComponent(postId)}`,
    { method: "PATCH", json: input },
  );
}

export function reportCommunityPost(
  postId: string,
  input: { reason: CommunityReportReason; details?: string },
) {
  return apiRequest<{ ok: true }>(`/community/${encodeURIComponent(postId)}/reports`, {
    method: "POST",
    json: input,
  });
}

export function reportCommunityComment(
  commentId: string,
  input: { reason: CommunityReportReason; details?: string },
) {
  return apiRequest<{ ok: true }>(
    `/community/comments/${encodeURIComponent(commentId)}/reports`,
    { method: "POST", json: input },
  );
}

export function createCommunityComment(
  postId: string,
  input: { body: string; parentId?: string },
) {
  return apiRequest<{ comment: CommunityCommentItem; commentCount: number }>(
    `/community/${encodeURIComponent(postId)}/comments`,
    { method: "POST", json: input },
  );
}

export function updateCommunityComment(commentId: string, input: { body: string }) {
  return apiRequest<{ comment: CommunityCommentItem }>(
    `/community/comments/${encodeURIComponent(commentId)}`,
    { method: "PATCH", json: input },
  );
}

export function deleteCommunityComment(commentId: string) {
  return apiRequest<{ ok: true; commentCount: number }>(
    `/community/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" },
  );
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

export function setCommunityCommentReaction(commentId: string, emoji: CommunityReactionEmoji) {
  return apiRequest<{
    reactionCounts: Record<CommunityReactionEmoji, number>;
    myReaction: CommunityReactionEmoji | null;
  }>(`/community/comments/${encodeURIComponent(commentId)}/reactions`, {
    method: "PUT",
    json: { emoji },
  });
}

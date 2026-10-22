import type {
  ReviewAction,
  ReviewFilters,
  ReviewKind,
  ReviewQueue,
  ReviewQueueItem,
  ReviewTab,
} from "@coddle/shared";
import { isReviewKind, isReviewTab } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type { ReviewQueue, ReviewQueueItem, ReviewFilters, ReviewKind, ReviewTab, ReviewAction };

export const DEFAULT_REVIEW_FILTERS: ReviewFilters = {
  tab: "pending",
  kind: "all",
  q: "",
};

export function reviewFiltersFrom(query: Record<string, string | string[] | undefined>): ReviewFilters {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  const tab = first(query.tab);
  const kind = first(query.kind);
  return {
    tab: isReviewTab(tab) ? tab : DEFAULT_REVIEW_FILTERS.tab,
    kind: kind === "all" || isReviewKind(kind) ? (kind as ReviewFilters["kind"]) : "all",
    q: first(query.q),
  };
}

export function reviewQueryString(filters: ReviewFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.tab !== "pending") params.set("tab", filters.tab);
  if (filters.kind !== "all") params.set("kind", filters.kind);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function fetchReviewQueue(
  filters: ReviewFilters,
  page = 1,
  signal?: AbortSignal,
) {
  const query = reviewQueryString(filters, page);
  return apiRequest<ReviewQueue>(`/reviewers/queue${query ? `?${query}` : ""}`, { signal });
}

export function decideReviewItem(
  kind: ReviewKind,
  id: string,
  action: ReviewAction,
  note: string,
) {
  return apiRequest<{ item: ReviewQueueItem }>(`/reviewers/${kind}/${id}/${action}`, {
    method: "POST",
    json: { note },
  });
}

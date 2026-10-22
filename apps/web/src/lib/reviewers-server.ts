import type { ReviewFilters, ReviewQueue } from "@coddle/shared";
import { reviewQueryString } from "@/lib/reviewers";
import { serverApiFetch } from "@/lib/server-api";

export async function loadReviewQueue(
  filters: ReviewFilters,
): Promise<ReviewQueue | "forbidden" | null> {
  try {
    const query = reviewQueryString(filters);
    const res = await serverApiFetch(`/reviewers/queue${query ? `?${query}` : ""}`);
    if (res.status === 403) return "forbidden";
    if (!res.ok) return null;
    const body = (await res.json()) as { data: ReviewQueue };
    return body.data;
  } catch {
    return null;
  }
}

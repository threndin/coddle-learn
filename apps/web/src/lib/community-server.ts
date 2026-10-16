import {
  communityQueryString,
  type CommunityCatalog,
  type CommunityFilters,
  type CommunityPostDetail,
  type CommunityPostReactions,
  type SpotlightLearner,
} from "@/lib/community";
import { serverApiFetch } from "@/lib/server-api";

export async function loadCommunityCatalog(
  filters: CommunityFilters,
): Promise<CommunityCatalog | null> {
  try {
    const query = communityQueryString(filters);
    const res = await serverApiFetch(`/community${query ? `?${query}` : ""}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: CommunityCatalog };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadCommunityPost(postId: string): Promise<CommunityPostDetail | null> {
  try {
    const res = await serverApiFetch(`/community/${encodeURIComponent(postId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: CommunityPostDetail };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadCommunityPostReactions(
  postRef: string,
): Promise<CommunityPostReactions | null> {
  try {
    const res = await serverApiFetch(
      `/community/${encodeURIComponent(postRef)}/reactions`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data: CommunityPostReactions };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadSpotlightLearners(): Promise<SpotlightLearner[]> {
  try {
    const res = await serverApiFetch("/community/spotlight");
    if (!res.ok) return [];
    const body = (await res.json()) as { data: { learners: SpotlightLearner[] } };
    return body.data.learners;
  } catch {
    return [];
  }
}

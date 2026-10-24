import type { ChallengeCatalog, ChallengeDetail } from "@/lib/challenges";
import { serverApiFetch } from "@/lib/server-api";

export async function loadChallengeCatalog(): Promise<ChallengeCatalog | null> {
  try {
    const res = await serverApiFetch("/challenges");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: ChallengeCatalog };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadChallenge(slug: string): Promise<ChallengeDetail | null> {
  try {
    const res = await serverApiFetch(`/challenges/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: ChallengeDetail };
    return body.data;
  } catch {
    return null;
  }
}

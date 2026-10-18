import { serverApiFetch } from "@/lib/server-api";
import type { PublicProfilePayload } from "@/lib/profiles";

export async function loadPublicProfile(
  username: string,
): Promise<PublicProfilePayload | null> {
  try {
    const res = await serverApiFetch(`/profiles/${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: PublicProfilePayload };
    return body.data;
  } catch {
    return null;
  }
}

import type { SkillDetail, SkillGraph } from "@/lib/skills";
import { serverApiFetch } from "@/lib/server-api";

export async function loadSkillGraph(): Promise<SkillGraph | null> {
  try {
    const res = await serverApiFetch("/skills");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: SkillGraph };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadSkill(slug: string): Promise<SkillDetail | null> {
  try {
    const res = await serverApiFetch(`/skills/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: SkillDetail };
    return body.data;
  } catch {
    return null;
  }
}

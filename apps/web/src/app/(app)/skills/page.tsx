import { SkillsCatalog } from "@/components/skills/skills-catalog";
import { loadSkillGraph } from "@/lib/skills-server";

export default async function SkillsPage() {
  const graph = await loadSkillGraph();
  return <SkillsCatalog initial={graph} />;
}

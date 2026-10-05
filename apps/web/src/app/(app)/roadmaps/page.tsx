import { RoadmapsCatalog } from "@/components/roadmaps/roadmaps-catalog";
import { loadRoadmapCatalog } from "@/lib/roadmaps-server";

export default async function RoadmapsPage() {
  const roadmaps = await loadRoadmapCatalog();
  return <RoadmapsCatalog initialRoadmaps={roadmaps} />;
}

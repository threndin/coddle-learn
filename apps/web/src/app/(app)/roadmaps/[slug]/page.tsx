import { RoadmapDetailView } from "@/components/roadmaps/roadmap-detail";
import { loadRoadmapDetail } from "@/lib/roadmaps-server";

export default async function RoadmapDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const initialStepSlug =
    typeof query.step === "string" && query.step.length > 0 ? query.step : null;
  const roadmap = await loadRoadmapDetail(slug);

  return (
    <RoadmapDetailView
      slug={slug}
      initialStepSlug={initialStepSlug}
      initialRoadmap={roadmap}
    />
  );
}

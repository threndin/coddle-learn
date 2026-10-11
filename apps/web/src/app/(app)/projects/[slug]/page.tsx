import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/projects/project-detail";
import { loadProjectDetail } from "@/lib/projects-server";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await loadProjectDetail(slug);
  if (!project) notFound();
  return <ProjectDetailView initial={project} />;
}

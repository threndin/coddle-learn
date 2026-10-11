import { notFound } from "next/navigation";
import { ProjectEditor } from "@/components/studio/project-editor";
import {
  loadStudioProject,
  loadStudioProjectOptions,
} from "@/lib/studio-projects-server";

export default async function StudioProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, options] = await Promise.all([
    loadStudioProject(projectId),
    loadStudioProjectOptions(),
  ]);
  if (!project) notFound();
  return <ProjectEditor initial={project} options={options} />;
}

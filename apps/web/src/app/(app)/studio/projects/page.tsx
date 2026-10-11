import { StudioProjects } from "@/components/studio/studio-projects";
import { loadStudioProjects } from "@/lib/studio-projects-server";

export default async function StudioProjectsPage() {
  const initial = await loadStudioProjects();
  return <StudioProjects initial={initial} />;
}

import { ProjectsCatalog } from "@/components/projects/projects-catalog";
import { loadProjectCatalog } from "@/lib/projects-server";

export default async function ProjectsPage() {
  const projects = await loadProjectCatalog();
  return <ProjectsCatalog initialProjects={projects} />;
}

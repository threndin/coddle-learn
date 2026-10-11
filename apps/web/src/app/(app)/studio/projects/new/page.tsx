import { NewProjectForm } from "@/components/studio/new-project-form";
import { loadStudioProjectOptions } from "@/lib/studio-projects-server";

export default async function NewStudioProjectPage() {
  const options = await loadStudioProjectOptions();
  return <NewProjectForm options={options} />;
}

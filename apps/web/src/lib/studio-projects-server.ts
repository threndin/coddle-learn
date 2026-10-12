import type {
  StudioProject,
  StudioProjectList,
  StudioProjectOptions,
} from "@/lib/studio-projects";
import { serverApiFetch } from "@/lib/server-api";

export async function loadStudioProjects(): Promise<StudioProjectList | null> {
  try {
    const res = await serverApiFetch("/studio/projects");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: StudioProjectList };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadStudioProject(projectId: string): Promise<StudioProject | null> {
  try {
    const res = await serverApiFetch(`/studio/projects/${encodeURIComponent(projectId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { project: StudioProject } };
    return body.data.project;
  } catch {
    return null;
  }
}

export async function loadStudioProjectOptions(): Promise<StudioProjectOptions | null> {
  try {
    const res = await serverApiFetch("/studio/projects/options");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: StudioProjectOptions };
    return body.data;
  } catch {
    return null;
  }
}

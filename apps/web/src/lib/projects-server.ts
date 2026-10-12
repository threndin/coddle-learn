import type {
  ProjectActivityItem,
  ProjectCatalogItem,
  ProjectDetail,
} from "@/lib/projects";
import { serverApiFetch } from "@/lib/server-api";

export async function loadProjectCatalog(): Promise<ProjectCatalogItem[] | null> {
  try {
    const res = await serverApiFetch("/projects");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { projects: ProjectCatalogItem[] } };
    return body.data.projects;
  } catch {
    return null;
  }
}

export async function loadProjectDetail(slug: string): Promise<ProjectDetail | null> {
  try {
    const res = await serverApiFetch(`/projects/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { project: ProjectDetail } };
    return body.data.project;
  } catch {
    return null;
  }
}

export async function loadMyProjectActivity(): Promise<ProjectActivityItem[] | null> {
  try {
    const res = await serverApiFetch("/projects/mine");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { submissions: ProjectActivityItem[] } };
    return body.data.submissions;
  } catch {
    return null;
  }
}

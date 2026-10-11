import { cookies } from "next/headers";
import type {
  ProjectActivityItem,
  ProjectCatalogItem,
  ProjectDetail,
} from "@/lib/projects";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function apiFetch(path: string) {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return fetch(`${apiUrl}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
}

export async function loadProjectCatalog(): Promise<ProjectCatalogItem[] | null> {
  try {
    const res = await apiFetch("/projects");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { projects: ProjectCatalogItem[] } };
    return body.data.projects;
  } catch {
    return null;
  }
}

export async function loadProjectDetail(slug: string): Promise<ProjectDetail | null> {
  try {
    const res = await apiFetch(`/projects/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { project: ProjectDetail } };
    return body.data.project;
  } catch {
    return null;
  }
}

export async function loadMyProjectActivity(): Promise<ProjectActivityItem[] | null> {
  try {
    const res = await apiFetch("/projects/mine");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { submissions: ProjectActivityItem[] } };
    return body.data.submissions;
  } catch {
    return null;
  }
}

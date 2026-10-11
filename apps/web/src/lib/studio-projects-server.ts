import { cookies } from "next/headers";
import type {
  StudioProject,
  StudioProjectList,
  StudioProjectOptions,
} from "@/lib/studio-projects";

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

export async function loadStudioProjects(): Promise<StudioProjectList | null> {
  try {
    const res = await apiFetch("/studio/projects");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: StudioProjectList };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadStudioProject(projectId: string): Promise<StudioProject | null> {
  try {
    const res = await apiFetch(`/studio/projects/${encodeURIComponent(projectId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { project: StudioProject } };
    return body.data.project;
  } catch {
    return null;
  }
}

export async function loadStudioProjectOptions(): Promise<StudioProjectOptions | null> {
  try {
    const res = await apiFetch("/studio/projects/options");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: StudioProjectOptions };
    return body.data;
  } catch {
    return null;
  }
}

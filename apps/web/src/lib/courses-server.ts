import { cookies } from "next/headers";
import type { CourseCatalogItem, CourseDetail } from "@/lib/courses";

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

export async function loadCourseCatalog(): Promise<CourseCatalogItem[] | null> {
  try {
    const res = await apiFetch("/courses");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { courses: CourseCatalogItem[] } };
    return body.data.courses;
  } catch {
    return null;
  }
}

export async function loadCourseDetail(slug: string): Promise<CourseDetail | null> {
  try {
    const res = await apiFetch(`/courses/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { course: CourseDetail } };
    return body.data.course;
  } catch {
    return null;
  }
}

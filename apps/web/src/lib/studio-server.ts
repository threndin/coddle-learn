import { cookies } from "next/headers";
import type { StudioCourse, StudioCourseList } from "@/lib/studio";

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

export async function loadStudioCourses(): Promise<StudioCourseList | null> {
  try {
    const res = await apiFetch("/studio/courses");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: StudioCourseList };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadStudioCourse(courseId: string): Promise<StudioCourse | null> {
  try {
    const res = await apiFetch(`/studio/courses/${encodeURIComponent(courseId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { course: StudioCourse } };
    return body.data.course;
  } catch {
    return null;
  }
}

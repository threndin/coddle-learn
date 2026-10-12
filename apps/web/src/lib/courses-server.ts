import type { CourseCatalogItem, CourseDetail } from "@/lib/courses";
import { serverApiFetch } from "@/lib/server-api";

export async function loadCourseCatalog(): Promise<CourseCatalogItem[] | null> {
  try {
    const res = await serverApiFetch("/courses");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { courses: CourseCatalogItem[] } };
    return body.data.courses;
  } catch {
    return null;
  }
}

export async function loadCourseDetail(slug: string): Promise<CourseDetail | null> {
  try {
    const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { course: CourseDetail } };
    return body.data.course;
  } catch {
    return null;
  }
}

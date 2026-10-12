import type { StudioCourse, StudioCourseList } from "@/lib/studio";
import { serverApiFetch } from "@/lib/server-api";

export async function loadStudioCourses(): Promise<StudioCourseList | null> {
  try {
    const res = await serverApiFetch("/studio/courses");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: StudioCourseList };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadStudioCourse(courseId: string): Promise<StudioCourse | null> {
  try {
    const res = await serverApiFetch(`/studio/courses/${encodeURIComponent(courseId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { course: StudioCourse } };
    return body.data.course;
  } catch {
    return null;
  }
}

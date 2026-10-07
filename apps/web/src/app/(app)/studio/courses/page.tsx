import { StudioCourses } from "@/components/studio/studio-courses";
import { loadStudioCourses } from "@/lib/studio-server";

export default async function StudioCoursesPage() {
  const data = await loadStudioCourses();
  return <StudioCourses initial={data} />;
}

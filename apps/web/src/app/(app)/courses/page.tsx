import { CoursesCatalog } from "@/components/courses/courses-catalog";
import { loadCourseCatalog } from "@/lib/courses-server";

export default async function CoursesPage() {
  const courses = await loadCourseCatalog();
  return <CoursesCatalog initialCourses={courses} />;
}

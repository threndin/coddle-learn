import { CourseDetailView } from "@/components/courses/course-detail";
import { loadCourseDetail } from "@/lib/courses-server";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ module?: string; lesson?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const initialModuleSlug =
    typeof query.module === "string" && query.module.length > 0 ? query.module : null;
  const initialLessonSlug =
    typeof query.lesson === "string" && query.lesson.length > 0 ? query.lesson : null;
  const course = await loadCourseDetail(slug);

  return (
    <CourseDetailView
      slug={slug}
      initialModuleSlug={initialModuleSlug}
      initialLessonSlug={initialLessonSlug}
      initialCourse={course}
    />
  );
}

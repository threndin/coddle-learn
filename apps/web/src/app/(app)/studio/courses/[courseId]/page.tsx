import Link from "next/link";
import { CourseEditor } from "@/components/studio/editor/course-editor";
import { loadStudioCourse } from "@/lib/studio-server";

export default async function StudioCourseEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string; module?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const course = await loadStudioCourse(courseId);

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
        <p className="text-sm text-ink-muted">That course could not be found.</p>
        <Link href="/studio/courses" className="mt-4 inline-flex text-sm font-semibold text-brand">
          Back to Studio
        </Link>
      </div>
    );
  }

  return (
    <CourseEditor
      initialCourse={course}
      initialLessonId={typeof query.lesson === "string" ? query.lesson : null}
      initialModuleId={typeof query.module === "string" ? query.module : null}
    />
  );
}

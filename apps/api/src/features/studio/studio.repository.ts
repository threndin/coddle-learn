import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const studioCourseInclude = {
  skills: {
    include: { skill: { select: { slug: true, name: true, category: true } } },
  },
  modules: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" as const },
        include: { exercises: { orderBy: { sortOrder: "asc" as const } } },
      },
    },
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseInclude;

export type StudioCourse = Prisma.CourseGetPayload<{ include: typeof studioCourseInclude }>;
export type StudioLessonRow = StudioCourse["modules"][number]["lessons"][number];
export type StudioExerciseRow = StudioLessonRow["exercises"][number];

const studioListInclude = {
  modules: {
    select: {
      id: true,
      lessons: { select: { id: true, estimatedMinutes: true } },
    },
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseInclude;

export type StudioListCourse = Prisma.CourseGetPayload<{ include: typeof studioListInclude }>;

export async function listCreatorCourses(userId: string): Promise<StudioListCourse[]> {
  return prisma.course.findMany({
    where: { createdByUserId: userId },
    include: studioListInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function findStudioCourse(courseId: string): Promise<StudioCourse | null> {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: studioCourseInclude,
  });
}

export async function completedCounts(courseIds: string[]): Promise<Map<string, number>> {
  if (courseIds.length === 0) return new Map();
  const rows = await prisma.userCourse.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds }, completedAt: { not: null } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.courseId, row._count._all]));
}

export async function courseSlugsLike(base: string, excludeCourseId?: string) {
  const rows = await prisma.course.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeCourseId ? { id: { not: excludeCourseId } } : {}),
    },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export async function skillIdsForSlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  return prisma.skill.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
}

export async function createCourse(data: Prisma.CourseUncheckedCreateInput, skillIds: string[]) {
  return prisma.course.create({
    data: {
      ...data,
      skills: { create: skillIds.map((skillId) => ({ skillId })) },
    },
  });
}

export async function updateCourse(courseId: string, data: Prisma.CourseUncheckedUpdateInput) {
  return prisma.course.update({ where: { id: courseId }, data });
}

export async function replaceCourseSkills(courseId: string, skillIds: string[]) {
  await prisma.$transaction([
    prisma.courseSkill.deleteMany({ where: { courseId } }),
    prisma.courseSkill.createMany({
      data: skillIds.map((skillId) => ({ courseId, skillId })),
    }),
  ]);
}

export async function deleteCourse(courseId: string) {
  return prisma.course.delete({ where: { id: courseId } });
}

export async function createModule(data: Prisma.CourseModuleUncheckedCreateInput) {
  return prisma.courseModule.create({ data });
}

export async function updateModule(moduleId: string, data: Prisma.CourseModuleUncheckedUpdateInput) {
  return prisma.courseModule.update({ where: { id: moduleId }, data });
}

export async function deleteModule(moduleId: string) {
  return prisma.courseModule.delete({ where: { id: moduleId } });
}

export async function createLesson(data: Prisma.CourseLessonUncheckedCreateInput) {
  return prisma.courseLesson.create({ data });
}

export async function updateLesson(lessonId: string, data: Prisma.CourseLessonUncheckedUpdateInput) {
  return prisma.courseLesson.update({ where: { id: lessonId }, data });
}

export async function deleteLesson(lessonId: string) {
  return prisma.courseLesson.delete({ where: { id: lessonId } });
}

export async function createExercise(data: Prisma.CourseExerciseUncheckedCreateInput) {
  return prisma.courseExercise.create({ data });
}

export async function updateExercise(
  exerciseId: string,
  data: Prisma.CourseExerciseUncheckedUpdateInput,
) {
  return prisma.courseExercise.update({ where: { id: exerciseId }, data });
}

export async function deleteExercise(exerciseId: string) {
  return prisma.courseExercise.delete({ where: { id: exerciseId } });
}

export async function reorderExercises(exerciseIds: string[]) {
  await prisma.$transaction(
    exerciseIds.map((id, sortOrder) =>
      prisma.courseExercise.update({ where: { id }, data: { sortOrder } }),
    ),
  );
}

/** Lesson reading time plus exercise time. */
export async function totalCourseMinutes(courseId: string): Promise<number> {
  const [lessons, exercises] = await Promise.all([
    prisma.courseLesson.aggregate({
      where: { module: { courseId } },
      _sum: { estimatedMinutes: true },
    }),
    prisma.courseExercise.aggregate({
      where: { lesson: { module: { courseId } } },
      _sum: { estimatedMinutes: true },
    }),
  ]);
  return (lessons._sum.estimatedMinutes ?? 0) + (exercises._sum.estimatedMinutes ?? 0);
}

export type OutlinePlan = {
  modules: { id: string; sortOrder: number }[];
  lessons: { id: string; moduleId: string; sortOrder: number; slug: string; moved: boolean }[];
};

/**
 * Moved lessons get a temporary slug first so swaps between modules never trip
 * the (module_id, slug) unique index mid-transaction.
 */
export async function applyOutline(plan: OutlinePlan) {
  const moved = plan.lessons.filter((lesson) => lesson.moved);
  await prisma.$transaction([
    ...plan.modules.map((courseModule) =>
      prisma.courseModule.update({
        where: { id: courseModule.id },
        data: { sortOrder: courseModule.sortOrder },
      }),
    ),
    ...moved.map((lesson) =>
      prisma.courseLesson.update({
        where: { id: lesson.id },
        data: { slug: `__moving-${lesson.id}`, moduleId: lesson.moduleId },
      }),
    ),
    ...plan.lessons.map((lesson) =>
      prisma.courseLesson.update({
        where: { id: lesson.id },
        data: {
          moduleId: lesson.moduleId,
          sortOrder: lesson.sortOrder,
          ...(lesson.moved ? { slug: lesson.slug } : {}),
        },
      }),
    ),
  ]);
}

import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const courseInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
  skills: {
    include: {
      skill: {
        select: { slug: true, name: true, category: true },
      },
    },
  },
  modules: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          exercises: { orderBy: { sortOrder: "asc" as const } },
        },
      },
    },
  },
} satisfies Prisma.CourseInclude;

export type CourseWithContent = Prisma.CourseGetPayload<{
  include: typeof courseInclude;
}>;

export async function listPublishedCourses(): Promise<CourseWithContent[]> {
  return prisma.course.findMany({
    where: { status: "published" },
    include: courseInclude,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
  });
}

/** Any status; callers decide visibility with `canViewCourse`. */
export async function findCourseBySlug(slug: string): Promise<CourseWithContent | null> {
  return prisma.course.findUnique({
    where: { slug },
    include: courseInclude,
  });
}

export async function listUserCourses(userId: string) {
  return prisma.userCourse.findMany({
    where: { userId },
    include: {
      course: {
        include: courseInclude,
      },
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function findUserCourse(userId: string, courseId: string) {
  return prisma.userCourse.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

export async function createUserCourse(userId: string, courseId: string) {
  return prisma.userCourse.create({
    data: { userId, courseId },
  });
}

export async function listLessonProgressForLessons(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return [];
  return prisma.userLessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
  });
}

export async function findLessonProgress(userId: string, lessonId: string) {
  return prisma.userLessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
}

export async function upsertLessonProgress(
  userId: string,
  lessonId: string,
  status: string,
  pointsAwarded: number,
) {
  return prisma.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, status, pointsAwarded },
    update: { status, pointsAwarded },
  });
}

export async function deleteLessonProgress(userId: string, lessonId: string) {
  return prisma.userLessonProgress.deleteMany({
    where: { userId, lessonId },
  });
}

export async function listExerciseSubmissions(userId: string, exerciseIds: string[]) {
  if (exerciseIds.length === 0) return [];
  return prisma.userExerciseSubmission.findMany({
    where: { userId, exerciseId: { in: exerciseIds } },
  });
}

export async function upsertExerciseSubmission(
  userId: string,
  exerciseId: string,
  data: {
    status: string;
    response: Prisma.InputJsonValue;
    score: number | null;
    pointsAwarded: number;
  },
) {
  return prisma.userExerciseSubmission.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId, ...data },
    update: { ...data, attempts: { increment: 1 } },
  });
}

export async function deleteExerciseSubmission(userId: string, exerciseId: string) {
  return prisma.userExerciseSubmission.deleteMany({
    where: { userId, exerciseId },
  });
}

export async function markUserCourseCompleted(userId: string, courseId: string) {
  return prisma.userCourse.update({
    where: { userId_courseId: { userId, courseId } },
    data: { completedAt: new Date() },
  });
}

export async function clearUserCourseCompleted(userId: string, courseId: string) {
  return prisma.userCourse.update({
    where: { userId_courseId: { userId, courseId } },
    data: { completedAt: null },
  });
}

export async function incrementUserPoints(userId: string, amount: number) {
  if (amount === 0) return;
  return prisma.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });
}

export async function listUserSkillSlugs(userId: string): Promise<string[]> {
  const rows = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: { select: { slug: true } } },
  });
  return rows.map((row) => row.skill.slug);
}

export function canViewCourse(
  course: { status: string; createdByUserId: string },
  userId: string,
  enrolled: boolean,
): boolean {
  if (course.status === "published") return true;
  if (course.createdByUserId === userId) return true;
  return course.status === "archived" && enrolled;
}

export function flattenLessons(course: CourseWithContent) {
  return course.modules.flatMap((courseModule) =>
    courseModule.lessons.map((lesson) => ({
      ...lesson,
      moduleSlug: courseModule.slug,
      moduleTitle: courseModule.title,
    })),
  );
}

export type FlatLesson = ReturnType<typeof flattenLessons>[number];
export type CourseExerciseRow = FlatLesson["exercises"][number];

export function flattenExercises(lessons: FlatLesson[]) {
  return lessons.flatMap((lesson) => lesson.exercises);
}

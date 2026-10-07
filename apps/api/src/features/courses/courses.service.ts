import {
  COURSE_COMPLETE_POINTS,
  courseProgressPercent,
  isLessonProgressStatus,
  LESSON_COMPLETE_POINTS,
  matchedSkillSlugs,
} from "@coddle/shared";
import type { CourseLesson, UserLessonProgress } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import { ratingSummaries, summaryFor, type RatingSummary } from "./reviews.repository.js";
import {
  canViewCourse,
  clearUserCourseCompleted,
  createUserCourse,
  deleteLessonProgress,
  findCourseBySlug,
  findLessonProgress,
  findUserCourse,
  flattenLessons,
  incrementUserPoints,
  listLessonProgressForLessons,
  listPublishedCourses,
  listUserCourses,
  listUserSkillSlugs,
  markUserCourseCompleted,
  upsertLessonProgress,
  type CourseWithContent,
} from "./courses.repository.js";

export type LessonUiStatus = "locked" | "current" | "completed" | "skipped";

function progressMap(rows: UserLessonProgress[]) {
  return new Map(rows.map((row) => [row.lessonId, row]));
}

function deriveLessonStatuses(
  lessons: CourseLesson[],
  progress: Map<string, UserLessonProgress>,
): { statuses: LessonUiStatus[]; nextLesson: CourseLesson | null } {
  const statuses: LessonUiStatus[] = [];
  let nextLesson: CourseLesson | null = null;
  let locked = false;

  for (const lesson of lessons) {
    const row = progress.get(lesson.id);
    if (row?.status === "completed") {
      statuses.push("completed");
      continue;
    }
    if (row?.status === "skipped") {
      statuses.push("skipped");
      continue;
    }
    if (locked) {
      statuses.push("locked");
      continue;
    }
    statuses.push("current");
    if (!nextLesson) nextLesson = lesson;
    locked = true;
  }

  return { statuses, nextLesson };
}

function summarizeProgress(
  lessons: CourseLesson[],
  progress: Map<string, UserLessonProgress>,
) {
  const { statuses, nextLesson } = deriveLessonStatuses(lessons, progress);
  const doneCount = statuses.filter(
    (status) => status === "completed" || status === "skipped",
  ).length;
  return {
    statuses,
    nextLesson,
    doneCount,
    totalCount: lessons.length,
    progressPercent: courseProgressPercent(doneCount, lessons.length),
  };
}

function creatorPayload(course: CourseWithContent) {
  return {
    id: course.createdBy.id,
    name: course.createdBy.name,
    avatarUrl: course.createdBy.avatarUrl,
  };
}

function skillsPayload(course: CourseWithContent) {
  return course.skills.map((row) => ({
    slug: row.skill.slug,
    name: row.skill.name,
    category: row.skill.category,
  }));
}

function toCatalogItem(
  course: CourseWithContent,
  enrollment: { startedAt: Date; completedAt: Date | null } | null,
  progress: Map<string, UserLessonProgress>,
  userSkillSlugs: string[],
  rating: RatingSummary,
) {
  const lessons = flattenLessons(course);
  const summary = summarizeProgress(lessons, progress);
  const skillSlugs = skillsPayload(course).map((skill) => skill.slug);

  return {
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    level: course.level,
    thumbnailUrl: course.thumbnailUrl,
    estimatedHours: course.estimatedHours,
    publishedAt: course.publishedAt?.toISOString() ?? null,
    rating,
    createdBy: creatorPayload(course),
    skills: skillsPayload(course),
    skillSlugs,
    matchedSkillSlugs: matchedSkillSlugs(skillSlugs, userSkillSlugs),
    moduleCount: course.modules.length,
    lessonCount: lessons.length,
    enrolled: Boolean(enrollment),
    startedAt: enrollment?.startedAt.toISOString() ?? null,
    completedAt: enrollment?.completedAt?.toISOString() ?? null,
    progressPercent: enrollment ? summary.progressPercent : 0,
    nextLesson:
      enrollment && summary.nextLesson
        ? {
            slug: summary.nextLesson.slug,
            title: summary.nextLesson.title,
            moduleSlug: lessons.find((item) => item.id === summary.nextLesson!.id)
              ?.moduleSlug,
          }
        : null,
  };
}

function toDetail(
  course: CourseWithContent,
  enrollment: { startedAt: Date; completedAt: Date | null } | null,
  progress: Map<string, UserLessonProgress>,
  rating: RatingSummary,
  userId: string,
) {
  const lessons = flattenLessons(course);
  const summary = summarizeProgress(lessons, progress);
  const statuses = enrollment
    ? summary.statuses
    : deriveLessonStatuses(lessons, new Map()).statuses;
  const statusByLessonId = new Map(
    lessons.map((lesson, index) => [lesson.id, statuses[index]!]),
  );

  const isCreator = course.createdByUserId === userId;

  return {
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    level: course.level,
    status: course.status,
    thumbnailUrl: course.thumbnailUrl,
    estimatedHours: course.estimatedHours,
    publishedAt: course.publishedAt?.toISOString() ?? null,
    updatedAt: course.updatedAt.toISOString(),
    rating,
    viewer: {
      isCreator,
      studioCourseId: isCreator ? course.id : null,
      canStart: course.status === "published",
    },
    createdBy: creatorPayload(course),
    skills: skillsPayload(course),
    enrolled: Boolean(enrollment),
    startedAt: enrollment?.startedAt.toISOString() ?? null,
    completedAt: enrollment?.completedAt?.toISOString() ?? null,
    progressPercent: enrollment ? summary.progressPercent : 0,
    nextLesson:
      enrollment && summary.nextLesson
        ? {
            slug: summary.nextLesson.slug,
            title: summary.nextLesson.title,
            moduleSlug: lessons.find((item) => item.id === summary.nextLesson!.id)
              ?.moduleSlug,
          }
        : null,
    modules: course.modules.map((courseModule) => ({
      slug: courseModule.slug,
      title: courseModule.title,
      summary: courseModule.summary,
      lessons: courseModule.lessons.map((lesson) => ({
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        content: lesson.content,
        estimatedMinutes: lesson.estimatedMinutes,
        status: statusByLessonId.get(lesson.id) ?? "locked",
      })),
    })),
  };
}

export async function getCourseCatalog(userId: string) {
  const [courses, enrollments, userSkillSlugs] = await Promise.all([
    listPublishedCourses(),
    listUserCourses(userId),
    listUserSkillSlugs(userId),
  ]);
  const ratings = await ratingSummaries(courses.map((course) => course.id));

  const enrollmentByCourseId = new Map(
    enrollments.map((row) => [row.courseId, row]),
  );

  const items = await Promise.all(
    courses.map(async (course) => {
      const enrollment = enrollmentByCourseId.get(course.id) ?? null;
      const lessons = flattenLessons(course);
      const progressRows = enrollment
        ? await listLessonProgressForLessons(
            userId,
            lessons.map((lesson) => lesson.id),
          )
        : [];
      return toCatalogItem(
        course,
        enrollment,
        progressMap(progressRows),
        userSkillSlugs,
        summaryFor(ratings, course.id),
      );
    }),
  );

  return { courses: items };
}

/** Loads a course the user may see, or throws the same 404 as a missing slug. */
export async function loadVisibleCourse(userId: string, slug: string) {
  const course = await findCourseBySlug(slug);
  const enrollment = course ? await findUserCourse(userId, course.id) : null;
  if (!course || !canViewCourse(course, userId, Boolean(enrollment))) {
    throw new AppError(404, "course_missing", "That course could not be found.");
  }
  return { course, enrollment };
}

export async function getCourseDetail(userId: string, slug: string) {
  const { course, enrollment } = await loadVisibleCourse(userId, slug);
  const lessons = flattenLessons(course);
  const [progressRows, ratings] = await Promise.all([
    enrollment
      ? listLessonProgressForLessons(
          userId,
          lessons.map((lesson) => lesson.id),
        )
      : Promise.resolve([]),
    ratingSummaries([course.id]),
  ]);

  return {
    course: toDetail(
      course,
      enrollment,
      progressMap(progressRows),
      summaryFor(ratings, course.id),
      userId,
    ),
  };
}

export async function startCourse(userId: string, slug: string) {
  const { course } = await loadVisibleCourse(userId, slug);
  if (course.status !== "published") {
    throw new AppError(
      409,
      "course_not_published",
      "This course is not published yet, so it cannot be started.",
    );
  }

  const existing = await findUserCourse(userId, course.id);
  if (!existing) {
    await createUserCourse(userId, course.id);
  }

  return getCourseDetail(userId, slug);
}

export async function updateCourseProgress(
  userId: string,
  slug: string,
  input: unknown,
) {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_progress", "Progress details were missing.");
  }

  const body = input as Record<string, unknown>;
  const lessonSlug = typeof body.lessonSlug === "string" ? body.lessonSlug : "";
  const moduleSlug = typeof body.moduleSlug === "string" ? body.moduleSlug : "";
  if (!lessonSlug || !moduleSlug) {
    throw new AppError(400, "invalid_progress", "Choose a lesson to update.");
  }

  const action = body.status;
  if (action !== "incomplete" && !isLessonProgressStatus(action)) {
    throw new AppError(
      400,
      "invalid_progress",
      "Status must be completed, skipped, or incomplete.",
    );
  }

  const visible = await loadVisibleCourse(userId, slug);
  const { course } = visible;
  let enrollment = visible.enrollment;
  if (!enrollment) {
    if (course.status !== "published") {
      throw new AppError(
        409,
        "course_not_published",
        "This course is not published yet, so progress cannot be tracked.",
      );
    }
    enrollment = await createUserCourse(userId, course.id);
  }

  const courseModule = course.modules.find((item) => item.slug === moduleSlug);
  const lesson = courseModule?.lessons.find((item) => item.slug === lessonSlug);
  if (!courseModule || !lesson) {
    throw new AppError(404, "lesson_missing", "That lesson could not be found.");
  }

  const lessons = flattenLessons(course);
  const progressRows = await listLessonProgressForLessons(
    userId,
    lessons.map((item) => item.id),
  );
  const progress = progressMap(progressRows);
  const { statuses } = deriveLessonStatuses(lessons, progress);
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const uiStatus = statuses[lessonIndex];

  if (action === "incomplete") {
    const existing = await findLessonProgress(userId, lesson.id);
    if (!existing) {
      throw new AppError(400, "lesson_not_done", "That lesson is not marked done yet.");
    }
    if (existing.pointsAwarded) {
      await incrementUserPoints(userId, -existing.pointsAwarded);
    }
    await deleteLessonProgress(userId, lesson.id);
  } else {
    if (uiStatus === "locked") {
      throw new AppError(
        400,
        "lesson_locked",
        "Finish the earlier lessons before updating this one.",
      );
    }

    const existing = progress.get(lesson.id);
    let pointsAwarded = existing?.pointsAwarded ?? 0;
    if (action === "completed" && pointsAwarded <= 0) {
      pointsAwarded = LESSON_COMPLETE_POINTS;
      await incrementUserPoints(userId, LESSON_COMPLETE_POINTS);
    }
    if (action === "skipped") {
      pointsAwarded = existing?.pointsAwarded ?? 0;
    }

    await upsertLessonProgress(userId, lesson.id, action, pointsAwarded);
  }

  const refreshed = await listLessonProgressForLessons(
    userId,
    lessons.map((item) => item.id),
  );
  const refreshedProgress = progressMap(refreshed);
  const summary = summarizeProgress(lessons, refreshedProgress);
  const wasComplete = Boolean(enrollment.completedAt);
  const nowComplete = summary.doneCount >= summary.totalCount && summary.totalCount > 0;

  if (nowComplete && !wasComplete) {
    await markUserCourseCompleted(userId, course.id);
    await incrementUserPoints(userId, COURSE_COMPLETE_POINTS);
  } else if (!nowComplete && wasComplete) {
    await clearUserCourseCompleted(userId, course.id);
    await incrementUserPoints(userId, -COURSE_COMPLETE_POINTS);
  }

  const detail = await getCourseDetail(userId, slug);
  return {
    ...detail,
    pointsAwarded: action === "completed" ? LESSON_COMPLETE_POINTS : 0,
    courseCompleteBonus: nowComplete && !wasComplete ? COURSE_COMPLETE_POINTS : 0,
  };
}

export async function getContinueCourse(userId: string) {
  const enrollments = await listUserCourses(userId);
  if (enrollments.length === 0) {
    return { continue: null as null, enrolled: [] as unknown[] };
  }

  const active =
    enrollments.find((row) => !row.completedAt) ?? enrollments[0] ?? null;

  const enrolled = await Promise.all(
    enrollments.map(async (row) => {
      const lessons = flattenLessons(row.course);
      const progressRows = await listLessonProgressForLessons(
        userId,
        lessons.map((lesson) => lesson.id),
      );
      const summary = summarizeProgress(lessons, progressMap(progressRows));
      return {
        slug: row.course.slug,
        title: row.course.title,
        progressPercent: summary.progressPercent,
        completedAt: row.completedAt?.toISOString() ?? null,
        nextLesson: summary.nextLesson
          ? {
              slug: summary.nextLesson.slug,
              title: summary.nextLesson.title,
              moduleSlug: lessons.find((item) => item.id === summary.nextLesson!.id)
                ?.moduleSlug,
            }
          : null,
      };
    }),
  );

  if (!active) {
    return { continue: null, enrolled };
  }

  const lessons = flattenLessons(active.course);
  const progressRows = await listLessonProgressForLessons(
    userId,
    lessons.map((lesson) => lesson.id),
  );
  const summary = summarizeProgress(lessons, progressMap(progressRows));

  return {
    continue: {
      slug: active.course.slug,
      title: active.course.title,
      summary: active.course.summary,
      thumbnailUrl: active.course.thumbnailUrl,
      progressPercent: summary.progressPercent,
      nextLesson: summary.nextLesson
        ? {
            slug: summary.nextLesson.slug,
            title: summary.nextLesson.title,
            moduleSlug: lessons.find((item) => item.id === summary.nextLesson!.id)
              ?.moduleSlug,
          }
        : null,
      completedAt: active.completedAt?.toISOString() ?? null,
    },
    enrolled,
  };
}

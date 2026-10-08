import {
  COURSE_COMPLETE_POINTS,
  courseProgressPercent,
  isExerciseDone,
  isLessonProgressStatus,
  LESSON_COMPLETE_POINTS,
  matchedSkillSlugs,
  readExerciseConfig,
} from "@coddle/shared";
import type { CourseLesson, UserExerciseSubmission, UserLessonProgress } from "@prisma/client";
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
  flattenExercises,
  flattenLessons,
  incrementUserPoints,
  listExerciseSubmissions,
  listLessonProgressForLessons,
  listPublishedCourses,
  listUserCourses,
  listUserSkillSlugs,
  markUserCourseCompleted,
  upsertLessonProgress,
  type CourseExerciseRow,
  type CourseWithContent,
  type FlatLesson,
} from "./courses.repository.js";

export type LessonUiStatus = "locked" | "current" | "completed" | "skipped";

type Enrollment = { startedAt: Date; completedAt: Date | null };

export type ProgressState = {
  lessons: Map<string, UserLessonProgress>;
  exercises: Map<string, UserExerciseSubmission>;
};

const EMPTY_PROGRESS: ProgressState = { lessons: new Map(), exercises: new Map() };

export async function loadProgressState(
  userId: string,
  lessons: FlatLesson[],
): Promise<ProgressState> {
  const [lessonRows, submissionRows] = await Promise.all([
    listLessonProgressForLessons(
      userId,
      lessons.map((lesson) => lesson.id),
    ),
    listExerciseSubmissions(
      userId,
      flattenExercises(lessons).map((exercise) => exercise.id),
    ),
  ]);
  return {
    lessons: new Map(lessonRows.map((row) => [row.lessonId, row])),
    exercises: new Map(submissionRows.map((row) => [row.exerciseId, row])),
  };
}

export function deriveLessonStatuses<T extends CourseLesson>(
  lessons: T[],
  progress: Map<string, UserLessonProgress>,
): { statuses: LessonUiStatus[]; nextLesson: T | null } {
  const statuses: LessonUiStatus[] = [];
  let nextLesson: T | null = null;
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

/**
 * Lessons and exercises both count toward progress. Once every lesson is done,
 * "next" points at the first lesson that still has an open exercise.
 */
function summarizeProgress(lessons: FlatLesson[], state: ProgressState) {
  const { statuses, nextLesson: currentLesson } = deriveLessonStatuses(lessons, state.lessons);
  const exerciseDone = (exercise: CourseExerciseRow) =>
    isExerciseDone(state.exercises.get(exercise.id)?.status);
  const exercises = flattenExercises(lessons);
  const lessonsDone = statuses.filter(
    (status) => status === "completed" || status === "skipped",
  ).length;
  const exercisesDone = exercises.filter(exerciseDone).length;
  const nextLesson =
    currentLesson ??
    lessons.find((lesson) => lesson.exercises.some((exercise) => !exerciseDone(exercise))) ??
    null;
  const doneCount = lessonsDone + exercisesDone;
  const totalCount = lessons.length + exercises.length;
  return {
    statuses,
    nextLesson,
    doneCount,
    totalCount,
    exerciseCount: exercises.length,
    exercisesDone,
    progressPercent: courseProgressPercent(doneCount, totalCount),
  };
}

function nextLessonPayload(lesson: FlatLesson | null) {
  return lesson ? { slug: lesson.slug, title: lesson.title, moduleSlug: lesson.moduleSlug } : null;
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

/** Answer keys and solutions stay server-side until the learner is done. */
function exercisePayload(
  exercise: CourseExerciseRow,
  submission: UserExerciseSubmission | undefined,
) {
  const config = readExerciseConfig(exercise.config);
  const done = isExerciseDone(submission?.status);
  return {
    id: exercise.id,
    kind: exercise.kind,
    title: exercise.title,
    instructions: exercise.instructions,
    estimatedMinutes: exercise.estimatedMinutes,
    hint: exercise.hint,
    hasSolution: exercise.solution.trim().length > 0,
    solution: done ? exercise.solution : null,
    requirements: config.requirements.filter((item) => item.trim()),
    quiz:
      exercise.kind === "quiz"
        ? {
            passPercent: config.passPercent,
            questions: config.questions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              options: question.options.filter((option) => option.text.trim()),
              correctOptionId: done ? question.correctOptionId : null,
              explanation: done ? question.explanation : null,
            })),
          }
        : null,
    submission: submission
      ? {
          status: submission.status,
          response: submission.response,
          score: submission.score,
          attempts: submission.attempts,
          updatedAt: submission.updatedAt.toISOString(),
        }
      : null,
  };
}

function toCatalogItem(
  course: CourseWithContent,
  enrollment: Enrollment | null,
  state: ProgressState,
  userSkillSlugs: string[],
  rating: RatingSummary,
) {
  const lessons = flattenLessons(course);
  const summary = summarizeProgress(lessons, state);
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
    exerciseCount: summary.exerciseCount,
    enrolled: Boolean(enrollment),
    startedAt: enrollment?.startedAt.toISOString() ?? null,
    completedAt: enrollment?.completedAt?.toISOString() ?? null,
    progressPercent: enrollment ? summary.progressPercent : 0,
    nextLesson: enrollment ? nextLessonPayload(summary.nextLesson) : null,
  };
}

function toDetail(
  course: CourseWithContent,
  enrollment: Enrollment | null,
  state: ProgressState,
  rating: RatingSummary,
  userId: string,
) {
  const lessons = flattenLessons(course);
  const summary = summarizeProgress(lessons, state);
  const statusByLessonId = new Map(
    lessons.map((lesson, index) => [lesson.id, summary.statuses[index]!]),
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
    exerciseCount: summary.exerciseCount,
    exercisesDone: enrollment ? summary.exercisesDone : 0,
    nextLesson: enrollment ? nextLessonPayload(summary.nextLesson) : null,
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
        exercises: lesson.exercises.map((exercise) =>
          exercisePayload(exercise, state.exercises.get(exercise.id)),
        ),
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
      const state = enrollment
        ? await loadProgressState(userId, flattenLessons(course))
        : EMPTY_PROGRESS;
      return toCatalogItem(
        course,
        enrollment,
        state,
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

/** Progress writes enroll the learner on first touch, but only on published courses. */
export async function ensureEnrollment(
  userId: string,
  course: CourseWithContent,
  enrollment: Enrollment | null,
): Promise<Enrollment> {
  if (enrollment) return enrollment;
  if (course.status !== "published") {
    throw new AppError(
      409,
      "course_not_published",
      "This course is not published yet, so progress cannot be tracked.",
    );
  }
  return createUserCourse(userId, course.id);
}

/**
 * Recomputes completion after any progress change. Returns the bonus awarded
 * (0 when nothing changed or completion was undone).
 */
export async function syncCourseCompletion(
  userId: string,
  course: CourseWithContent,
  enrollment: Enrollment,
): Promise<number> {
  const lessons = flattenLessons(course);
  const summary = summarizeProgress(lessons, await loadProgressState(userId, lessons));
  const wasComplete = Boolean(enrollment.completedAt);
  const nowComplete = summary.totalCount > 0 && summary.doneCount >= summary.totalCount;

  if (nowComplete && !wasComplete) {
    await markUserCourseCompleted(userId, course.id);
    await incrementUserPoints(userId, COURSE_COMPLETE_POINTS);
    return COURSE_COMPLETE_POINTS;
  }
  if (!nowComplete && wasComplete) {
    await clearUserCourseCompleted(userId, course.id);
    await incrementUserPoints(userId, -COURSE_COMPLETE_POINTS);
  }
  return 0;
}

export async function getCourseDetail(userId: string, slug: string) {
  const { course, enrollment } = await loadVisibleCourse(userId, slug);
  const [state, ratings] = await Promise.all([
    enrollment ? loadProgressState(userId, flattenLessons(course)) : Promise.resolve(EMPTY_PROGRESS),
    ratingSummaries([course.id]),
  ]);

  return {
    course: toDetail(course, enrollment, state, summaryFor(ratings, course.id), userId),
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
  const enrollment = await ensureEnrollment(userId, course, visible.enrollment);

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
  const progress = new Map(progressRows.map((row) => [row.lessonId, row]));
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

    await upsertLessonProgress(userId, lesson.id, action, pointsAwarded);
  }

  const courseCompleteBonus = await syncCourseCompletion(userId, course, enrollment);
  const detail = await getCourseDetail(userId, slug);
  return {
    ...detail,
    pointsAwarded: action === "completed" ? LESSON_COMPLETE_POINTS : 0,
    courseCompleteBonus,
  };
}

export async function getContinueCourse(userId: string) {
  const enrollments = await listUserCourses(userId);
  if (enrollments.length === 0) {
    return { continue: null as null, enrolled: [] as unknown[] };
  }

  const active =
    enrollments.find((row) => !row.completedAt) ?? enrollments[0] ?? null;

  const summaries = new Map(
    await Promise.all(
      enrollments.map(async (row) => {
        const lessons = flattenLessons(row.course);
        const state = await loadProgressState(userId, lessons);
        return [row.courseId, summarizeProgress(lessons, state)] as const;
      }),
    ),
  );

  const enrolled = enrollments.map((row) => {
    const summary = summaries.get(row.courseId)!;
    return {
      slug: row.course.slug,
      title: row.course.title,
      progressPercent: summary.progressPercent,
      completedAt: row.completedAt?.toISOString() ?? null,
      nextLesson: nextLessonPayload(summary.nextLesson),
    };
  });

  if (!active) {
    return { continue: null, enrolled };
  }

  const summary = summaries.get(active.courseId)!;

  return {
    continue: {
      slug: active.course.slug,
      title: active.course.title,
      summary: active.course.summary,
      thumbnailUrl: active.course.thumbnailUrl,
      progressPercent: summary.progressPercent,
      nextLesson: nextLessonPayload(summary.nextLesson),
      completedAt: active.completedAt?.toISOString() ?? null,
    },
    enrolled,
  };
}

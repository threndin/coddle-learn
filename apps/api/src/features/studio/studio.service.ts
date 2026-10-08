import { randomBytes } from "node:crypto";
import {
  COURSE_IMAGE_TYPES,
  COURSE_LIMITS,
  courseChecklist,
  EDITABLE_COURSE_STATUSES,
  estimatedHoursFromMinutes,
  EXERCISE_LIMITS,
  isCourseAccent,
  isCourseStatus,
  isExerciseKind,
  isExperienceLevel,
  QUIZ_ID_PATTERN,
  readExerciseConfig,
  slugify,
  uniqueSlug,
  type CourseStatus,
  type ExerciseConfig,
  type ExerciseKind,
  type QuizQuestion,
} from "@coddle/shared";
import { config, isR2Configured } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { imageExtension, storeGeneratedThumbnail, uploadToR2 } from "../../shared/r2.js";
import { ratingSummaries, summaryFor } from "../courses/reviews.repository.js";
import {
  applyOutline,
  completedCounts,
  courseSlugsLike,
  createCourse,
  createExercise,
  createLesson,
  createModule,
  deleteCourse,
  deleteExercise,
  deleteLesson,
  deleteModule,
  findStudioCourse,
  listCreatorCourses,
  reorderExercises,
  replaceCourseSkills,
  skillIdsForSlugs,
  totalCourseMinutes,
  updateCourse,
  updateExercise,
  updateLesson,
  updateModule,
  type OutlinePlan,
  type StudioCourse,
  type StudioExerciseRow,
  type StudioLessonRow,
} from "./studio.repository.js";

type Body = Record<string, unknown>;

function asBody(input: unknown): Body {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "invalid_body", "Request details were missing.");
  }
  return input as Body;
}

function readText(
  body: Body,
  key: string,
  label: string,
  limits: { min?: number; max: number; markdown?: boolean },
): string | undefined {
  if (!(key in body)) return undefined;
  const raw = body[key];
  if (typeof raw !== "string") {
    throw new AppError(400, "invalid_field", `${label} must be text.`, { field: key });
  }
  const value = key === "content" || limits.markdown ? raw : raw.trim();
  if (limits.min !== undefined && value.trim().length < limits.min) {
    throw new AppError(
      400,
      "invalid_field",
      `${label} needs at least ${limits.min} characters.`,
      { field: key },
    );
  }
  if (value.length > limits.max) {
    throw new AppError(
      400,
      "invalid_field",
      `${label} must be ${limits.max.toLocaleString()} characters or fewer.`,
      { field: key },
    );
  }
  return value;
}

function readSkillSlugs(body: Body): string[] | undefined {
  if (!("skillSlugs" in body)) return undefined;
  const raw = body.skillSlugs;
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
    throw new AppError(400, "invalid_field", "Skills must be a list.", { field: "skillSlugs" });
  }
  const unique = Array.from(new Set(raw as string[]));
  if (unique.length > COURSE_LIMITS.skillMax) {
    throw new AppError(
      400,
      "invalid_field",
      `Tag up to ${COURSE_LIMITS.skillMax} skills.`,
      { field: "skillSlugs" },
    );
  }
  return unique;
}

async function resolveSkillIds(slugs: string[]): Promise<string[]> {
  const rows = await skillIdsForSlugs(slugs);
  if (rows.length !== slugs.length) {
    throw new AppError(400, "invalid_field", "One of those skills is not in the catalog.", {
      field: "skillSlugs",
    });
  }
  return rows.map((row) => row.id);
}

async function loadOwnedCourse(userId: string, courseId: string): Promise<StudioCourse> {
  const course = await findStudioCourse(courseId);
  if (!course || course.createdByUserId !== userId) {
    throw new AppError(404, "course_missing", "That course could not be found.");
  }
  return course;
}

function statusOf(course: { status: string }): CourseStatus {
  return isCourseStatus(course.status) ? course.status : "draft";
}

function assertEditable(course: StudioCourse) {
  if (!EDITABLE_COURSE_STATUSES.includes(statusOf(course))) {
    throw new AppError(
      409,
      "course_locked",
      "This course is in review. Withdraw it to make changes.",
    );
  }
}

/** Slugs stay stable once learners may have links to them. */
function slugsFrozen(course: { publishedAt: Date | null }) {
  return Boolean(course.publishedAt);
}

function checklistFor(course: StudioCourse) {
  return courseChecklist({
    title: course.title,
    summary: course.summary,
    skillCount: course.skills.length,
    modules: course.modules.map((courseModule) => ({
      title: courseModule.title,
      lessons: courseModule.lessons.map((lesson) => ({
        title: lesson.title,
        content: lesson.content,
        exercises: lesson.exercises.map((exercise) => {
          const config = readExerciseConfig(exercise.config);
          return {
            kind: exercise.kind,
            title: exercise.title,
            instructions: exercise.instructions,
            requirements: config.requirements,
            questions: config.questions,
          };
        }),
      })),
    })),
  });
}

function permissionsFor(course: StudioCourse) {
  const status = statusOf(course);
  const ready = checklistFor(course).every((item) => item.done);
  return {
    canEdit: EDITABLE_COURSE_STATUSES.includes(status),
    canSubmit: (status === "draft" || status === "changes_requested") && ready,
    canWithdraw: status === "in_review",
    canArchive: status === "published",
    canRestore: status === "archived",
    canDelete: !course.publishedAt,
  };
}

function exercisePayload(exercise: StudioExerciseRow) {
  const config = readExerciseConfig(exercise.config);
  return {
    id: exercise.id,
    kind: exercise.kind,
    title: exercise.title,
    instructions: exercise.instructions,
    hint: exercise.hint,
    solution: exercise.solution,
    estimatedMinutes: exercise.estimatedMinutes,
    requirements: config.requirements,
    questions: config.questions,
    passPercent: config.passPercent,
    updatedAt: exercise.updatedAt.toISOString(),
  };
}

function lessonFields(lesson: Omit<StudioLessonRow, "exercises">) {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    summary: lesson.summary,
    content: lesson.content,
    estimatedMinutes: lesson.estimatedMinutes,
    updatedAt: lesson.updatedAt.toISOString(),
  };
}

function lessonPayload(lesson: StudioLessonRow) {
  return { ...lessonFields(lesson), exercises: lesson.exercises.map(exercisePayload) };
}

async function toStudioCourse(course: StudioCourse) {
  const [ratings, completed] = await Promise.all([
    ratingSummaries([course.id]),
    completedCounts([course.id]),
  ]);
  const rating = summaryFor(ratings, course.id);
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    level: course.level,
    status: statusOf(course),
    accent: course.accent,
    thumbnailUrl: course.thumbnailUrl,
    customThumbnail: course.customThumbnail,
    estimatedHours: course.estimatedHours,
    submittedAt: course.submittedAt?.toISOString() ?? null,
    reviewedAt: course.reviewedAt?.toISOString() ?? null,
    reviewNote: course.reviewNote,
    publishedAt: course.publishedAt?.toISOString() ?? null,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    reviewMode: config.courseReviewMode,
    uploadsEnabled: isR2Configured(),
    skills: course.skills.map((row) => ({
      slug: row.skill.slug,
      name: row.skill.name,
      category: row.skill.category,
    })),
    modules: course.modules.map((courseModule) => ({
      id: courseModule.id,
      slug: courseModule.slug,
      title: courseModule.title,
      summary: courseModule.summary,
      lessons: courseModule.lessons.map(lessonPayload),
    })),
    stats: {
      enrolledCount: course._count.enrollments,
      completedCount: completed.get(course.id) ?? 0,
      ratingAverage: rating.average,
      ratingCount: rating.count,
    },
    checklist: checklistFor(course),
    permissions: permissionsFor(course),
  };
}

async function respond(userId: string, courseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  return { course: await toStudioCourse(course) };
}

async function refreshEstimate(courseId: string) {
  const minutes = await totalCourseMinutes(courseId);
  await updateCourse(courseId, { estimatedHours: estimatedHoursFromMinutes(minutes) });
}

async function uniqueCourseSlug(title: string, excludeCourseId?: string) {
  const base = slugify(title, "course");
  return uniqueSlug(base, await courseSlugsLike(base, excludeCourseId));
}

/* ---------------------------------- Courses --------------------------------- */

export async function listStudioCourses(userId: string) {
  const courses = await listCreatorCourses(userId);
  const ids = courses.map((course) => course.id);
  const [ratings, completed] = await Promise.all([ratingSummaries(ids), completedCounts(ids)]);

  return {
    reviewMode: config.courseReviewMode,
    courses: courses.map((course) => {
      const lessons = course.modules.flatMap((courseModule) => courseModule.lessons);
      const rating = summaryFor(ratings, course.id);
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        level: course.level,
        status: statusOf(course),
        accent: course.accent,
        thumbnailUrl: course.thumbnailUrl,
        estimatedHours: course.estimatedHours,
        moduleCount: course.modules.length,
        lessonCount: lessons.length,
        enrolledCount: course._count.enrollments,
        completedCount: completed.get(course.id) ?? 0,
        ratingAverage: rating.average,
        ratingCount: rating.count,
        reviewNote: course.reviewNote,
        submittedAt: course.submittedAt?.toISOString() ?? null,
        publishedAt: course.publishedAt?.toISOString() ?? null,
        updatedAt: course.updatedAt.toISOString(),
        createdAt: course.createdAt.toISOString(),
      };
    }),
  };
}

export async function getStudioCourse(userId: string, courseId: string) {
  return respond(userId, courseId);
}

export async function createStudioCourse(userId: string, input: unknown) {
  const body = asBody(input);
  const title = readText(body, "title", "Title", {
    min: COURSE_LIMITS.titleMin,
    max: COURSE_LIMITS.titleMax,
  });
  if (!title) {
    throw new AppError(400, "invalid_field", "Give your course a title.", { field: "title" });
  }
  const summary =
    readText(body, "summary", "Summary", { max: COURSE_LIMITS.summaryMax }) ?? "";
  const level = body.level ?? "beginner";
  if (!isExperienceLevel(level)) {
    throw new AppError(400, "invalid_field", "Choose a level.", { field: "level" });
  }
  const accent = body.accent ?? "#004CC8";
  if (!isCourseAccent(accent)) {
    throw new AppError(400, "invalid_field", "Choose one of the accent colors.", {
      field: "accent",
    });
  }
  const skillIds = await resolveSkillIds(readSkillSlugs(body) ?? []);

  const created = await createCourse(
    {
      slug: await uniqueCourseSlug(title),
      title,
      summary,
      level,
      accent,
      status: "draft",
      thumbnailUrl: "",
      estimatedHours: 1,
      createdByUserId: userId,
    },
    skillIds,
  );

  const thumbnailUrl = await storeGeneratedThumbnail({
    courseId: created.id,
    title,
    level,
    accent,
  });
  await updateCourse(created.id, { thumbnailUrl });

  return respond(userId, created.id);
}

export async function updateStudioCourse(userId: string, courseId: string, input: unknown) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const body = asBody(input);

  const title = readText(body, "title", "Title", {
    min: COURSE_LIMITS.titleMin,
    max: COURSE_LIMITS.titleMax,
  });
  const summary = readText(body, "summary", "Summary", { max: COURSE_LIMITS.summaryMax });
  let level: string | undefined;
  if ("level" in body) {
    if (!isExperienceLevel(body.level)) {
      throw new AppError(400, "invalid_field", "Choose a level.", { field: "level" });
    }
    level = body.level;
  }
  let accent: string | undefined;
  if ("accent" in body) {
    if (!isCourseAccent(body.accent)) {
      throw new AppError(400, "invalid_field", "Choose one of the accent colors.", {
        field: "accent",
      });
    }
    accent = body.accent;
  }
  const skillSlugs = readSkillSlugs(body);

  const nextTitle = title ?? course.title;
  const nextLevel = level ?? course.level;
  const nextAccent = accent ?? course.accent;
  const visualChanged =
    nextTitle !== course.title || nextLevel !== course.level || nextAccent !== course.accent;

  const data: Parameters<typeof updateCourse>[1] = {};
  if (title !== undefined) data.title = title;
  if (summary !== undefined) data.summary = summary;
  if (level !== undefined) data.level = level;
  if (accent !== undefined) data.accent = accent;
  if (title !== undefined && title !== course.title && !slugsFrozen(course)) {
    data.slug = await uniqueCourseSlug(title, course.id);
  }
  if (visualChanged && !course.customThumbnail) {
    data.thumbnailUrl = await storeGeneratedThumbnail({
      courseId: course.id,
      title: nextTitle,
      level: nextLevel,
      accent: nextAccent,
    });
  }

  if (skillSlugs !== undefined) {
    await replaceCourseSkills(course.id, await resolveSkillIds(skillSlugs));
  }
  if (Object.keys(data).length > 0) {
    await updateCourse(course.id, data);
  }
  return respond(userId, courseId);
}

export async function deleteStudioCourse(userId: string, courseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  if (course.publishedAt) {
    throw new AppError(
      409,
      "course_published",
      "Published courses have learners. Archive it instead of deleting.",
    );
  }
  await deleteCourse(course.id);
  return { deleted: true };
}

/* --------------------------------- Lifecycle -------------------------------- */

export async function submitStudioCourse(userId: string, courseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  const status = statusOf(course);
  if (status !== "draft" && status !== "changes_requested") {
    throw new AppError(409, "invalid_transition", "Only drafts can be submitted for review.");
  }
  const missing = checklistFor(course).filter((item) => !item.done);
  if (missing.length > 0) {
    throw new AppError(
      422,
      "course_incomplete",
      "Finish the checklist before submitting.",
      { missing: missing.map((item) => item.label) },
    );
  }

  const now = new Date();
  if (config.courseReviewMode === "auto") {
    await updateCourse(course.id, {
      status: "published",
      submittedAt: now,
      reviewedAt: now,
      reviewedByUserId: null,
      reviewNote: null,
      publishedAt: course.publishedAt ?? now,
    });
  } else {
    await updateCourse(course.id, { status: "in_review", submittedAt: now });
  }
  return respond(userId, courseId);
}

export async function withdrawStudioCourse(userId: string, courseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  if (statusOf(course) !== "in_review") {
    throw new AppError(409, "invalid_transition", "This course is not waiting for review.");
  }
  await updateCourse(course.id, { status: "draft", submittedAt: null });
  return respond(userId, courseId);
}

export async function archiveStudioCourse(userId: string, courseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  if (statusOf(course) !== "published") {
    throw new AppError(409, "invalid_transition", "Only published courses can be archived.");
  }
  await updateCourse(course.id, { status: "archived" });
  return respond(userId, courseId);
}

export async function restoreStudioCourse(userId: string, courseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  if (statusOf(course) !== "archived") {
    throw new AppError(409, "invalid_transition", "This course is not archived.");
  }
  await updateCourse(course.id, { status: "published" });
  return respond(userId, courseId);
}

/* ---------------------------------- Images ---------------------------------- */

function sniffImage(buffer: Buffer, contentType: string): boolean {
  const hex = buffer.subarray(0, 12).toString("hex");
  switch (contentType) {
    case "image/png":
      return hex.startsWith("89504e470d0a1a0a");
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/gif":
      return hex.startsWith("47494638");
    case "image/webp":
      return hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
    default:
      return false;
  }
}

function readImage(contentType: string | undefined, body: unknown, maxBytes: number) {
  if (!isR2Configured()) {
    throw new AppError(503, "uploads_unavailable", "Image uploads are not configured on this server.");
  }
  const type = (contentType ?? "").split(";")[0]!.trim().toLowerCase();
  if (!(COURSE_IMAGE_TYPES as readonly string[]).includes(type)) {
    throw new AppError(415, "unsupported_image", "Upload a PNG, JPEG, WebP, or GIF image.");
  }
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new AppError(400, "empty_upload", "The image was empty.");
  }
  if (body.length > maxBytes) {
    throw new AppError(
      413,
      "image_too_large",
      `Images must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`,
    );
  }
  if (!sniffImage(body, type)) {
    throw new AppError(415, "unsupported_image", "That file does not look like a valid image.");
  }
  return { type, buffer: body, ext: imageExtension(type)! };
}

export async function uploadCourseThumbnail(
  userId: string,
  courseId: string,
  contentType: string | undefined,
  body: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const image = readImage(contentType, body, COURSE_LIMITS.thumbnailBytesMax);
  const { url } = await uploadToR2({
    path: `courses/${course.id}/cover-${Date.now().toString(36)}.${image.ext}`,
    body: image.buffer,
    contentType: image.type,
  });
  await updateCourse(course.id, { thumbnailUrl: url, customThumbnail: true });
  return respond(userId, courseId);
}

export async function resetCourseThumbnail(userId: string, courseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const thumbnailUrl = await storeGeneratedThumbnail({
    courseId: course.id,
    title: course.title,
    level: course.level,
    accent: course.accent,
  });
  await updateCourse(course.id, { thumbnailUrl, customThumbnail: false });
  return respond(userId, courseId);
}

export async function uploadLessonAsset(
  userId: string,
  courseId: string,
  contentType: string | undefined,
  body: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const image = readImage(contentType, body, COURSE_LIMITS.assetBytesMax);
  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const { url } = await uploadToR2({
    path: `courses/${course.id}/assets/${name}.${image.ext}`,
    body: image.buffer,
    contentType: image.type,
  });
  return { url };
}

/* ---------------------------------- Modules --------------------------------- */

export async function createStudioModule(userId: string, courseId: string, input: unknown) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const body = asBody(input);
  const title = readText(body, "title", "Module title", {
    min: 1,
    max: COURSE_LIMITS.moduleTitleMax,
  });
  if (!title) {
    throw new AppError(400, "invalid_field", "Give the module a title.", { field: "title" });
  }
  const summary =
    readText(body, "summary", "Module summary", { max: COURSE_LIMITS.moduleSummaryMax }) ?? "";
  if (course.modules.length >= COURSE_LIMITS.modulesMax) {
    throw new AppError(409, "too_many_modules", `Courses can have up to ${COURSE_LIMITS.modulesMax} modules.`);
  }

  const created = await createModule({
    courseId: course.id,
    slug: uniqueSlug(
      slugify(title, "module"),
      course.modules.map((courseModule) => courseModule.slug),
    ),
    title,
    summary,
    sortOrder: (course.modules.at(-1)?.sortOrder ?? -1) + 1,
  });
  return { ...(await respond(userId, courseId)), createdId: created.id };
}

function findModule(course: StudioCourse, moduleId: string) {
  const courseModule = course.modules.find((item) => item.id === moduleId);
  if (!courseModule) {
    throw new AppError(404, "module_missing", "That module could not be found.");
  }
  return courseModule;
}

export async function updateStudioModule(
  userId: string,
  courseId: string,
  moduleId: string,
  input: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const courseModule = findModule(course, moduleId);
  const body = asBody(input);
  const title = readText(body, "title", "Module title", {
    min: 1,
    max: COURSE_LIMITS.moduleTitleMax,
  });
  const summary = readText(body, "summary", "Module summary", {
    max: COURSE_LIMITS.moduleSummaryMax,
  });

  const data: Parameters<typeof updateModule>[1] = {};
  if (title !== undefined) {
    data.title = title;
    if (title !== courseModule.title && !slugsFrozen(course)) {
      data.slug = uniqueSlug(
        slugify(title, "module"),
        course.modules.filter((item) => item.id !== moduleId).map((item) => item.slug),
      );
    }
  }
  if (summary !== undefined) data.summary = summary;
  if (Object.keys(data).length > 0) await updateModule(moduleId, data);
  return respond(userId, courseId);
}

export async function deleteStudioModule(userId: string, courseId: string, moduleId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  findModule(course, moduleId);
  await deleteModule(moduleId);
  await refreshEstimate(course.id);
  return respond(userId, courseId);
}

/* ---------------------------------- Lessons --------------------------------- */

function readMinutes(body: Body): number | undefined {
  if (!("estimatedMinutes" in body)) return undefined;
  const value = Number(body.estimatedMinutes);
  if (
    !Number.isInteger(value) ||
    value < COURSE_LIMITS.lessonMinutesMin ||
    value > COURSE_LIMITS.lessonMinutesMax
  ) {
    throw new AppError(
      400,
      "invalid_field",
      `Lesson time must be between ${COURSE_LIMITS.lessonMinutesMin} and ${COURSE_LIMITS.lessonMinutesMax} minutes.`,
      { field: "estimatedMinutes" },
    );
  }
  return value;
}

function readLessonFields(body: Body) {
  return {
    title: readText(body, "title", "Lesson title", { min: 1, max: COURSE_LIMITS.lessonTitleMax }),
    summary: readText(body, "summary", "Lesson summary", { max: COURSE_LIMITS.lessonSummaryMax }),
    content: readText(body, "content", "Lesson content", { max: COURSE_LIMITS.lessonContentMax }),
    estimatedMinutes: readMinutes(body),
  };
}

export async function createStudioLesson(
  userId: string,
  courseId: string,
  moduleId: string,
  input: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const courseModule = findModule(course, moduleId);
  const fields = readLessonFields(asBody(input));
  if (!fields.title) {
    throw new AppError(400, "invalid_field", "Give the lesson a title.", { field: "title" });
  }
  if (courseModule.lessons.length >= COURSE_LIMITS.lessonsPerModuleMax) {
    throw new AppError(
      409,
      "too_many_lessons",
      `Modules can have up to ${COURSE_LIMITS.lessonsPerModuleMax} lessons.`,
    );
  }

  const created = await createLesson({
    moduleId,
    slug: uniqueSlug(
      slugify(fields.title, "lesson"),
      courseModule.lessons.map((lesson) => lesson.slug),
    ),
    title: fields.title,
    summary: fields.summary ?? "",
    content: fields.content ?? "",
    estimatedMinutes: fields.estimatedMinutes ?? 15,
    sortOrder: (courseModule.lessons.at(-1)?.sortOrder ?? -1) + 1,
  });
  await refreshEstimate(course.id);
  return { ...(await respond(userId, courseId)), createdId: created.id };
}

function findLesson(course: StudioCourse, lessonId: string) {
  for (const courseModule of course.modules) {
    const lesson = courseModule.lessons.find((item) => item.id === lessonId);
    if (lesson) return { courseModule, lesson };
  }
  throw new AppError(404, "lesson_missing", "That lesson could not be found.");
}

/** Lean response: autosave fires often and the client owns the draft text. */
export async function updateStudioLesson(
  userId: string,
  courseId: string,
  lessonId: string,
  input: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const { courseModule, lesson } = findLesson(course, lessonId);
  const fields = readLessonFields(asBody(input));

  const data: Parameters<typeof updateLesson>[1] = {};
  if (fields.title !== undefined) {
    data.title = fields.title;
    if (fields.title !== lesson.title && !slugsFrozen(course)) {
      data.slug = uniqueSlug(
        slugify(fields.title, "lesson"),
        courseModule.lessons.filter((item) => item.id !== lessonId).map((item) => item.slug),
      );
    }
  }
  if (fields.summary !== undefined) data.summary = fields.summary;
  if (fields.content !== undefined) data.content = fields.content;
  if (fields.estimatedMinutes !== undefined) data.estimatedMinutes = fields.estimatedMinutes;

  const saved = Object.keys(data).length > 0 ? await updateLesson(lessonId, data) : lesson;
  if (fields.estimatedMinutes !== undefined) await refreshEstimate(course.id);
  return { lesson: lessonFields(saved) };
}

export async function deleteStudioLesson(userId: string, courseId: string, lessonId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  findLesson(course, lessonId);
  await deleteLesson(lessonId);
  await refreshEstimate(course.id);
  return respond(userId, courseId);
}

/* --------------------------------- Exercises -------------------------------- */

const DEFAULT_EXERCISE_TITLES: Record<ExerciseKind, string> = {
  task: "Practice task",
  link: "Share your work",
  text: "Explain it in your own words",
  quiz: "Knowledge check",
};

function quizId() {
  return randomBytes(4).toString("hex");
}

function blankQuestion(): QuizQuestion {
  return {
    id: quizId(),
    prompt: "",
    options: [
      { id: quizId(), text: "" },
      { id: quizId(), text: "" },
    ],
    correctOptionId: null,
    explanation: "",
  };
}

function fieldError(message: string, field: string): never {
  throw new AppError(400, "invalid_field", message, { field });
}

function readExerciseMinutes(body: Body): number | undefined {
  if (!("estimatedMinutes" in body)) return undefined;
  const value = Number(body.estimatedMinutes);
  if (
    !Number.isInteger(value) ||
    value < EXERCISE_LIMITS.minutesMin ||
    value > EXERCISE_LIMITS.minutesMax
  ) {
    fieldError(
      `Exercise time must be between ${EXERCISE_LIMITS.minutesMin} and ${EXERCISE_LIMITS.minutesMax} minutes.`,
      "estimatedMinutes",
    );
  }
  return value;
}

/** Empty rows are allowed while authoring; the checklist and learner view ignore them. */
function readRequirements(body: Body): string[] | undefined {
  if (!("requirements" in body)) return undefined;
  const raw = body.requirements;
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
    fieldError("Requirements must be a list of text.", "requirements");
  }
  const list = raw as string[];
  if (list.length > EXERCISE_LIMITS.requirementsMax) {
    fieldError(`Add up to ${EXERCISE_LIMITS.requirementsMax} requirements.`, "requirements");
  }
  if (list.some((item) => item.length > EXERCISE_LIMITS.requirementMax)) {
    fieldError(
      `Each requirement must be ${EXERCISE_LIMITS.requirementMax} characters or fewer.`,
      "requirements",
    );
  }
  return list;
}

function readQuestions(body: Body): QuizQuestion[] | undefined {
  if (!("questions" in body)) return undefined;
  const raw = body.questions;
  if (!Array.isArray(raw)) fieldError("Questions must be a list.", "questions");
  if (raw.length > EXERCISE_LIMITS.questionsMax) {
    fieldError(`Quizzes can have up to ${EXERCISE_LIMITS.questionsMax} questions.`, "questions");
  }

  const questionIds = new Set<string>();
  return raw.map((entry, index) => {
    const label = `Question ${index + 1}`;
    const item = (entry ?? {}) as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    if (!QUIZ_ID_PATTERN.test(id) || questionIds.has(id)) {
      fieldError(`${label} has an invalid id. Refresh and try again.`, "questions");
    }
    questionIds.add(id);

    const prompt = typeof item.prompt === "string" ? item.prompt : "";
    if (prompt.length > EXERCISE_LIMITS.questionPromptMax) {
      fieldError(
        `${label} must be ${EXERCISE_LIMITS.questionPromptMax} characters or fewer.`,
        "questions",
      );
    }
    const explanation = typeof item.explanation === "string" ? item.explanation : "";
    if (explanation.length > EXERCISE_LIMITS.explanationMax) {
      fieldError(
        `${label} explanation must be ${EXERCISE_LIMITS.explanationMax} characters or fewer.`,
        "questions",
      );
    }

    if (!Array.isArray(item.options) || item.options.length > EXERCISE_LIMITS.optionsMax) {
      fieldError(`${label} can have up to ${EXERCISE_LIMITS.optionsMax} answers.`, "questions");
    }
    const optionIds = new Set<string>();
    const options = (item.options as unknown[]).map((option) => {
      const value = (option ?? {}) as Record<string, unknown>;
      const optionId = typeof value.id === "string" ? value.id : "";
      const text = typeof value.text === "string" ? value.text : "";
      if (!QUIZ_ID_PATTERN.test(optionId) || optionIds.has(optionId)) {
        fieldError(`${label} has an invalid answer id. Refresh and try again.`, "questions");
      }
      if (text.length > EXERCISE_LIMITS.optionTextMax) {
        fieldError(
          `${label} answers must be ${EXERCISE_LIMITS.optionTextMax} characters or fewer.`,
          "questions",
        );
      }
      optionIds.add(optionId);
      return { id: optionId, text };
    });

    const correct = typeof item.correctOptionId === "string" ? item.correctOptionId : null;
    return {
      id,
      prompt,
      options,
      correctOptionId: correct && optionIds.has(correct) ? correct : null,
      explanation,
    };
  });
}

function readPassPercent(body: Body): number | undefined {
  if (!("passPercent" in body)) return undefined;
  const value = Number(body.passPercent);
  if (
    !Number.isInteger(value) ||
    value < EXERCISE_LIMITS.passPercentMin ||
    value > EXERCISE_LIMITS.passPercentMax
  ) {
    fieldError(
      `Pass mark must be between ${EXERCISE_LIMITS.passPercentMin}% and ${EXERCISE_LIMITS.passPercentMax}%.`,
      "passPercent",
    );
  }
  return value;
}

function findExercise(course: StudioCourse, exerciseId: string) {
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      const exercise = lesson.exercises.find((item) => item.id === exerciseId);
      if (exercise) return { lesson, exercise };
    }
  }
  throw new AppError(404, "exercise_missing", "That exercise could not be found.");
}

export async function createStudioExercise(
  userId: string,
  courseId: string,
  lessonId: string,
  input: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const { lesson } = findLesson(course, lessonId);
  const body = asBody(input);
  if (!isExerciseKind(body.kind)) {
    fieldError("Choose an exercise type.", "kind");
  }
  const kind = body.kind;
  const title =
    readText(body, "title", "Exercise title", { min: 1, max: EXERCISE_LIMITS.titleMax }) ??
    DEFAULT_EXERCISE_TITLES[kind];
  if (lesson.exercises.length >= EXERCISE_LIMITS.perLessonMax) {
    throw new AppError(
      409,
      "too_many_exercises",
      `Lessons can have up to ${EXERCISE_LIMITS.perLessonMax} exercises.`,
    );
  }

  const config: ExerciseConfig = {
    requirements: [],
    questions: kind === "quiz" ? [blankQuestion()] : [],
    passPercent: EXERCISE_LIMITS.passPercentDefault,
  };
  const created = await createExercise({
    lessonId,
    kind,
    title,
    config,
    estimatedMinutes: kind === "quiz" ? 5 : 15,
    sortOrder: (lesson.exercises.at(-1)?.sortOrder ?? -1) + 1,
  });
  await refreshEstimate(course.id);
  return { ...(await respond(userId, courseId)), createdId: created.id };
}

/** Lean response, like lessons: autosave fires often and the client owns the draft. */
export async function updateStudioExercise(
  userId: string,
  courseId: string,
  exerciseId: string,
  input: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const { exercise } = findExercise(course, exerciseId);
  const body = asBody(input);

  const title = readText(body, "title", "Exercise title", {
    min: 1,
    max: EXERCISE_LIMITS.titleMax,
  });
  const instructions = readText(body, "instructions", "Instructions", {
    max: EXERCISE_LIMITS.instructionsMax,
    markdown: true,
  });
  const hint = readText(body, "hint", "Hint", { max: EXERCISE_LIMITS.hintMax, markdown: true });
  const solution = readText(body, "solution", "Solution", {
    max: EXERCISE_LIMITS.solutionMax,
    markdown: true,
  });
  const estimatedMinutes = readExerciseMinutes(body);
  const requirements = readRequirements(body);
  const questions = readQuestions(body);
  const passPercent = readPassPercent(body);

  const data: Parameters<typeof updateExercise>[1] = {};
  if (title !== undefined) data.title = title;
  if (instructions !== undefined) data.instructions = instructions;
  if (hint !== undefined) data.hint = hint;
  if (solution !== undefined) data.solution = solution;
  if (estimatedMinutes !== undefined) data.estimatedMinutes = estimatedMinutes;
  if (requirements !== undefined || questions !== undefined || passPercent !== undefined) {
    const config = readExerciseConfig(exercise.config);
    data.config = {
      requirements: requirements ?? config.requirements,
      questions: questions ?? config.questions,
      passPercent: passPercent ?? config.passPercent,
    } satisfies ExerciseConfig;
  }

  const saved = Object.keys(data).length > 0 ? await updateExercise(exerciseId, data) : exercise;
  if (estimatedMinutes !== undefined) await refreshEstimate(course.id);
  return { exercise: exercisePayload(saved) };
}

export async function deleteStudioExercise(userId: string, courseId: string, exerciseId: string) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  findExercise(course, exerciseId);
  await deleteExercise(exerciseId);
  await refreshEstimate(course.id);
  return respond(userId, courseId);
}

export async function reorderStudioExercises(
  userId: string,
  courseId: string,
  lessonId: string,
  input: unknown,
) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const { lesson } = findLesson(course, lessonId);
  const raw = asBody(input).exerciseIds;
  const known = new Set(lesson.exercises.map((exercise) => exercise.id));
  if (
    !Array.isArray(raw) ||
    raw.length !== known.size ||
    new Set(raw).size !== raw.length ||
    raw.some((id) => typeof id !== "string" || !known.has(id))
  ) {
    throw new AppError(
      409,
      "outline_stale",
      "The exercises changed in another tab. Refresh and try again.",
    );
  }
  await reorderExercises(raw as string[]);
  return respond(userId, courseId);
}

/* ---------------------------------- Outline --------------------------------- */

export async function updateStudioOutline(userId: string, courseId: string, input: unknown) {
  const course = await loadOwnedCourse(userId, courseId);
  assertEditable(course);
  const body = asBody(input);
  const raw = body.modules;
  if (!Array.isArray(raw)) {
    throw new AppError(400, "invalid_outline", "Outline must list modules.");
  }

  const outline = raw.map((entry) => {
    const item = entry as { id?: unknown; lessonIds?: unknown };
    if (
      typeof item?.id !== "string" ||
      !Array.isArray(item.lessonIds) ||
      item.lessonIds.some((id) => typeof id !== "string")
    ) {
      throw new AppError(400, "invalid_outline", "Outline entries need a module id and lesson ids.");
    }
    return { id: item.id, lessonIds: item.lessonIds as string[] };
  });

  const knownModules = new Set(course.modules.map((courseModule) => courseModule.id));
  const lessonsById = new Map(
    course.modules.flatMap((courseModule) =>
      courseModule.lessons.map((lesson) => [lesson.id, { lesson, moduleId: courseModule.id }] as const),
    ),
  );
  const seenModules = new Set(outline.map((item) => item.id));
  const seenLessons = outline.flatMap((item) => item.lessonIds);
  if (
    seenModules.size !== outline.length ||
    seenModules.size !== knownModules.size ||
    [...seenModules].some((id) => !knownModules.has(id)) ||
    new Set(seenLessons).size !== seenLessons.length ||
    seenLessons.length !== lessonsById.size ||
    seenLessons.some((id) => !lessonsById.has(id))
  ) {
    throw new AppError(
      409,
      "outline_stale",
      "The outline changed in another tab. Refresh and try again.",
    );
  }
  for (const item of outline) {
    if (item.lessonIds.length > COURSE_LIMITS.lessonsPerModuleMax) {
      throw new AppError(
        409,
        "too_many_lessons",
        `Modules can have up to ${COURSE_LIMITS.lessonsPerModuleMax} lessons.`,
      );
    }
  }

  const plan: OutlinePlan = { modules: [], lessons: [] };
  outline.forEach((item, moduleIndex) => {
    plan.modules.push({ id: item.id, sortOrder: moduleIndex });
    const stayingSlugs = item.lessonIds
      .filter((id) => lessonsById.get(id)!.moduleId === item.id)
      .map((id) => lessonsById.get(id)!.lesson.slug);
    const taken = new Set(stayingSlugs);
    item.lessonIds.forEach((lessonId, lessonIndex) => {
      const { lesson, moduleId } = lessonsById.get(lessonId)!;
      const moved = moduleId !== item.id;
      let slug = lesson.slug;
      if (moved) {
        slug = uniqueSlug(lesson.slug, taken);
        taken.add(slug);
      }
      plan.lessons.push({ id: lessonId, moduleId: item.id, sortOrder: lessonIndex, slug, moved });
    });
  });

  await applyOutline(plan);
  return respond(userId, courseId);
}

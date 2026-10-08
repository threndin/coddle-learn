import {
  EXERCISE_COMPLETE_POINTS,
  EXERCISE_LIMITS,
  isExerciseDone,
  isHttpUrl,
  quizPassed,
  readExerciseConfig,
  type ExerciseConfig,
  type ExerciseSubmissionStatus,
} from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import {
  deleteExerciseSubmission,
  flattenLessons,
  incrementUserPoints,
  upsertExerciseSubmission,
  type CourseExerciseRow,
} from "./courses.repository.js";
import {
  deriveLessonStatuses,
  ensureEnrollment,
  getCourseDetail,
  loadProgressState,
  loadVisibleCourse,
  syncCourseCompletion,
} from "./courses.service.js";

type Body = Record<string, unknown>;

type Graded = {
  status: ExerciseSubmissionStatus;
  response: Prisma.InputJsonValue;
  score: number | null;
};

function asBody(input: unknown): Body {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "invalid_submission", "Submission details were missing.");
  }
  return input as Body;
}

function invalid(message: string, field?: string): never {
  throw new AppError(400, "invalid_submission", message, field ? { field } : undefined);
}

function readOptionalText(body: Body, key: string, max: number, label: string): string {
  const raw = body[key];
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "string") invalid(`${label} must be text.`, key);
  const value = raw.trim();
  if (value.length > max) invalid(`${label} must be ${max.toLocaleString()} characters or fewer.`, key);
  return value;
}

/** Learners tick every requirement before a task, link, or text exercise counts. */
function readChecked(body: Body, requirements: string[]): number[] {
  if (requirements.length === 0) return [];
  const raw = body.checked;
  const checked = Array.isArray(raw)
    ? raw.filter((item): item is number => Number.isInteger(item))
    : [];
  const all = requirements.every((_, index) => checked.includes(index));
  if (!all) invalid("Tick every requirement before submitting.", "checked");
  return requirements.map((_, index) => index);
}

function gradeQuiz(config: ExerciseConfig, body: Body): Graded {
  const raw = body.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    invalid("Answer every question before checking.", "answers");
  }
  const answers = raw as Record<string, unknown>;
  const questions = config.questions;
  if (questions.length === 0) invalid("This quiz has no questions yet.");

  const picked: Record<string, string> = {};
  const results: Record<string, boolean> = {};
  let correct = 0;
  for (const question of questions) {
    const choice = answers[question.id];
    const option =
      typeof choice === "string"
        ? question.options.find((item) => item.id === choice && item.text.trim())
        : undefined;
    if (!option) invalid("Answer every question before checking.", "answers");
    picked[question.id] = option.id;
    results[question.id] = option.id === question.correctOptionId;
    if (results[question.id]) correct += 1;
  }

  const score = Math.round((correct / questions.length) * 100);
  return {
    status: quizPassed(correct, questions.length, config.passPercent) ? "completed" : "attempted",
    response: { answers: picked, results, correct, total: questions.length },
    score,
  };
}

function grade(exercise: CourseExerciseRow, body: Body): Graded {
  const config = readExerciseConfig(exercise.config);
  if (exercise.kind === "quiz") return gradeQuiz(config, body);

  const checked = readChecked(
    body,
    config.requirements.filter((item) => item.trim()),
  );

  switch (exercise.kind) {
    case "task":
      return { status: "completed", response: { checked }, score: null };
    case "link": {
      const url = readOptionalText(body, "url", EXERCISE_LIMITS.urlMax, "Link");
      if (!url || !isHttpUrl(url)) invalid("Enter a full link starting with https://", "url");
      const note = readOptionalText(body, "note", EXERCISE_LIMITS.noteMax, "Note");
      return { status: "submitted", response: { checked, url, note }, score: null };
    }
    case "text": {
      const answer = readOptionalText(body, "answer", EXERCISE_LIMITS.answerMax, "Answer");
      if (answer.length < EXERCISE_LIMITS.answerMin) {
        invalid(`Write at least ${EXERCISE_LIMITS.answerMin} characters.`, "answer");
      }
      return { status: "submitted", response: { checked, answer }, score: null };
    }
    default:
      throw new AppError(409, "exercise_unsupported", "This exercise type is not supported yet.");
  }
}

async function loadExercise(userId: string, slug: string, exerciseId: string) {
  const visible = await loadVisibleCourse(userId, slug);
  const lessons = flattenLessons(visible.course);
  const lessonIndex = lessons.findIndex((lesson) =>
    lesson.exercises.some((exercise) => exercise.id === exerciseId),
  );
  const lesson = lessons[lessonIndex];
  const exercise = lesson?.exercises.find((item) => item.id === exerciseId);
  if (!lesson || !exercise) {
    throw new AppError(404, "exercise_missing", "That exercise could not be found.");
  }
  return { ...visible, lessons, lessonIndex, exercise };
}

export async function submitExercise(
  userId: string,
  slug: string,
  exerciseId: string,
  input: unknown,
) {
  const body = asBody(input);
  const { course, enrollment: current, lessons, lessonIndex, exercise } = await loadExercise(
    userId,
    slug,
    exerciseId,
  );
  const enrollment = await ensureEnrollment(userId, course, current);

  const state = await loadProgressState(userId, lessons);
  const { statuses } = deriveLessonStatuses(lessons, state.lessons);
  if (statuses[lessonIndex] === "locked") {
    throw new AppError(
      400,
      "exercise_locked",
      "Finish the earlier lessons before submitting this exercise.",
    );
  }

  const existing = state.exercises.get(exercise.id);
  if (exercise.kind === "quiz" && existing?.status === "completed") {
    throw new AppError(409, "exercise_passed", "You already passed this quiz.");
  }

  const graded = grade(exercise, body);
  const done = isExerciseDone(graded.status);
  let pointsAwarded = existing?.pointsAwarded ?? 0;
  let newlyAwarded = 0;
  if (done && pointsAwarded <= 0) {
    pointsAwarded = EXERCISE_COMPLETE_POINTS;
    newlyAwarded = EXERCISE_COMPLETE_POINTS;
    await incrementUserPoints(userId, EXERCISE_COMPLETE_POINTS);
  }

  await upsertExerciseSubmission(userId, exercise.id, { ...graded, pointsAwarded });

  const courseCompleteBonus = await syncCourseCompletion(userId, course, enrollment);
  const detail = await getCourseDetail(userId, slug);
  return {
    ...detail,
    result: { status: graded.status, score: graded.score },
    pointsAwarded: newlyAwarded,
    courseCompleteBonus,
  };
}

export async function resetExercise(userId: string, slug: string, exerciseId: string) {
  const { course, enrollment, lessons, exercise } = await loadExercise(userId, slug, exerciseId);
  if (!enrollment) {
    throw new AppError(400, "exercise_not_started", "You have not started this exercise.");
  }
  const state = await loadProgressState(userId, lessons);
  const existing = state.exercises.get(exercise.id);
  if (!existing) {
    throw new AppError(400, "exercise_not_started", "You have not started this exercise.");
  }

  if (existing.pointsAwarded) await incrementUserPoints(userId, -existing.pointsAwarded);
  await deleteExerciseSubmission(userId, exercise.id);

  await syncCourseCompletion(userId, course, enrollment);
  return getCourseDetail(userId, slug);
}

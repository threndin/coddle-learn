import {
  ASSESSMENT_LIMITS,
  ASSESSMENT_PASS_POINTS,
  TRUE_FALSE_OPTIONS,
  assessmentPassed,
  assessmentScorePercent,
  isAssessmentQuestionKind,
  isExerciseDone,
  readAssessmentQuestionConfig,
  shortAnswerMatches,
  type AssessmentQuestionConfig,
} from "@coddle/shared";
import type { AssessmentAttempt } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import {
  canViewCourse,
  findCourseBySlug,
  findUserCourse,
  flattenExercises,
  flattenLessons,
  listUserCourses,
  type CourseWithContent,
} from "../courses/courses.repository.js";
import {
  ensureEnrollment,
  loadProgressState,
  syncCourseCompletion,
} from "../courses/courses.service.js";
import {
  issueAssessmentCredential,
  type IssuedCredential,
} from "../credentials/credentials.service.js";
import {
  createAttempt,
  findAssessmentById,
  findAttempt,
  findInProgressAttempt,
  hasPassedAssessment,
  incrementUserPoints,
  listAssessmentsForPublishedCourses,
  listAttemptsForAssessment,
  listAttemptsForUser,
  submitAttempt,
  type AssessmentQuestionRow,
  type AssessmentWithContent,
} from "./assessments.repository.js";

type Body = Record<string, unknown>;

function asBody(input: unknown): Body {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "invalid_submission", "Submission details were missing.");
  }
  return input as Body;
}

function invalid(message: string, field?: string): never {
  throw new AppError(400, "invalid_submission", message, field ? { field } : undefined);
}

function totalPoints(questions: AssessmentQuestionRow[]) {
  return questions.reduce((sum, question) => sum + question.points, 0);
}

function questionPublic(
  question: AssessmentQuestionRow,
  reveal: boolean,
) {
  const config = readAssessmentQuestionConfig(question.config);
  const kind = isAssessmentQuestionKind(question.kind) ? question.kind : "multiple_choice";
  const options =
    kind === "true_false" && config.options.length === 0
      ? [...TRUE_FALSE_OPTIONS]
      : config.options.filter((option) => option.text.trim());

  return {
    id: question.id,
    kind,
    prompt: question.prompt,
    points: question.points,
    options: kind === "short_answer" ? [] : options.map((option) => ({ id: option.id, text: option.text })),
    correctOptionId: reveal && kind !== "short_answer" ? config.correctOptionId : null,
    acceptedAnswers: reveal && kind === "short_answer" ? config.acceptedAnswers : null,
    explanation: reveal ? question.explanation : null,
  };
}

function attemptSummary(attempt: AssessmentAttempt) {
  return {
    id: attempt.id,
    status: attempt.status,
    score: attempt.score,
    passed: attempt.passed,
    pointsEarned: attempt.pointsEarned,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
  };
}

function attemptDetail(
  attempt: AssessmentAttempt,
  assessment: AssessmentWithContent,
  reveal: boolean,
) {
  const results =
    reveal && attempt.results && typeof attempt.results === "object" && !Array.isArray(attempt.results)
      ? (attempt.results as Record<string, boolean>)
      : null;
  return {
    ...attemptSummary(attempt),
    answers: attempt.answers,
    results,
    questions: assessment.questions.map((question) => questionPublic(question, reveal)),
  };
}

function assessmentMeta(assessment: AssessmentWithContent) {
  return {
    id: assessment.id,
    title: assessment.title,
    summary: assessment.summary,
    passPercent: assessment.passPercent,
    timeLimitMinutes: assessment.timeLimitMinutes,
    questionCount: assessment.questions.length,
    totalPoints: totalPoints(assessment.questions),
    course: {
      slug: assessment.course.slug,
      title: assessment.course.title,
      summary: assessment.course.summary,
      level: assessment.course.level,
      thumbnailUrl: assessment.course.thumbnailUrl,
    },
  };
}

async function lessonsReady(userId: string, course: CourseWithContent) {
  const lessons = flattenLessons(course);
  const state = await loadProgressState(userId, lessons);
  const lessonsDone = lessons.every((lesson) => {
    const status = state.lessons.get(lesson.id)?.status;
    return status === "completed" || status === "skipped";
  });
  const exercisesDone = flattenExercises(lessons).every((exercise) =>
    isExerciseDone(state.exercises.get(exercise.id)?.status),
  );
  return lessonsDone && exercisesDone;
}

async function loadVisibleAssessment(userId: string, assessmentId: string) {
  const assessment = await findAssessmentById(assessmentId);
  if (!assessment) {
    throw new AppError(404, "assessment_missing", "That assessment could not be found.");
  }
  const enrollment = await findUserCourse(userId, assessment.courseId);
  if (!canViewCourse(assessment.course, userId, Boolean(enrollment))) {
    throw new AppError(404, "assessment_missing", "That assessment could not be found.");
  }
  return { assessment, enrollment };
}

export async function getAssessmentCatalog(userId: string) {
  const [assessments, enrollments] = await Promise.all([
    listAssessmentsForPublishedCourses(),
    listUserCourses(userId),
  ]);
  const enrollmentByCourseId = new Map(enrollments.map((row) => [row.courseId, row]));
  const attempts = await listAttemptsForUser(
    userId,
    assessments.map((assessment) => assessment.id),
  );
  const attemptsByAssessment = new Map<string, AssessmentAttempt[]>();
  for (const attempt of attempts) {
    const list = attemptsByAssessment.get(attempt.assessmentId) ?? [];
    list.push(attempt);
    attemptsByAssessment.set(attempt.assessmentId, list);
  }

  const items = await Promise.all(
    assessments.map(async (assessment) => {
      const enrollment = enrollmentByCourseId.get(assessment.courseId) ?? null;
      const history = attemptsByAssessment.get(assessment.id) ?? [];
      const best = history
        .filter((attempt) => attempt.status === "submitted" && attempt.score !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      const latest = history[0] ?? null;
      const inProgress = history.find((attempt) => attempt.status === "in_progress") ?? null;
      const ready = enrollment ? await lessonsReady(userId, enrollment.course) : false;
      const passed = history.some((attempt) => attempt.passed);

      return {
        ...assessmentMeta(assessment),
        enrolled: Boolean(enrollment),
        courseCompleted: Boolean(enrollment?.completedAt),
        lessonsReady: ready,
        canStart: Boolean(enrollment) && ready,
        passed,
        bestScore: best?.score ?? null,
        attemptCount: history.filter((attempt) => attempt.status === "submitted").length,
        inProgressAttemptId: inProgress?.id ?? null,
        latestAttempt: latest ? attemptSummary(latest) : null,
      };
    }),
  );

  return { assessments: items };
}

export async function getAssessmentDetail(userId: string, assessmentId: string) {
  const { assessment, enrollment } = await loadVisibleAssessment(userId, assessmentId);
  if (assessment.course.status !== "published" && assessment.course.createdByUserId !== userId) {
    throw new AppError(404, "assessment_missing", "That assessment could not be found.");
  }

  const course = await findCourseBySlug(assessment.course.slug);
  if (!course) {
    throw new AppError(404, "assessment_missing", "That assessment could not be found.");
  }

  const history = await listAttemptsForAssessment(userId, assessment.id);
  const inProgress = history.find((attempt) => attempt.status === "in_progress") ?? null;
  const passed = history.some((attempt) => attempt.passed);
  const ready = enrollment ? await lessonsReady(userId, course) : false;
  const best = history
    .filter((attempt) => attempt.status === "submitted" && attempt.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  return {
    assessment: {
      ...assessmentMeta(assessment),
      enrolled: Boolean(enrollment),
      lessonsReady: ready,
      canStart: Boolean(enrollment) && ready,
      passed,
      bestScore: best?.score ?? null,
      attemptCount: history.filter((attempt) => attempt.status === "submitted").length,
      inProgressAttemptId: inProgress?.id ?? null,
      attempts: history.map(attemptSummary),
    },
  };
}

export async function startAssessmentAttempt(userId: string, assessmentId: string) {
  const { assessment, enrollment: current } = await loadVisibleAssessment(userId, assessmentId);
  const course = await findCourseBySlug(assessment.course.slug);
  if (!course || course.status !== "published") {
    throw new AppError(409, "assessment_unavailable", "This assessment is not available yet.");
  }
  if (assessment.questions.length === 0) {
    throw new AppError(409, "assessment_empty", "This assessment has no questions yet.");
  }

  const enrollment = await ensureEnrollment(userId, course, current);
  if (!(await lessonsReady(userId, course))) {
    throw new AppError(
      400,
      "assessment_locked",
      "Finish every lesson and exercise in the course before taking the final assessment.",
    );
  }

  const existing = await findInProgressAttempt(userId, assessment.id);
  if (existing) {
    return {
      attempt: attemptDetail(existing, assessment, false),
      assessment: assessmentMeta(assessment),
    };
  }

  if (await hasPassedAssessment(userId, assessment.id)) {
    throw new AppError(
      409,
      "assessment_passed",
      "You already passed this assessment. Review your past attempts from the results page.",
    );
  }

  const attempt = await createAttempt(userId, assessment.id);
  void enrollment;
  return {
    attempt: attemptDetail(attempt, assessment, false),
    assessment: assessmentMeta(assessment),
  };
}

function gradeQuestion(
  question: AssessmentQuestionRow,
  answer: unknown,
): { correct: boolean; recorded: string } {
  const config = readAssessmentQuestionConfig(question.config);
  const kind = isAssessmentQuestionKind(question.kind) ? question.kind : "multiple_choice";

  if (kind === "short_answer") {
    if (typeof answer !== "string") invalid("Answer every question before submitting.", "answers");
    const recorded = answer.trim();
    if (!recorded) invalid("Answer every question before submitting.", "answers");
    if (recorded.length > ASSESSMENT_LIMITS.acceptedAnswerMax) {
      invalid(
        `Short answers must be ${ASSESSMENT_LIMITS.acceptedAnswerMax} characters or fewer.`,
        "answers",
      );
    }
    return {
      correct: shortAnswerMatches(recorded, config.acceptedAnswers),
      recorded,
    };
  }

  if (typeof answer !== "string") invalid("Answer every question before submitting.", "answers");
  const options =
    kind === "true_false" && config.options.length === 0
      ? [...TRUE_FALSE_OPTIONS]
      : config.options;
  const option = options.find((item) => item.id === answer && item.text.trim());
  if (!option) invalid("Answer every question before submitting.", "answers");
  return {
    correct: option.id === config.correctOptionId,
    recorded: option.id,
  };
}

export async function submitAssessmentAttempt(
  userId: string,
  assessmentId: string,
  attemptId: string,
  input: unknown,
) {
  const body = asBody(input);
  const { assessment, enrollment: current } = await loadVisibleAssessment(userId, assessmentId);
  const course = await findCourseBySlug(assessment.course.slug);
  if (!course) {
    throw new AppError(404, "assessment_missing", "That assessment could not be found.");
  }
  const enrollment = await ensureEnrollment(userId, course, current);

  const attempt = await findAttempt(userId, attemptId);
  if (!attempt || attempt.assessmentId !== assessment.id) {
    throw new AppError(404, "attempt_missing", "That attempt could not be found.");
  }
  if (attempt.status !== "in_progress") {
    throw new AppError(409, "attempt_closed", "This attempt was already submitted.");
  }

  const raw = body.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    invalid("Answer every question before submitting.", "answers");
  }
  const answersIn = raw as Record<string, unknown>;

  const recorded: Record<string, string> = {};
  const results: Record<string, boolean> = {};
  let earned = 0;
  for (const question of assessment.questions) {
    const graded = gradeQuestion(question, answersIn[question.id]);
    recorded[question.id] = graded.recorded;
    results[question.id] = graded.correct;
    if (graded.correct) earned += question.points;
  }

  const points = totalPoints(assessment.questions);
  const score = assessmentScorePercent(earned, points);
  const passed = assessmentPassed(earned, points, assessment.passPercent);

  const firstPass = passed && !(await hasPassedAssessment(userId, assessment.id));
  let pointsAwarded = 0;
  if (firstPass) {
    pointsAwarded = ASSESSMENT_PASS_POINTS;
    await incrementUserPoints(userId, ASSESSMENT_PASS_POINTS);
  }

  const submitted = await submitAttempt(attempt.id, {
    score,
    passed,
    answers: recorded,
    results,
    pointsEarned: earned,
  });

  let credential: IssuedCredential | null = null;
  if (firstPass) {
    credential = await issueAssessmentCredential({
      userId,
      assessmentId: assessment.id,
      assessmentAttemptId: submitted.id,
      assessmentTitle: assessment.title,
      courseTitle: assessment.course.title,
      summary: assessment.summary || undefined,
    });
  }

  const courseCompleteBonus = await syncCourseCompletion(userId, course, enrollment);

  return {
    attempt: attemptDetail(submitted, assessment, true),
    assessment: assessmentMeta(assessment),
    pointsAwarded,
    courseCompleteBonus,
    credential,
  };
}

export async function getAssessmentAttempt(
  userId: string,
  assessmentId: string,
  attemptId: string,
) {
  const { assessment } = await loadVisibleAssessment(userId, assessmentId);
  const attempt = await findAttempt(userId, attemptId);
  if (!attempt || attempt.assessmentId !== assessment.id) {
    throw new AppError(404, "attempt_missing", "That attempt could not be found.");
  }
  const reveal = attempt.status === "submitted";
  return {
    attempt: attemptDetail(attempt, assessment, reveal),
    assessment: assessmentMeta(assessment),
  };
}

/** Studio / course payloads: full question keys for the creator. */
export function studioAssessmentPayload(assessment: AssessmentWithContent | null) {
  if (!assessment) return null;
  return {
    id: assessment.id,
    title: assessment.title,
    summary: assessment.summary,
    passPercent: assessment.passPercent,
    timeLimitMinutes: assessment.timeLimitMinutes,
    questions: assessment.questions.map((question) => {
      const config = readAssessmentQuestionConfig(question.config);
      const kind = isAssessmentQuestionKind(question.kind) ? question.kind : "multiple_choice";
      return {
        id: question.id,
        kind,
        prompt: question.prompt,
        explanation: question.explanation,
        points: question.points,
        options:
          kind === "true_false" && config.options.length === 0
            ? [...TRUE_FALSE_OPTIONS]
            : config.options,
        correctOptionId: config.correctOptionId,
        acceptedAnswers: config.acceptedAnswers,
      };
    }),
    updatedAt: assessment.updatedAt.toISOString(),
  };
}

export type { AssessmentQuestionConfig };

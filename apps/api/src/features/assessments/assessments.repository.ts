import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const questionOrder = { sortOrder: "asc" as const };

const assessmentInclude = {
  questions: { orderBy: questionOrder },
  course: {
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      level: true,
      status: true,
      thumbnailUrl: true,
      createdByUserId: true,
    },
  },
} satisfies Prisma.AssessmentInclude;

export type AssessmentWithContent = Prisma.AssessmentGetPayload<{
  include: typeof assessmentInclude;
}>;

export type AssessmentQuestionRow = AssessmentWithContent["questions"][number];

export async function findAssessmentById(id: string): Promise<AssessmentWithContent | null> {
  return prisma.assessment.findUnique({
    where: { id },
    include: assessmentInclude,
  });
}

export async function findAssessmentByCourseId(
  courseId: string,
): Promise<AssessmentWithContent | null> {
  return prisma.assessment.findUnique({
    where: { courseId },
    include: assessmentInclude,
  });
}

export async function listAssessmentsForPublishedCourses() {
  return prisma.assessment.findMany({
    where: { course: { status: "published" } },
    include: assessmentInclude,
    orderBy: { course: { sortOrder: "asc" } },
  });
}

export async function listAttemptsForUser(userId: string, assessmentIds: string[]) {
  if (assessmentIds.length === 0) return [];
  return prisma.assessmentAttempt.findMany({
    where: { userId, assessmentId: { in: assessmentIds } },
    orderBy: { startedAt: "desc" },
  });
}

export async function listAttemptsForAssessment(userId: string, assessmentId: string) {
  return prisma.assessmentAttempt.findMany({
    where: { userId, assessmentId },
    orderBy: { startedAt: "desc" },
  });
}

export async function findAttempt(userId: string, attemptId: string) {
  return prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
  });
}

export async function findInProgressAttempt(userId: string, assessmentId: string) {
  return prisma.assessmentAttempt.findFirst({
    where: { userId, assessmentId, status: "in_progress" },
    orderBy: { startedAt: "desc" },
  });
}

export async function hasPassedAssessment(userId: string, assessmentId: string) {
  const row = await prisma.assessmentAttempt.findFirst({
    where: { userId, assessmentId, status: "submitted", passed: true },
    select: { id: true },
  });
  return Boolean(row);
}

export async function createAttempt(userId: string, assessmentId: string) {
  return prisma.assessmentAttempt.create({
    data: {
      userId,
      assessmentId,
      status: "in_progress",
      answers: {},
    },
  });
}

export async function submitAttempt(
  attemptId: string,
  data: {
    score: number;
    passed: boolean;
    answers: Prisma.InputJsonValue;
    results: Prisma.InputJsonValue;
    pointsEarned: number;
  },
) {
  return prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: {
      status: "submitted",
      score: data.score,
      passed: data.passed,
      answers: data.answers,
      results: data.results,
      pointsEarned: data.pointsEarned,
      submittedAt: new Date(),
    },
  });
}

export async function upsertAssessment(
  courseId: string,
  data: {
    title: string;
    summary: string;
    passPercent: number;
    timeLimitMinutes: number | null;
  },
) {
  return prisma.assessment.upsert({
    where: { courseId },
    create: { courseId, ...data },
    update: data,
    include: assessmentInclude,
  });
}

export async function replaceQuestions(
  assessmentId: string,
  questions: Array<{
    kind: string;
    prompt: string;
    explanation: string;
    points: number;
    sortOrder: number;
    config: Prisma.InputJsonValue;
  }>,
) {
  await prisma.$transaction([
    prisma.assessmentQuestion.deleteMany({ where: { assessmentId } }),
    prisma.assessmentQuestion.createMany({
      data: questions.map((question) => ({
        assessmentId,
        kind: question.kind,
        prompt: question.prompt,
        explanation: question.explanation,
        points: question.points,
        sortOrder: question.sortOrder,
        config: question.config,
      })),
    }),
  ]);
  return prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: assessmentInclude,
  });
}

export async function deleteAssessment(courseId: string) {
  return prisma.assessment.deleteMany({ where: { courseId } });
}


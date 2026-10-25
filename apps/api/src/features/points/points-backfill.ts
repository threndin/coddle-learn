import {
  ASSESSMENT_PASS_POINT_REASON,
  ASSESSMENT_PASS_POINTS,
  COURSE_COMPLETE_POINT_REASON,
  COURSE_COMPLETE_POINTS,
  EXERCISE_COMPLETE_POINT_REASON,
  LESSON_COMPLETE_POINT_REASON,
  ONBOARDING_POINT_REASON,
  ONBOARDING_POINTS,
  PROJECT_SUBMIT_POINT_REASON,
  ROADMAP_COMPLETE_POINT_REASON,
  ROADMAP_COMPLETE_POINTS,
  STEP_COMPLETE_POINT_REASON,
} from "@coddle/shared";
import { prisma } from "../../shared/db.js";
import {
  listPointEventKeys,
  recordHistoricalPointEvents,
  type HistoricalPointEvent,
} from "./points.repository.js";

const BACKFILL_REASONS = [
  ONBOARDING_POINT_REASON,
  LESSON_COMPLETE_POINT_REASON,
  COURSE_COMPLETE_POINT_REASON,
  EXERCISE_COMPLETE_POINT_REASON,
  ASSESSMENT_PASS_POINT_REASON,
  STEP_COMPLETE_POINT_REASON,
  ROADMAP_COMPLETE_POINT_REASON,
  PROJECT_SUBMIT_POINT_REASON,
] as const;

const BATCH = 400;

function eventKey(reason: string, refType: string | null, refId: string | null) {
  return `${reason}:${refType ?? ""}:${refId ?? ""}`;
}

function firstPassByAssessment(
  rows: Array<{ userId: string; assessmentId: string; submittedAt: Date | null }>,
) {
  const seen = new Set<string>();
  const first: typeof rows = [];
  for (const row of rows) {
    const key = `${row.userId}:${row.assessmentId}`;
    if (seen.has(key) || !row.submittedAt) continue;
    seen.add(key);
    first.push(row);
  }
  return first;
}

async function collectMissingEvents(seen: Set<string>): Promise<HistoricalPointEvent[]> {
  const events: HistoricalPointEvent[] = [];

  const [
    onboarded,
    lessons,
    courses,
    exercises,
    attempts,
    steps,
    roadmaps,
    projects,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { onboardingCompletedAt: { not: null } },
      select: { id: true, onboardingCompletedAt: true },
    }),
    prisma.userLessonProgress.findMany({
      where: { pointsAwarded: { gt: 0 } },
      select: { userId: true, lessonId: true, pointsAwarded: true, createdAt: true, updatedAt: true },
    }),
    prisma.userCourse.findMany({
      where: { completedAt: { not: null } },
      select: { userId: true, courseId: true, completedAt: true },
    }),
    prisma.userExerciseSubmission.findMany({
      where: { pointsAwarded: { gt: 0 } },
      select: {
        userId: true,
        exerciseId: true,
        pointsAwarded: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.assessmentAttempt.findMany({
      where: { status: "submitted", passed: true, submittedAt: { not: null } },
      orderBy: { submittedAt: "asc" },
      select: { userId: true, assessmentId: true, submittedAt: true },
    }),
    prisma.userStepProgress.findMany({
      where: { pointsAwarded: { gt: 0 } },
      select: { userId: true, stepId: true, pointsAwarded: true, createdAt: true, updatedAt: true },
    }),
    prisma.userRoadmap.findMany({
      where: { completedAt: { not: null } },
      select: { userId: true, roadmapId: true, completedAt: true },
    }),
    prisma.projectSubmission.findMany({
      where: { pointsAwarded: { gt: 0 }, submittedAt: { not: null } },
      select: { userId: true, projectId: true, pointsAwarded: true, submittedAt: true },
    }),
  ]);

  function push(event: HistoricalPointEvent) {
    const key = eventKey(event.reason, event.refType ?? null, event.refId ?? null);
    if (seen.has(key) || event.amount === 0) return;
    seen.add(key);
    events.push(event);
  }

  for (const user of onboarded) {
    if (!user.onboardingCompletedAt) continue;
    push({
      userId: user.id,
      amount: ONBOARDING_POINTS,
      reason: ONBOARDING_POINT_REASON,
      refType: "user",
      refId: user.id,
      createdAt: user.onboardingCompletedAt,
    });
  }

  for (const row of lessons) {
    push({
      userId: row.userId,
      amount: row.pointsAwarded,
      reason: LESSON_COMPLETE_POINT_REASON,
      refType: "lesson",
      refId: row.lessonId,
      createdAt: row.updatedAt ?? row.createdAt,
    });
  }

  for (const row of courses) {
    if (!row.completedAt) continue;
    push({
      userId: row.userId,
      amount: COURSE_COMPLETE_POINTS,
      reason: COURSE_COMPLETE_POINT_REASON,
      refType: "course",
      refId: row.courseId,
      createdAt: row.completedAt,
    });
  }

  for (const row of exercises) {
    push({
      userId: row.userId,
      amount: row.pointsAwarded,
      reason: EXERCISE_COMPLETE_POINT_REASON,
      refType: "exercise",
      refId: row.exerciseId,
      createdAt: row.updatedAt ?? row.createdAt,
    });
  }

  for (const row of firstPassByAssessment(attempts)) {
    if (!row.submittedAt) continue;
    push({
      userId: row.userId,
      amount: ASSESSMENT_PASS_POINTS,
      reason: ASSESSMENT_PASS_POINT_REASON,
      refType: "assessment",
      refId: row.assessmentId,
      createdAt: row.submittedAt,
    });
  }

  for (const row of steps) {
    push({
      userId: row.userId,
      amount: row.pointsAwarded,
      reason: STEP_COMPLETE_POINT_REASON,
      refType: "roadmap_step",
      refId: row.stepId,
      createdAt: row.updatedAt ?? row.createdAt,
    });
  }

  for (const row of roadmaps) {
    if (!row.completedAt) continue;
    push({
      userId: row.userId,
      amount: ROADMAP_COMPLETE_POINTS,
      reason: ROADMAP_COMPLETE_POINT_REASON,
      refType: "roadmap",
      refId: row.roadmapId,
      createdAt: row.completedAt,
    });
  }

  for (const row of projects) {
    if (!row.submittedAt) continue;
    push({
      userId: row.userId,
      amount: row.pointsAwarded,
      reason: PROJECT_SUBMIT_POINT_REASON,
      refType: "project",
      refId: row.projectId,
      createdAt: row.submittedAt,
    });
  }

  return events;
}

/** Reconstruct missing ledger rows from current awards. Does not change balances. */
export async function backfillPointEvents(): Promise<{ inserted: number; scanned: number }> {
  const existing = await listPointEventKeys([...BACKFILL_REASONS]);
  const seen = new Set(
    existing.map((row) => eventKey(row.reason, row.refType, row.refId)),
  );
  const missing = await collectMissingEvents(seen);
  let inserted = 0;
  for (let index = 0; index < missing.length; index += BATCH) {
    inserted += await recordHistoricalPointEvents(missing.slice(index, index + BATCH));
  }
  return { inserted, scanned: missing.length };
}

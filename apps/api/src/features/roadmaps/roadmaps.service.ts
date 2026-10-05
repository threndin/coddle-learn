import {
  isStepProgressStatus,
  matchedSkillSlugs,
  ROADMAP_COMPLETE_POINTS,
  roadmapProgressPercent,
  STEP_COMPLETE_POINTS,
  type StepProgressStatus,
} from "@coddle/shared";
import type { RoadmapStep, UserStepProgress } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import {
  clearUserRoadmapCompleted,
  createUserRoadmap,
  deleteBookmark,
  deleteStepProgress,
  findRoadmapBySlug,
  findStepProgress,
  findUserRoadmap,
  incrementUserPoints,
  listBookmarksForSteps,
  listRoadmaps,
  listStepProgressForRoadmap,
  listUserRoadmaps,
  listUserSkillSlugs,
  markUserRoadmapCompleted,
  setPrimaryRoadmap,
  type RoadmapWithSteps,
  upsertBookmark,
  upsertStepProgress,
} from "./roadmaps.repository.js";
import { prisma } from "../../shared/db.js";

export type StepUiStatus =
  | "locked"
  | "current"
  | "completed"
  | "skipped"
  | "optional";

type ResourcePayload = {
  title: string;
  url: string;
  type: string;
};

type StepUnit =
  | { kind: "single"; steps: [RoadmapStep] }
  | { kind: "branch"; key: string; steps: RoadmapStep[] };

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseResources(value: unknown): ResourcePayload[] {
  if (!Array.isArray(value)) return [];
  const resources: ResourcePayload[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.title !== "string" ||
      typeof record.url !== "string" ||
      typeof record.type !== "string"
    ) {
      continue;
    }
    resources.push({
      title: record.title,
      url: record.url,
      type: record.type,
    });
  }
  return resources;
}

function progressMap(rows: UserStepProgress[]) {
  return new Map(rows.map((row) => [row.stepId, row]));
}

function buildUnits(steps: RoadmapStep[]): StepUnit[] {
  const units: StepUnit[] = [];
  let index = 0;
  while (index < steps.length) {
    const step = steps[index]!;
    if (!step.branchKey) {
      units.push({ kind: "single", steps: [step] });
      index += 1;
      continue;
    }
    const key = step.branchKey;
    const group: RoadmapStep[] = [];
    while (index < steps.length && steps[index]?.branchKey === key) {
      group.push(steps[index]!);
      index += 1;
    }
    units.push({ kind: "branch", key, steps: group });
  }
  return units;
}

function isDoneStatus(status: string | undefined): status is StepProgressStatus {
  return status === "completed" || status === "skipped";
}

function unitSatisfied(
  unit: StepUnit,
  progress: Map<string, UserStepProgress>,
): boolean {
  if (unit.kind === "single") {
    return isDoneStatus(progress.get(unit.steps[0]!.id)?.status);
  }
  return unit.steps.some((step) => isDoneStatus(progress.get(step.id)?.status));
}

function deriveStepStatuses(
  steps: RoadmapStep[],
  progress: Map<string, UserStepProgress>,
): { statuses: StepUiStatus[]; units: StepUnit[]; doneUnits: number } {
  const units = buildUnits(steps);
  const statuses: StepUiStatus[] = steps.map(() => "locked");
  const indexById = new Map(steps.map((step, index) => [step.id, index]));
  let doneUnits = 0;
  let openedCurrent = false;

  for (const unit of units) {
    if (unitSatisfied(unit, progress)) {
      doneUnits += 1;
      for (const step of unit.steps) {
        const row = progress.get(step.id);
        const index = indexById.get(step.id)!;
        if (row?.status === "completed") statuses[index] = "completed";
        else if (row?.status === "skipped") statuses[index] = "skipped";
        else statuses[index] = unit.kind === "branch" ? "optional" : "locked";
      }
      continue;
    }

    if (!openedCurrent) {
      openedCurrent = true;
      for (const step of unit.steps) {
        const index = indexById.get(step.id)!;
        const row = progress.get(step.id);
        if (row?.status === "completed") statuses[index] = "completed";
        else if (row?.status === "skipped") statuses[index] = "skipped";
        else statuses[index] = "current";
      }
      continue;
    }

    for (const step of unit.steps) {
      statuses[indexById.get(step.id)!] = "locked";
    }
  }

  return { statuses, units, doneUnits };
}

function summarizeProgress(
  steps: RoadmapStep[],
  progress: Map<string, UserStepProgress>,
) {
  const { statuses, units, doneUnits } = deriveStepStatuses(steps, progress);
  const currentIndex = statuses.findIndex((status) => status === "current");
  const nextStep = currentIndex >= 0 ? steps[currentIndex] : null;

  return {
    statuses,
    units,
    doneUnits,
    totalUnits: units.length,
    progressPercent: roadmapProgressPercent(doneUnits, units.length),
    nextStep,
  };
}

function toCatalogItem(
  roadmap: RoadmapWithSteps,
  enrollment: {
    startedAt: Date;
    completedAt: Date | null;
    isPrimary: boolean;
  } | null,
  progress: Map<string, UserStepProgress>,
  userSkillSlugs: string[],
) {
  const summary = summarizeProgress(roadmap.steps, progress);
  const matched = matchedSkillSlugs(roadmap.skillSlugs, userSkillSlugs);
  return {
    slug: roadmap.slug,
    name: roadmap.name,
    level: roadmap.level,
    summary: roadmap.summary,
    weeks: roadmap.weeks,
    skillSlugs: roadmap.skillSlugs,
    matchedSkillSlugs: matched,
    stepCount: roadmap.steps.length,
    enrolled: Boolean(enrollment),
    isPrimary: enrollment?.isPrimary ?? false,
    startedAt: enrollment?.startedAt.toISOString() ?? null,
    completedAt: enrollment?.completedAt?.toISOString() ?? null,
    progressPercent: enrollment ? summary.progressPercent : 0,
    nextStep: enrollment && summary.nextStep
      ? {
          slug: summary.nextStep.slug,
          title: summary.nextStep.title,
        }
      : null,
  };
}

function toDetail(
  roadmap: RoadmapWithSteps,
  enrollment: {
    startedAt: Date;
    completedAt: Date | null;
    isPrimary: boolean;
  } | null,
  progress: Map<string, UserStepProgress>,
  bookmarkedUrls: Set<string>,
) {
  const summary = summarizeProgress(roadmap.steps, progress);
  return {
    slug: roadmap.slug,
    name: roadmap.name,
    level: roadmap.level,
    summary: roadmap.summary,
    weeks: roadmap.weeks,
    skillSlugs: roadmap.skillSlugs,
    enrolled: Boolean(enrollment),
    isPrimary: enrollment?.isPrimary ?? false,
    startedAt: enrollment?.startedAt.toISOString() ?? null,
    completedAt: enrollment?.completedAt?.toISOString() ?? null,
    progressPercent: enrollment ? summary.progressPercent : 0,
    nextStep: enrollment && summary.nextStep
      ? {
          slug: summary.nextStep.slug,
          title: summary.nextStep.title,
        }
      : null,
    steps: roadmap.steps.map((step, index) => {
      const resources = parseResources(step.resources).map((resource) => ({
        ...resource,
        bookmarked: bookmarkedUrls.has(`${step.id}::${resource.url}`),
      }));
      const previewStatuses = enrollment
        ? summary.statuses
        : deriveStepStatuses(roadmap.steps, new Map()).statuses;
      return {
        slug: step.slug,
        title: step.title,
        summary: step.summary,
        estimatedMinutes: step.estimatedMinutes,
        learnings: parseStringArray(step.learnings),
        practice: step.practice,
        branchKey: step.branchKey,
        resources,
        status: previewStatuses[index]!,
      };
    }),
  };
}

export async function getRoadmapCatalog(userId: string) {
  const [roadmaps, enrollments, userSkillSlugs] = await Promise.all([
    listRoadmaps(),
    listUserRoadmaps(userId),
    listUserSkillSlugs(userId),
  ]);

  const enrollmentByRoadmapId = new Map(
    enrollments.map((row) => [row.roadmapId, row]),
  );

  const items = await Promise.all(
    roadmaps.map(async (roadmap) => {
      const enrollment = enrollmentByRoadmapId.get(roadmap.id) ?? null;
      const progressRows = enrollment
        ? await listStepProgressForRoadmap(
            userId,
            roadmap.steps.map((step) => step.id),
          )
        : [];
      return toCatalogItem(
        roadmap,
        enrollment,
        progressMap(progressRows),
        userSkillSlugs,
      );
    }),
  );

  return { roadmaps: items };
}

export async function getRoadmapDetail(userId: string, slug: string) {
  const roadmap = await findRoadmapBySlug(slug);
  if (!roadmap) {
    throw new AppError(404, "roadmap_missing", "That roadmap could not be found.");
  }

  const enrollment = await findUserRoadmap(userId, roadmap.id);
  const stepIds = roadmap.steps.map((step) => step.id);
  const [progressRows, bookmarks] = await Promise.all([
    enrollment ? listStepProgressForRoadmap(userId, stepIds) : Promise.resolve([]),
    enrollment ? listBookmarksForSteps(userId, stepIds) : Promise.resolve([]),
  ]);

  const bookmarkedUrls = new Set(
    bookmarks.map((row) => `${row.stepId}::${row.url}`),
  );

  return {
    roadmap: toDetail(roadmap, enrollment, progressMap(progressRows), bookmarkedUrls),
  };
}

export async function startRoadmap(
  userId: string,
  slug: string,
  options?: { makePrimary?: boolean },
) {
  const roadmap = await findRoadmapBySlug(slug);
  if (!roadmap) {
    throw new AppError(404, "roadmap_missing", "That roadmap could not be found.");
  }

  const existing = await findUserRoadmap(userId, roadmap.id);
  if (!existing) {
    const enrollments = await listUserRoadmaps(userId);
    const makePrimary = options?.makePrimary ?? enrollments.length === 0;
    await createUserRoadmap(userId, roadmap.id, { isPrimary: makePrimary });
  } else if (options?.makePrimary) {
    await setPrimaryRoadmap(userId, roadmap.id);
  }

  return getRoadmapDetail(userId, slug);
}

export async function enrollRoadmapBySlug(
  userId: string,
  slug: string,
  options?: { makePrimary?: boolean },
) {
  return startRoadmap(userId, slug, options);
}

export async function markRoadmapPrimary(userId: string, slug: string) {
  const roadmap = await findRoadmapBySlug(slug);
  if (!roadmap) {
    throw new AppError(404, "roadmap_missing", "That roadmap could not be found.");
  }

  const enrollment = await findUserRoadmap(userId, roadmap.id);
  if (!enrollment) {
    await createUserRoadmap(userId, roadmap.id, { isPrimary: true });
  } else {
    await setPrimaryRoadmap(userId, roadmap.id);
  }

  return getRoadmapDetail(userId, slug);
}

export async function updateRoadmapProgress(
  userId: string,
  slug: string,
  input: unknown,
) {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_progress", "Progress details were missing.");
  }

  const body = input as Record<string, unknown>;
  const stepSlug = typeof body.stepSlug === "string" ? body.stepSlug : "";
  if (!stepSlug) {
    throw new AppError(400, "invalid_progress", "Choose a step to update.");
  }

  const action = body.status;
  if (action !== "incomplete" && !isStepProgressStatus(action)) {
    throw new AppError(
      400,
      "invalid_progress",
      "Status must be completed, skipped, or incomplete.",
    );
  }

  const roadmap = await findRoadmapBySlug(slug);
  if (!roadmap) {
    throw new AppError(404, "roadmap_missing", "That roadmap could not be found.");
  }

  let enrollment = await findUserRoadmap(userId, roadmap.id);
  if (!enrollment) {
    enrollment = await createUserRoadmap(userId, roadmap.id, {
      isPrimary: true,
    });
  }

  const step = roadmap.steps.find((item) => item.slug === stepSlug);
  if (!step) {
    throw new AppError(404, "step_missing", "That step could not be found.");
  }

  const progressRows = await listStepProgressForRoadmap(
    userId,
    roadmap.steps.map((item) => item.id),
  );
  const progress = progressMap(progressRows);
  const { statuses } = deriveStepStatuses(roadmap.steps, progress);
  const stepIndex = roadmap.steps.findIndex((item) => item.id === step.id);
  const uiStatus = statuses[stepIndex];

  if (action === "incomplete") {
    if (uiStatus !== "completed" && uiStatus !== "skipped" && uiStatus !== "optional") {
      const existing = progress.get(step.id);
      if (!existing) {
        throw new AppError(400, "step_not_done", "That step is not marked done yet.");
      }
    }
    const existing = await findStepProgress(userId, step.id);
    if (existing?.pointsAwarded) {
      await incrementUserPoints(userId, -existing.pointsAwarded);
    }
    await deleteStepProgress(userId, step.id);
  } else {
    if (uiStatus === "locked") {
      throw new AppError(
        400,
        "step_locked",
        "Finish the earlier steps before updating this one.",
      );
    }

    const existing = progress.get(step.id);
    let pointsAwarded = existing?.pointsAwarded ?? 0;
    if (action === "completed" && pointsAwarded <= 0) {
      pointsAwarded = STEP_COMPLETE_POINTS;
      await incrementUserPoints(userId, STEP_COMPLETE_POINTS);
    }
    if (action === "skipped") {
      // Skipping does not award points; keep any previously awarded amount.
      pointsAwarded = existing?.pointsAwarded ?? 0;
    }

    await upsertStepProgress(userId, step.id, action, pointsAwarded);
  }

  const refreshed = await listStepProgressForRoadmap(
    userId,
    roadmap.steps.map((item) => item.id),
  );
  const refreshedProgress = progressMap(refreshed);
  const summary = summarizeProgress(roadmap.steps, refreshedProgress);
  const wasComplete = Boolean(enrollment.completedAt);
  const nowComplete = summary.doneUnits >= summary.totalUnits;

  if (nowComplete && !wasComplete) {
    await markUserRoadmapCompleted(userId, roadmap.id);
    await incrementUserPoints(userId, ROADMAP_COMPLETE_POINTS);
  } else if (!nowComplete && wasComplete) {
    await clearUserRoadmapCompleted(userId, roadmap.id);
    await incrementUserPoints(userId, -ROADMAP_COMPLETE_POINTS);
  }

  const detail = await getRoadmapDetail(userId, slug);
  return {
    ...detail,
    pointsAwarded:
      action === "completed"
        ? STEP_COMPLETE_POINTS
        : action === "incomplete"
          ? 0
          : 0,
    roadmapCompleteBonus: nowComplete && !wasComplete ? ROADMAP_COMPLETE_POINTS : 0,
  };
}

export async function toggleResourceBookmark(
  userId: string,
  slug: string,
  input: unknown,
) {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_bookmark", "Bookmark details were missing.");
  }
  const body = input as Record<string, unknown>;
  const stepSlug = typeof body.stepSlug === "string" ? body.stepSlug : "";
  const url = typeof body.url === "string" ? body.url : "";
  const title = typeof body.title === "string" ? body.title : "";
  const remove = body.remove === true;

  if (!stepSlug || !url) {
    throw new AppError(400, "invalid_bookmark", "Step and URL are required.");
  }

  const roadmap = await findRoadmapBySlug(slug);
  if (!roadmap) {
    throw new AppError(404, "roadmap_missing", "That roadmap could not be found.");
  }

  const step = roadmap.steps.find((item) => item.slug === stepSlug);
  if (!step) {
    throw new AppError(404, "step_missing", "That step could not be found.");
  }

  const resources = parseResources(step.resources);
  if (!resources.some((resource) => resource.url === url)) {
    throw new AppError(400, "invalid_bookmark", "That resource is not on this step.");
  }

  let enrollment = await findUserRoadmap(userId, roadmap.id);
  if (!enrollment) {
    enrollment = await createUserRoadmap(userId, roadmap.id);
  }

  if (remove) {
    await deleteBookmark(userId, step.id, url);
  } else {
    await upsertBookmark({
      userId,
      stepId: step.id,
      url,
      title: title || resources.find((resource) => resource.url === url)?.title || url,
    });
  }

  return getRoadmapDetail(userId, slug);
}

export async function getContinueLearning(userId: string) {
  let enrollments = await listUserRoadmaps(userId);

  if (enrollments.length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { startingRoadmapSlug: true },
    });
    if (user?.startingRoadmapSlug) {
      try {
        await enrollRoadmapBySlug(userId, user.startingRoadmapSlug, {
          makePrimary: true,
        });
        enrollments = await listUserRoadmaps(userId);
      } catch {
        /* catalog missing */
      }
    }
  }

  if (enrollments.length === 0) {
    return { continue: null as null, enrolled: [] as unknown[] };
  }

  const primary =
    enrollments.find((row) => row.isPrimary && !row.completedAt) ??
    enrollments.find((row) => row.isPrimary) ??
    enrollments.find((row) => !row.completedAt) ??
    enrollments[0] ??
    null;

  const enrolled = await Promise.all(
    enrollments.map(async (row) => {
      const progressRows = await listStepProgressForRoadmap(
        userId,
        row.roadmap.steps.map((step) => step.id),
      );
      const summary = summarizeProgress(row.roadmap.steps, progressMap(progressRows));
      return {
        slug: row.roadmap.slug,
        name: row.roadmap.name,
        isPrimary: row.isPrimary,
        progressPercent: summary.progressPercent,
        completedAt: row.completedAt?.toISOString() ?? null,
        nextStep: summary.nextStep
          ? { slug: summary.nextStep.slug, title: summary.nextStep.title }
          : null,
      };
    }),
  );

  if (!primary) {
    return { continue: null, enrolled };
  }

  const progressRows = await listStepProgressForRoadmap(
    userId,
    primary.roadmap.steps.map((step) => step.id),
  );
  const summary = summarizeProgress(primary.roadmap.steps, progressMap(progressRows));

  return {
    continue: {
      slug: primary.roadmap.slug,
      name: primary.roadmap.name,
      summary: primary.roadmap.summary,
      isPrimary: primary.isPrimary,
      progressPercent: summary.progressPercent,
      nextStep: summary.nextStep
        ? {
            slug: summary.nextStep.slug,
            title: summary.nextStep.title,
          }
        : null,
      completedAt: primary.completedAt?.toISOString() ?? null,
    },
    enrolled,
  };
}

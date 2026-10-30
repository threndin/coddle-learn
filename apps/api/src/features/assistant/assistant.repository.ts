import type { Prisma } from "@prisma/client";
import { ASSISTANT_WEEKLY_LIMIT } from "@coddle/shared";
import { prisma } from "../../shared/db.js";

export type LearnerSnapshotItem = {
  slug: string;
  title: string;
  href: string;
  kind: "roadmap" | "course";
  isPrimary?: boolean;
  progressPercent: number;
  completed: boolean;
  imageUrl: string | null;
  next: { slug: string; title: string; href: string } | null;
};

export type LearnerSnapshot = {
  name: string;
  experienceLevel: string | null;
  dailyGoalMinutes: number | null;
  startingRoadmapSlug: string | null;
  points: number;
  hasOnboarded: boolean;
  interestSkills: { slug: string; name: string }[];
  skillProgress: { slug: string; name: string; status: string }[];
  roadmaps: LearnerSnapshotItem[];
  courses: LearnerSnapshotItem[];
};

function isDone(status: string | undefined) {
  return status === "completed" || status === "skipped";
}

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/**
 * Read-only progress for the signed-in learner only (`userId` must be session.sub).
 * Does not auto-enroll and never loads another account.
 */
export async function loadLearnerSnapshot(userId: string): Promise<LearnerSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      experienceLevel: true,
      dailyGoalMinutes: true,
      startingRoadmapSlug: true,
      points: true,
      onboardingCompletedAt: true,
      skills: {
        take: 12,
        select: { skill: { select: { slug: true, name: true } } },
      },
      skillProgress: {
        take: 12,
        orderBy: { updatedAt: "desc" },
        select: { status: true, skill: { select: { slug: true, name: true } } },
      },
      roadmaps: {
        take: 8,
        orderBy: [{ isPrimary: "desc" }, { startedAt: "asc" }],
        select: {
          isPrimary: true,
          completedAt: true,
          roadmap: {
            select: {
              slug: true,
              name: true,
              steps: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, slug: true, title: true },
              },
            },
          },
        },
      },
      courseEnrollments: {
        take: 8,
        orderBy: { startedAt: "desc" },
        select: {
          completedAt: true,
          course: {
            select: {
              slug: true,
              title: true,
              thumbnailUrl: true,
              modules: {
                orderBy: { sortOrder: "asc" },
                select: {
                  slug: true,
                  lessons: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, slug: true, title: true },
                  },
                },
              },
            },
          },
        },
      },
      stepProgress: { select: { stepId: true, status: true } },
      lessonProgress: { select: { lessonId: true, status: true } },
    },
  });

  if (!user) return null;

  const stepStatus = new Map(user.stepProgress.map((row) => [row.stepId, row.status]));
  const lessonStatus = new Map(user.lessonProgress.map((row) => [row.lessonId, row.status]));

  const roadmaps: LearnerSnapshotItem[] = user.roadmaps.map((row) => {
    const steps = row.roadmap.steps;
    const done = steps.filter((step) => isDone(stepStatus.get(step.id))).length;
    const next = steps.find((step) => !isDone(stepStatus.get(step.id))) ?? null;
    const completed = Boolean(row.completedAt) || (steps.length > 0 && done === steps.length);
    const href = `/roadmaps/${row.roadmap.slug}`;
    return {
      slug: row.roadmap.slug,
      title: row.roadmap.name,
      href,
      kind: "roadmap",
      isPrimary: row.isPrimary,
      progressPercent: completed ? 100 : percent(done, steps.length),
      completed,
      imageUrl: null,
      next: next
        ? {
            slug: next.slug,
            title: next.title,
            href: `${href}?step=${encodeURIComponent(next.slug)}`,
          }
        : null,
    };
  });

  const courses: LearnerSnapshotItem[] = user.courseEnrollments.map((row) => {
    const lessons = row.course.modules.flatMap((mod) =>
      mod.lessons.map((lesson) => ({ ...lesson, moduleSlug: mod.slug })),
    );
    const done = lessons.filter((lesson) => isDone(lessonStatus.get(lesson.id))).length;
    const next = lessons.find((lesson) => !isDone(lessonStatus.get(lesson.id))) ?? null;
    const completed = Boolean(row.completedAt) || (lessons.length > 0 && done === lessons.length);
    const href = `/courses/${row.course.slug}`;
    return {
      slug: row.course.slug,
      title: row.course.title,
      href,
      kind: "course",
      progressPercent: completed ? 100 : percent(done, lessons.length),
      completed,
      imageUrl: row.course.thumbnailUrl,
      next: next
        ? {
            slug: next.slug,
            title: next.title,
            href: `${href}?module=${encodeURIComponent(next.moduleSlug)}&lesson=${encodeURIComponent(next.slug)}`,
          }
        : null,
    };
  });

  return {
    name: user.name,
    experienceLevel: user.experienceLevel,
    dailyGoalMinutes: user.dailyGoalMinutes,
    startingRoadmapSlug: user.startingRoadmapSlug,
    points: user.points,
    hasOnboarded: Boolean(user.onboardingCompletedAt),
    interestSkills: user.skills.map((row) => row.skill),
    skillProgress: user.skillProgress.map((row) => ({
      slug: row.skill.slug,
      name: row.skill.name,
      status: row.status,
    })),
    roadmaps,
    courses,
  };
}

export async function readWeeklyUsage(userId: string, weekStart: Date): Promise<number> {
  // Match the raw insert binding, and tolerate TZ offsets on TIMESTAMP WITHOUT TIME ZONE.
  const rows = await prisma.$queryRaw<Array<{ used: number }>>`
    SELECT used FROM assistant_weekly_usage
    WHERE user_id = ${userId}
      AND week_start >= ${weekStart}::timestamp - interval '14 hours'
      AND week_start <  ${weekStart}::timestamp + interval '14 hours'
    ORDER BY week_start
    LIMIT 1
  `;
  return rows[0]?.used ?? 0;
}

/**
 * Atomically consume one weekly Gemini slot. Returns the new used count,
 * or null if the learner is already at the cap.
 */
export async function tryConsumeWeeklyMessage(
  userId: string,
  weekStart: Date,
): Promise<number | null> {
  const rows = await prisma.$queryRaw<Array<{ used: number }>>`
    INSERT INTO assistant_weekly_usage (user_id, week_start, used)
    VALUES (${userId}, ${weekStart}, 1)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET used = assistant_weekly_usage.used + 1
    WHERE assistant_weekly_usage.used < ${ASSISTANT_WEEKLY_LIMIT}
    RETURNING used
  `;
  return rows[0]?.used ?? null;
}

const CONVERSATION_LIST_LIMIT = 40;
const TITLE_MAX = 72;

export function conversationTitleFromMessage(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (!compact) return "New chat";
  if (compact.length <= TITLE_MAX) return compact;
  return `${compact.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

export async function listConversations(userId: string) {
  return prisma.assistantConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: CONVERSATION_LIST_LIMIT,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true },
      },
    },
  });
}

export async function getConversation(userId: string, conversationId: string) {
  return prisma.assistantConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createConversation(userId: string, title: string) {
  return prisma.assistantConversation.create({
    data: { userId, title },
    select: { id: true },
  });
}

export async function appendTurn(
  userId: string,
  conversationId: string,
  userMessage: { content: string },
  assistantMessage: {
    content: string;
    hits: unknown;
    followUps: string[];
    provider: string;
  },
) {
  const owned = await prisma.assistantConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!owned) return null;

  await prisma.$transaction([
    prisma.assistantMessage.create({
      data: {
        conversationId,
        role: "user",
        content: userMessage.content,
      },
    }),
    prisma.assistantMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: assistantMessage.content,
        hits: assistantMessage.hits as Prisma.InputJsonValue,
        followUps: assistantMessage.followUps,
        provider: assistantMessage.provider,
      },
    }),
    prisma.assistantConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return conversationId;
}

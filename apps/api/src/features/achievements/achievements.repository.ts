import { prisma } from "../../shared/db.js";

export async function listAwardsForUser(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });
}

export async function findAward(userId: string, slug: string) {
  return prisma.userAchievement.findUnique({
    where: { userId_slug: { userId, slug } },
  });
}

export async function upsertAward(userId: string, slug: string, earnedAt: Date) {
  return prisma.userAchievement.upsert({
    where: { userId_slug: { userId, slug } },
    create: { userId, slug, earnedAt },
    update: { earnedAt },
  });
}

export async function deleteAllAwards() {
  const result = await prisma.userAchievement.deleteMany();
  return result.count;
}

export async function listUserIds() {
  const rows = await prisma.user.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.id);
}

/** Earliest course completion, or null. */
export async function firstCourseCompletedAt(userId: string) {
  const row = await prisma.userCourse.findFirst({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "asc" },
    select: { completedAt: true },
  });
  return row?.completedAt ?? null;
}

/** Earliest project submit, or null. */
export async function firstProjectSubmittedAt(userId: string) {
  const row = await prisma.projectSubmission.findFirst({
    where: { userId, status: "submitted", submittedAt: { not: null } },
    orderBy: { submittedAt: "asc" },
    select: { submittedAt: true },
  });
  return row?.submittedAt ?? null;
}

/** Earliest roadmap completion, or null. */
export async function firstRoadmapCompletedAt(userId: string) {
  const row = await prisma.userRoadmap.findFirst({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "asc" },
    select: { completedAt: true },
  });
  return row?.completedAt ?? null;
}

/** Earliest published course by this creator, or null. */
export async function firstPublishedCourseAt(userId: string) {
  const row = await prisma.course.findFirst({
    where: {
      createdByUserId: userId,
      status: "published",
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "asc" },
    select: { publishedAt: true },
  });
  return row?.publishedAt ?? null;
}

/** Earliest published project brief by this creator, or null. */
export async function firstPublishedProjectAt(userId: string) {
  const row = await prisma.project.findFirst({
    where: {
      createdByUserId: userId,
      status: "published",
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "asc" },
    select: { publishedAt: true },
  });
  return row?.publishedAt ?? null;
}

/** Earliest published resource submitted by this user, or null. */
export async function firstPublishedResourceAt(userId: string) {
  const row = await prisma.resource.findFirst({
    where: {
      submittedByUserId: userId,
      status: "published",
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "asc" },
    select: { publishedAt: true },
  });
  return row?.publishedAt ?? null;
}

/** Earliest review timestamp where this user was the reviewer, or null. */
export async function firstReviewedContentAt(userId: string) {
  const [course, project, resource, tool] = await Promise.all([
    prisma.course.findFirst({
      where: { reviewedByUserId: userId, reviewedAt: { not: null } },
      orderBy: { reviewedAt: "asc" },
      select: { reviewedAt: true },
    }),
    prisma.project.findFirst({
      where: { reviewedByUserId: userId, reviewedAt: { not: null } },
      orderBy: { reviewedAt: "asc" },
      select: { reviewedAt: true },
    }),
    prisma.resource.findFirst({
      where: { reviewedByUserId: userId, reviewedAt: { not: null } },
      orderBy: { reviewedAt: "asc" },
      select: { reviewedAt: true },
    }),
    prisma.tool.findFirst({
      where: { reviewedByUserId: userId, reviewedAt: { not: null } },
      orderBy: { reviewedAt: "asc" },
      select: { reviewedAt: true },
    }),
  ]);
  const dates = [course?.reviewedAt, project?.reviewedAt, resource?.reviewedAt, tool?.reviewedAt].filter(
    (value): value is Date => value instanceof Date,
  );
  if (dates.length === 0) return null;
  return dates.reduce((earliest, date) => (date < earliest ? date : earliest));
}

/** Earliest completed mentorship this user ran as a mentor. */
export async function firstCompletedMentorshipAt(userId: string) {
  const row = await prisma.mentorshipApplication.findFirst({
    where: {
      status: "completed",
      completedAt: { not: null },
      program: { mentorProfile: { userId } },
    },
    orderBy: { completedAt: "asc" },
    select: { completedAt: true },
  });
  return row?.completedAt ?? null;
}

/** Distinct UTC calendar days with learning activity, newest first. */
export async function listActivityDayKeys(userId: string, limitDays = 90): Promise<string[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - limitDays);

  const [lessons, steps, exercises, assessments, projects] = await Promise.all([
    prisma.userLessonProgress.findMany({
      where: { userId, updatedAt: { gte: since } },
      select: { updatedAt: true },
    }),
    prisma.userStepProgress.findMany({
      where: { userId, updatedAt: { gte: since } },
      select: { updatedAt: true },
    }),
    prisma.userExerciseSubmission.findMany({
      where: { userId, updatedAt: { gte: since } },
      select: { updatedAt: true },
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId, submittedAt: { gte: since } },
      select: { submittedAt: true },
    }),
    prisma.projectSubmission.findMany({
      where: { userId, OR: [{ submittedAt: { gte: since } }, { updatedAt: { gte: since } }] },
      select: { submittedAt: true, updatedAt: true },
    }),
  ]);

  const days = new Set<string>();
  for (const row of lessons) days.add(utcDayKey(row.updatedAt));
  for (const row of steps) days.add(utcDayKey(row.updatedAt));
  for (const row of exercises) days.add(utcDayKey(row.updatedAt));
  for (const row of assessments) {
    if (row.submittedAt) days.add(utcDayKey(row.submittedAt));
  }
  for (const row of projects) {
    days.add(utcDayKey(row.updatedAt));
    if (row.submittedAt) days.add(utcDayKey(row.submittedAt));
  }

  return [...days].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

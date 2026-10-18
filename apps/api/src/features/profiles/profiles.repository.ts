import { prisma } from "../../shared/db.js";

export async function countFollowers(userId: string) {
  return prisma.follow.count({ where: { followingId: userId } });
}

export async function countFollowing(userId: string) {
  return prisma.follow.count({ where: { followerId: userId } });
}

export async function findFollow(followerId: string, followingId: string) {
  return prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId },
    },
  });
}

export async function createFollow(followerId: string, followingId: string) {
  return prisma.follow.create({
    data: { followerId, followingId },
  });
}

export async function deleteFollow(followerId: string, followingId: string) {
  return prisma.follow.deleteMany({
    where: { followerId, followingId },
  });
}

export async function countCompletedCourses(userId: string) {
  return prisma.userCourse.count({
    where: { userId, completedAt: { not: null } },
  });
}

export async function countSubmittedProjects(userId: string) {
  return prisma.projectSubmission.count({
    where: { userId, status: "submitted" },
  });
}

export async function countCredentials(userId: string) {
  return prisma.credential.count({ where: { userId } });
}

export async function countCommunityPosts(userId: string) {
  return prisma.communityPost.count({
    where: { authorId: userId, isDeleted: false },
  });
}

export async function listPublicCredentials(userId: string, take = 12) {
  return prisma.credential.findMany({
    where: { userId },
    include: {
      assessment: {
        select: {
          id: true,
          title: true,
          course: { select: { slug: true, title: true } },
        },
      },
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          roadmap: { select: { slug: true, name: true } },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    take,
  });
}

export async function listEarnedAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });
}

export async function listSubmittedProjects(userId: string, take = 12) {
  return prisma.projectSubmission.findMany({
    where: { userId, status: "submitted" },
    include: {
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          level: true,
          primarySkillSlug: true,
          exampleImageUrl: true,
          roadmap: { select: { slug: true, name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take,
  });
}

export async function listEnrolledRoadmaps(userId: string) {
  return prisma.userRoadmap.findMany({
    where: { userId },
    include: {
      roadmap: {
        select: {
          slug: true,
          name: true,
          summary: true,
          level: true,
          steps: { select: { id: true } },
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { startedAt: "asc" }],
  });
}

export async function countCompletedSteps(userId: string, stepIds: string[]) {
  if (stepIds.length === 0) return 0;
  return prisma.userStepProgress.count({
    where: {
      userId,
      stepId: { in: stepIds },
      status: { in: ["completed", "skipped"] },
    },
  });
}

export async function listRecentPosts(userId: string, take = 6) {
  return prisma.communityPost.findMany({
    where: { authorId: userId, isDeleted: false },
    select: {
      id: true,
      slug: true,
      kind: true,
      topic: true,
      title: true,
      body: true,
      imageUrls: true,
      commentCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function listFollowers(userId: string, take = 24) {
  return prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          bio: true,
          experienceLevel: true,
          points: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function listFollowing(userId: string, take = 24) {
  return prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          bio: true,
          experienceLevel: true,
          points: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

import { prisma } from "../../shared/db.js";

export async function listSitemapCourses() {
  return prisma.course.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listSitemapRoadmaps() {
  return prisma.roadmap.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listSitemapProjects() {
  return prisma.project.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listSitemapChallenges() {
  return prisma.challenge.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listSitemapTools() {
  return prisma.tool.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listSitemapCommunityPosts() {
  return prisma.communityPost.findMany({
    where: { isDeleted: false },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
}

export async function listSitemapUsers() {
  return prisma.user.findMany({
    where: {
      suspendedAt: null,
      onboardingCompletedAt: { not: null },
    },
    select: { username: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });
}

export async function listSitemapMentors() {
  return prisma.mentorProfile.findMany({
    where: {
      user: {
        suspendedAt: null,
      },
    },
    select: {
      updatedAt: true,
      user: {
        select: { username: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listSitemapCredentials() {
  return prisma.credential.findMany({
    select: { code: true, issuedAt: true },
    orderBy: { issuedAt: "desc" },
    take: 5000,
  });
}


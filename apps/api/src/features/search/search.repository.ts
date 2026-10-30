import { SEARCH_LIMITS } from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

function contains(term: string) {
  return { contains: term, mode: "insensitive" as const };
}

export async function searchCourseCandidates(terms: string[]) {
  const termWhere: Prisma.CourseWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [
              { title: contains(term) },
              { summary: contains(term) },
              { skills: { some: { skill: { OR: [{ name: contains(term) }, { slug: contains(term) }] } } } },
            ]),
          },
        ];

  return prisma.course.findMany({
    where: { status: "published", AND: termWhere },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      level: true,
      estimatedHours: true,
      thumbnailUrl: true,
      skills: { select: { skill: { select: { slug: true, name: true } } } },
      _count: { select: { enrollments: true } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function searchRoadmapCandidates(terms: string[]) {
  const termWhere: Prisma.RoadmapWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [
              { name: contains(term) },
              { summary: contains(term) },
              { skillSlugs: { has: term } },
            ]),
          },
        ];

  return prisma.roadmap.findMany({
    where: { AND: termWhere },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      level: true,
      weeks: true,
      skillSlugs: true,
      _count: { select: { enrollments: true } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function searchResourceCandidates(terms: string[]) {
  const termWhere: Prisma.ResourceWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [
              { title: contains(term) },
              { description: contains(term) },
              { url: contains(term) },
              { skills: { some: { skill: { OR: [{ name: contains(term) }, { slug: contains(term) }] } } } },
            ]),
          },
        ];

  return prisma.resource.findMany({
    where: { status: "published", AND: termWhere },
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      type: true,
      level: true,
      skills: { select: { skill: { select: { slug: true, name: true } } } },
      _count: { select: { bookmarks: true } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function searchProjectCandidates(terms: string[]) {
  const termWhere: Prisma.ProjectWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [
              { title: contains(term) },
              { summary: contains(term) },
              { body: contains(term) },
              { primarySkillSlug: contains(term) },
              { skills: { some: { skill: { OR: [{ name: contains(term) }, { slug: contains(term) }] } } } },
            ]),
          },
        ];

  return prisma.project.findMany({
    where: { status: "published", AND: termWhere },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      body: true,
      level: true,
      exampleImageUrl: true,
      skills: { select: { skill: { select: { slug: true, name: true } } } },
      _count: { select: { submissions: true } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function searchDeveloperCandidates(terms: string[]) {
  const termWhere: Prisma.UserWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [
              { name: contains(term) },
              { username: contains(term) },
              { bio: contains(term) },
              { skills: { some: { skill: { OR: [{ name: contains(term) }, { slug: contains(term) }] } } } },
            ]),
          },
        ];

  return prisma.user.findMany({
    where: { onboardingCompletedAt: { not: null }, AND: termWhere },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      experienceLevel: true,
      points: true,
      skills: { select: { skill: { select: { slug: true, name: true } } } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function searchMentorCandidates(terms: string[]) {
  const termWhere: Prisma.MentorProfileWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [
              { headline: contains(term) },
              { about: contains(term) },
              { user: { name: contains(term) } },
              { user: { username: contains(term) } },
              { skills: { some: { skill: { OR: [{ name: contains(term) }, { slug: contains(term) }] } } } },
            ]),
          },
        ];

  return prisma.mentorProfile.findMany({
    where: { AND: termWhere },
    select: {
      id: true,
      headline: true,
      about: true,
      availability: true,
      user: {
        select: { username: true, name: true, avatarUrl: true },
      },
      skills: { select: { skill: { select: { slug: true, name: true } } } },
      _count: { select: { programs: true } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function searchSkillCandidates(terms: string[]) {
  const termWhere: Prisma.SkillWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [{ name: contains(term) }, { slug: contains(term) }, { category: contains(term) }]),
          },
        ];

  return prisma.skill.findMany({
    where: { AND: termWhere },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      _count: { select: { users: true, courses: true, resources: true } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function searchToolCandidates(terms: string[]) {
  const termWhere: Prisma.ToolWhereInput[] =
    terms.length === 0
      ? []
      : [
          {
            OR: terms.flatMap((term) => [
              { title: contains(term) },
              { summary: contains(term) },
              { category: contains(term) },
              { skills: { some: { skill: { OR: [{ name: contains(term) }, { slug: contains(term) }] } } } },
            ]),
          },
        ];

  return prisma.tool.findMany({
    where: { status: "published", AND: termWhere },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      category: true,
      pricing: true,
      skills: { select: { skill: { select: { slug: true, name: true } } } },
      _count: { select: { bookmarks: true } },
    },
    take: SEARCH_LIMITS.perTypeCandidates,
  });
}

export async function listSkillNameBySlug() {
  const rows = await prisma.skill.findMany({ select: { slug: true, name: true } });
  return new Map(rows.map((row) => [row.slug, row.name]));
}

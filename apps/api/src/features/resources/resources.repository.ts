import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const resourceInclude = {
  submittedBy: {
    select: { id: true, name: true, avatarUrl: true },
  },
  skills: {
    include: {
      skill: { select: { slug: true, name: true } },
    },
  },
  steps: {
    include: {
      step: {
        select: {
          slug: true,
          title: true,
          sortOrder: true,
          roadmap: { select: { slug: true, name: true, sortOrder: true } },
        },
      },
    },
  },
  _count: { select: { bookmarks: true } },
} satisfies Prisma.ResourceInclude;

export type ResourceWithRelations = Prisma.ResourceGetPayload<{
  include: typeof resourceInclude;
}>;

export async function listResources(input: {
  where: Prisma.ResourceWhereInput;
  orderBy: Prisma.ResourceOrderByWithRelationInput[];
  skip: number;
  take: number;
}): Promise<{ rows: ResourceWithRelations[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.resource.findMany({
      where: input.where,
      include: resourceInclude,
      orderBy: input.orderBy,
      skip: input.skip,
      take: input.take,
    }),
    prisma.resource.count({ where: input.where }),
  ]);
  return { rows, total };
}

export async function countResourcesByType(where: Prisma.ResourceWhereInput) {
  const rows = await prisma.resource.groupBy({
    by: ["type"],
    where,
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.type, row._count._all]));
}

export async function countResources(where: Prisma.ResourceWhereInput) {
  return prisma.resource.count({ where });
}

/** Skills that tag at least one published resource, for the filter menu. */
export async function listResourceSkills() {
  return prisma.skill.findMany({
    where: { resources: { some: { resource: { status: "published" } } } },
    select: { slug: true, name: true, category: true },
    orderBy: { name: "asc" },
  });
}

export async function findSkillIdsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  return prisma.skill.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
}

export async function findResourceById(id: string): Promise<ResourceWithRelations | null> {
  return prisma.resource.findUnique({ where: { id }, include: resourceInclude });
}

export async function findResourceByUrl(url: string) {
  return prisma.resource.findUnique({
    where: { url },
    select: { id: true, status: true, title: true },
  });
}

export async function createResource(input: {
  url: string;
  title: string;
  description: string;
  type: string;
  level: string;
  status: string;
  publishedAt: Date | null;
  submittedByUserId: string;
  skillIds: string[];
}): Promise<ResourceWithRelations> {
  const { skillIds, ...data } = input;
  return prisma.resource.create({
    data: {
      ...data,
      skills: { create: skillIds.map((skillId) => ({ skillId })) },
    },
    include: resourceInclude,
  });
}

export async function deleteResource(id: string) {
  return prisma.resource.delete({ where: { id } });
}

export async function countSubmissionsSince(userId: string, since: Date) {
  return prisma.resource.count({
    where: { submittedByUserId: userId, createdAt: { gte: since } },
  });
}

export async function listBookmarkedResourceIds(
  userId: string,
  resourceIds: string[],
): Promise<Set<string>> {
  if (resourceIds.length === 0) return new Set();
  const rows = await prisma.userResourceBookmark.findMany({
    where: { userId, resourceId: { in: resourceIds } },
    select: { resourceId: true },
  });
  return new Set(rows.map((row) => row.resourceId));
}

export async function upsertBookmark(userId: string, resourceId: string) {
  return prisma.userResourceBookmark.upsert({
    where: { userId_resourceId: { userId, resourceId } },
    create: { userId, resourceId },
    update: {},
  });
}

export async function deleteBookmark(userId: string, resourceId: string) {
  return prisma.userResourceBookmark.deleteMany({
    where: { userId, resourceId },
  });
}

export async function countResourceBookmarks(resourceId: string) {
  return prisma.userResourceBookmark.count({ where: { resourceId } });
}

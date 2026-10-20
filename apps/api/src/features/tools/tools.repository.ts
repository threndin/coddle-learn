import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const toolInclude = {
  submittedBy: {
    select: { id: true, username: true, name: true, avatarUrl: true },
  },
  skills: {
    include: {
      skill: { select: { slug: true, name: true } },
    },
  },
  _count: { select: { bookmarks: true } },
} satisfies Prisma.ToolInclude;

export type ToolWithRelations = Prisma.ToolGetPayload<{
  include: typeof toolInclude;
}>;

export async function listTools(input: {
  where: Prisma.ToolWhereInput;
  orderBy: Prisma.ToolOrderByWithRelationInput[];
  skip: number;
  take: number;
}): Promise<{ rows: ToolWithRelations[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.tool.findMany({
      where: input.where,
      include: toolInclude,
      orderBy: input.orderBy,
      skip: input.skip,
      take: input.take,
    }),
    prisma.tool.count({ where: input.where }),
  ]);
  return { rows, total };
}

export async function countToolsByCategory(where: Prisma.ToolWhereInput) {
  const rows = await prisma.tool.groupBy({
    by: ["category"],
    where,
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.category, row._count._all]));
}

export async function countTools(where: Prisma.ToolWhereInput) {
  return prisma.tool.count({ where });
}

/** Skills that tag at least one published tool, for the filter menu. */
export async function listToolSkills() {
  return prisma.skill.findMany({
    where: { tools: { some: { tool: { status: "published" } } } },
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

export async function findToolById(id: string): Promise<ToolWithRelations | null> {
  return prisma.tool.findUnique({ where: { id }, include: toolInclude });
}

export async function findToolBySlug(slug: string): Promise<ToolWithRelations | null> {
  return prisma.tool.findUnique({ where: { slug }, include: toolInclude });
}

export async function findToolByUrl(url: string) {
  return prisma.tool.findUnique({
    where: { url },
    select: { id: true, slug: true, status: true, title: true },
  });
}

export async function toolSlugsLike(base: string) {
  const rows = await prisma.tool.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export async function createTool(input: {
  slug: string;
  url: string;
  title: string;
  summary: string;
  imageUrl: string;
  category: string;
  pricing: string;
  platforms: string[];
  status: string;
  publishedAt: Date | null;
  submittedByUserId: string;
  skillIds: string[];
}): Promise<ToolWithRelations> {
  const { skillIds, ...data } = input;
  return prisma.tool.create({
    data: {
      ...data,
      skills: { create: skillIds.map((skillId) => ({ skillId })) },
    },
    include: toolInclude,
  });
}

export async function deleteTool(id: string) {
  return prisma.tool.delete({ where: { id } });
}

export async function countSubmissionsSince(userId: string, since: Date) {
  return prisma.tool.count({
    where: { submittedByUserId: userId, createdAt: { gte: since } },
  });
}

export async function listBookmarkedToolIds(
  userId: string,
  toolIds: string[],
): Promise<Set<string>> {
  if (toolIds.length === 0) return new Set();
  const rows = await prisma.userToolBookmark.findMany({
    where: { userId, toolId: { in: toolIds } },
    select: { toolId: true },
  });
  return new Set(rows.map((row) => row.toolId));
}

export async function upsertBookmark(userId: string, toolId: string) {
  return prisma.userToolBookmark.upsert({
    where: { userId_toolId: { userId, toolId } },
    create: { userId, toolId },
    update: {},
  });
}

export async function deleteBookmark(userId: string, toolId: string) {
  return prisma.userToolBookmark.deleteMany({
    where: { userId, toolId },
  });
}

export async function countToolBookmarks(toolId: string) {
  return prisma.userToolBookmark.count({ where: { toolId } });
}

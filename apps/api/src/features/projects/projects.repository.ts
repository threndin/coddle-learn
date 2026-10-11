import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

export const projectInclude = {
  roadmap: { select: { id: true, slug: true, name: true } },
  roadmapStep: { select: { id: true, slug: true, title: true } },
  course: { select: { id: true, slug: true, title: true } },
  skills: {
    include: { skill: { select: { slug: true, name: true, category: true } } },
  },
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { submissions: true } },
} satisfies Prisma.ProjectInclude;

export type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export async function listPublishedProjects(): Promise<ProjectRow[]> {
  return prisma.project.findMany({
    where: { status: "published" },
    include: projectInclude,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
  });
}

export async function findPublishedProjectBySlug(slug: string): Promise<ProjectRow | null> {
  return prisma.project.findFirst({
    where: { slug, status: "published" },
    include: projectInclude,
  });
}

export async function findProjectById(id: string): Promise<ProjectRow | null> {
  return prisma.project.findUnique({
    where: { id },
    include: projectInclude,
  });
}

export async function findStudioProject(id: string): Promise<ProjectRow | null> {
  return findProjectById(id);
}

export async function listCreatorProjects(userId: string): Promise<ProjectRow[]> {
  return prisma.project.findMany({
    where: { createdByUserId: userId },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function projectSlugsLike(base: string, excludeId?: string) {
  const rows = await prisma.project.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export async function skillIdsForSlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  return prisma.skill.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
}

export async function findRoadmapBySlug(slug: string) {
  return prisma.roadmap.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      steps: { select: { id: true, slug: true, title: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function findCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, status: true },
  });
}

export async function listRoadmapOptions() {
  return prisma.roadmap.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      steps: { select: { id: true, slug: true, title: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listPublishedCourseOptions() {
  return prisma.course.findMany({
    where: { status: "published" },
    select: { id: true, slug: true, title: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createProject(
  data: Prisma.ProjectUncheckedCreateInput,
  skillIds: string[],
) {
  return prisma.project.create({
    data: {
      ...data,
      skills: { create: skillIds.map((skillId) => ({ skillId })) },
    },
    include: projectInclude,
  });
}

export async function updateProject(
  id: string,
  data: Prisma.ProjectUncheckedUpdateInput,
) {
  return prisma.project.update({
    where: { id },
    data,
    include: projectInclude,
  });
}

export async function replaceProjectSkills(projectId: string, skillIds: string[]) {
  await prisma.projectSkill.deleteMany({ where: { projectId } });
  if (skillIds.length === 0) return;
  await prisma.projectSkill.createMany({
    data: skillIds.map((skillId) => ({ projectId, skillId })),
  });
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
}

export async function findSubmission(userId: string, projectId: string) {
  return prisma.projectSubmission.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

export async function listUserSubmissions(userId: string) {
  return prisma.projectSubmission.findMany({
    where: { userId },
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
    orderBy: { updatedAt: "desc" },
  });
}

export async function startSubmission(userId: string, projectId: string) {
  return prisma.projectSubmission.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, status: "started" },
    update: {},
  });
}

export async function saveSubmission(
  id: string,
  data: {
    status: string;
    repoUrl: string | null;
    liveUrl: string | null;
    notes: string;
    submittedAt: Date | null;
    pointsAwarded?: number;
  },
) {
  return prisma.projectSubmission.update({
    where: { id },
    data: {
      status: data.status,
      repoUrl: data.repoUrl,
      liveUrl: data.liveUrl,
      notes: data.notes,
      submittedAt: data.submittedAt,
      ...(data.pointsAwarded !== undefined ? { pointsAwarded: data.pointsAwarded } : {}),
    },
  });
}

export async function submissionCounts(projectIds: string[]) {
  if (projectIds.length === 0) return new Map<string, number>();
  const rows = await prisma.projectSubmission.groupBy({
    by: ["projectId"],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.projectId, row._count._all]));
}

export async function incrementUserPoints(userId: string, delta: number) {
  if (delta === 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: delta } },
  });
}

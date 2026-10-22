import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const personSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const courseInclude = {
  createdBy: { select: personSelect },
  skills: { include: { skill: { select: { slug: true, name: true } } } },
} satisfies Prisma.CourseInclude;

const projectInclude = {
  createdBy: { select: personSelect },
  skills: { include: { skill: { select: { slug: true, name: true } } } },
} satisfies Prisma.ProjectInclude;

const resourceInclude = {
  submittedBy: { select: personSelect },
  skills: { include: { skill: { select: { slug: true, name: true } } } },
} satisfies Prisma.ResourceInclude;

const toolInclude = {
  submittedBy: { select: personSelect },
  skills: { include: { skill: { select: { slug: true, name: true } } } },
} satisfies Prisma.ToolInclude;

export type ReviewCourse = Prisma.CourseGetPayload<{ include: typeof courseInclude }>;
export type ReviewProject = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
export type ReviewResource = Prisma.ResourceGetPayload<{ include: typeof resourceInclude }>;
export type ReviewTool = Prisma.ToolGetPayload<{ include: typeof toolInclude }>;

export async function listReviewCourses(where: Prisma.CourseWhereInput) {
  return prisma.course.findMany({
    where,
    include: courseInclude,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function listReviewProjects(where: Prisma.ProjectWhereInput) {
  return prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function listReviewResources(where: Prisma.ResourceWhereInput) {
  return prisma.resource.findMany({
    where,
    include: resourceInclude,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function listReviewTools(where: Prisma.ToolWhereInput) {
  return prisma.tool.findMany({
    where,
    include: toolInclude,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function countReviewCourses(where: Prisma.CourseWhereInput) {
  return prisma.course.count({ where });
}

export async function countReviewProjects(where: Prisma.ProjectWhereInput) {
  return prisma.project.count({ where });
}

export async function countReviewResources(where: Prisma.ResourceWhereInput) {
  return prisma.resource.count({ where });
}

export async function countReviewTools(where: Prisma.ToolWhereInput) {
  return prisma.tool.count({ where });
}

export async function findReviewCourse(id: string) {
  return prisma.course.findUnique({ where: { id }, include: courseInclude });
}

export async function findReviewProject(id: string) {
  return prisma.project.findUnique({ where: { id }, include: projectInclude });
}

export async function findReviewResource(id: string) {
  return prisma.resource.findUnique({ where: { id }, include: resourceInclude });
}

export async function findReviewTool(id: string) {
  return prisma.tool.findUnique({ where: { id }, include: toolInclude });
}

export async function updateReviewCourse(id: string, data: Prisma.CourseUncheckedUpdateInput) {
  return prisma.course.update({ where: { id }, data, include: courseInclude });
}

export async function updateReviewProject(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
  return prisma.project.update({ where: { id }, data, include: projectInclude });
}

export async function updateReviewResource(id: string, data: Prisma.ResourceUncheckedUpdateInput) {
  return prisma.resource.update({ where: { id }, data, include: resourceInclude });
}

export async function updateReviewTool(id: string, data: Prisma.ToolUncheckedUpdateInput) {
  return prisma.tool.update({ where: { id }, data, include: toolInclude });
}

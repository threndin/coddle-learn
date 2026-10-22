import {
  isReviewKind,
  isReviewTab,
  parseReviewNote,
  REVIEW_KINDS,
  REVIEW_LIMITS,
  type ReviewCounts,
  type ReviewKind,
  type ReviewQueue,
  type ReviewQueueItem,
  type ReviewTab,
} from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { scheduleAchievementEvaluation } from "../achievements/achievements.service.js";
import {
  countReviewCourses,
  countReviewProjects,
  countReviewResources,
  countReviewTools,
  findReviewCourse,
  findReviewProject,
  findReviewResource,
  findReviewTool,
  listReviewCourses,
  listReviewProjects,
  listReviewResources,
  listReviewTools,
  updateReviewCourse,
  updateReviewProject,
  updateReviewResource,
  updateReviewTool,
  type ReviewCourse,
  type ReviewProject,
  type ReviewResource,
  type ReviewTool,
} from "./reviewers.repository.js";

type Filters = {
  tab: ReviewTab;
  kind: ReviewKind | "all";
  q: string;
  page: number;
};

const DECIDED_AFTER_MS = 60 * 24 * 60 * 60 * 1000;
const MAX_SEARCH_TERMS = 5;

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

function parseFilters(query: Record<string, unknown>): Filters {
  const tab = firstString(query.tab);
  const kind = firstString(query.kind);
  const page = Number.parseInt(firstString(query.page), 10);
  return {
    tab: isReviewTab(tab) ? tab : "pending",
    kind: isReviewKind(kind) ? kind : "all",
    q: firstString(query.q).slice(0, REVIEW_LIMITS.queryMax),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

function searchWhere(
  q: string,
  fields: readonly ("title" | "summary" | "description")[],
): Prisma.CourseWhereInput {
  const terms = q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
  if (terms.length === 0) return {};
  return {
    AND: terms.map((term) => ({
      OR: fields.map((field) => ({
        [field]: { contains: term, mode: "insensitive" as const },
      })),
    })),
  };
}

function decidedSince() {
  return new Date(Date.now() - DECIDED_AFTER_MS);
}

function studioWhere(tab: ReviewTab): Prisma.CourseWhereInput {
  if (tab === "flagged") return { flaggedAt: { not: null } };
  if (tab === "decided") {
    return {
      flaggedAt: null,
      reviewedAt: { gte: decidedSince() },
      status: { in: ["published", "changes_requested"] },
    };
  }
  return { status: "in_review", flaggedAt: null };
}

function catalogWhere(tab: ReviewTab): Prisma.ResourceWhereInput {
  if (tab === "flagged") return { flaggedAt: { not: null } };
  if (tab === "decided") {
    return {
      flaggedAt: null,
      reviewedAt: { gte: decidedSince() },
      status: { in: ["published", "rejected"] },
    };
  }
  return { status: "pending", flaggedAt: null };
}

function andWhere<T extends object>(...parts: T[]): T {
  return { AND: parts } as T;
}

function includeKind(filters: Filters, kind: ReviewKind) {
  return filters.kind === "all" || filters.kind === kind;
}

function skillsOf(rows: { skill: { slug: string; name: string } }[]) {
  return rows
    .map((row) => row.skill)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function courseItem(course: ReviewCourse): ReviewQueueItem {
  return {
    kind: "course",
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    href: `/courses/${course.slug}`,
    external: false,
    imageUrl: course.thumbnailUrl,
    status: course.status,
    flagged: Boolean(course.flaggedAt),
    flagNote: course.flagNote,
    reviewNote: course.reviewNote,
    submittedAt: course.submittedAt?.toISOString() ?? null,
    reviewedAt: course.reviewedAt?.toISOString() ?? null,
    createdAt: course.createdAt.toISOString(),
    submittedBy: course.createdBy,
    skills: skillsOf(course.skills),
    meta: { level: course.level, estimatedHours: course.estimatedHours },
  };
}

function projectItem(project: ReviewProject): ReviewQueueItem {
  return {
    kind: "project",
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    href: `/projects/${project.slug}`,
    external: false,
    imageUrl: project.exampleImageUrl,
    status: project.status,
    flagged: Boolean(project.flaggedAt),
    flagNote: project.flagNote,
    reviewNote: project.reviewNote,
    submittedAt: project.submittedAt?.toISOString() ?? null,
    reviewedAt: project.reviewedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    submittedBy: project.createdBy,
    skills: skillsOf(project.skills),
    meta: { level: project.level, estimatedHours: project.estimatedHours },
  };
}

function resourceItem(resource: ReviewResource): ReviewQueueItem {
  return {
    kind: "resource",
    id: resource.id,
    slug: null,
    title: resource.title,
    summary: resource.description,
    href: resource.url,
    external: true,
    imageUrl: null,
    status: resource.status,
    flagged: Boolean(resource.flaggedAt),
    flagNote: resource.flagNote,
    reviewNote: resource.reviewNote,
    submittedAt: resource.createdAt.toISOString(),
    reviewedAt: resource.reviewedAt?.toISOString() ?? null,
    createdAt: resource.createdAt.toISOString(),
    submittedBy: resource.submittedBy,
    skills: skillsOf(resource.skills),
    meta: { level: resource.level, type: resource.type },
  };
}

function toolItem(tool: ReviewTool): ReviewQueueItem {
  return {
    kind: "tool",
    id: tool.id,
    slug: tool.slug,
    title: tool.title,
    summary: tool.summary,
    href: `/tools/${tool.slug}`,
    external: false,
    imageUrl: tool.imageUrl,
    status: tool.status,
    flagged: Boolean(tool.flaggedAt),
    flagNote: tool.flagNote,
    reviewNote: tool.reviewNote,
    submittedAt: tool.createdAt.toISOString(),
    reviewedAt: tool.reviewedAt?.toISOString() ?? null,
    createdAt: tool.createdAt.toISOString(),
    submittedBy: tool.submittedBy,
    skills: skillsOf(tool.skills),
    meta: { category: tool.category },
  };
}

function sortItems(items: ReviewQueueItem[]) {
  return items.sort((a, b) => {
    const left = a.submittedAt ?? a.createdAt;
    const right = b.submittedAt ?? b.createdAt;
    return right.localeCompare(left);
  });
}

async function loadBucket(tab: ReviewTab, q: string) {
  const courseWhere = andWhere(studioWhere(tab), searchWhere(q, ["title", "summary"]));
  const projectWhere = andWhere(
    studioWhere(tab) as Prisma.ProjectWhereInput,
    searchWhere(q, ["title", "summary"]) as Prisma.ProjectWhereInput,
  );
  const resourceWhere = andWhere(
    catalogWhere(tab),
    searchWhere(q, ["title", "description"]) as Prisma.ResourceWhereInput,
  );
  const toolWhere = andWhere(
    catalogWhere(tab) as Prisma.ToolWhereInput,
    searchWhere(q, ["title", "summary"]) as Prisma.ToolWhereInput,
  );

  const [courses, projects, resources, tools] = await Promise.all([
    listReviewCourses(courseWhere),
    listReviewProjects(projectWhere),
    listReviewResources(resourceWhere),
    listReviewTools(toolWhere),
  ]);

  return {
    course: courses.map(courseItem),
    project: projects.map(projectItem),
    resource: resources.map(resourceItem),
    tool: tools.map(toolItem),
  };
}

async function countAllTabs(q: string) {
  const emptyKinds = (): Record<ReviewKind, number> => ({
    course: 0,
    project: 0,
    resource: 0,
    tool: 0,
  });

  async function countsFor(tab: ReviewTab) {
    const [course, project, resourceCount, toolCount] = await Promise.all([
      countReviewCourses(andWhere(studioWhere(tab), searchWhere(q, ["title", "summary"]))),
      countReviewProjects(
        andWhere(
          studioWhere(tab) as Prisma.ProjectWhereInput,
          searchWhere(q, ["title", "summary"]) as Prisma.ProjectWhereInput,
        ),
      ),
      countReviewResources(
        andWhere(
          catalogWhere(tab),
          searchWhere(q, ["title", "description"]) as Prisma.ResourceWhereInput,
        ),
      ),
      countReviewTools(
        andWhere(
          catalogWhere(tab) as Prisma.ToolWhereInput,
          searchWhere(q, ["title", "summary"]) as Prisma.ToolWhereInput,
        ),
      ),
    ]);
    const kinds = emptyKinds();
    kinds.course = course;
    kinds.project = project;
    kinds.resource = resourceCount;
    kinds.tool = toolCount;
    return { total: course + project + resourceCount + toolCount, kinds };
  }

  const [pending, flagged, decided] = await Promise.all([
    countsFor("pending"),
    countsFor("flagged"),
    countsFor("decided"),
  ]);

  return { pending, flagged, decided };
}


export async function getReviewQueue(
  _userId: string,
  query: Record<string, unknown>,
): Promise<ReviewQueue> {
  const filters = parseFilters(query);
  const [bucket, tabCounts] = await Promise.all([
    loadBucket(filters.tab, filters.q),
    countAllTabs(filters.q),
  ]);

  const current = tabCounts[filters.tab];
  const merged = sortItems(
    REVIEW_KINDS.flatMap((kind) => (includeKind(filters, kind) ? bucket[kind] : [])),
  );
  const total =
    filters.kind === "all"
      ? current.total
      : current.kinds[filters.kind];
  const pageSize = REVIEW_LIMITS.pageSize;
  const start = (filters.page - 1) * pageSize;

  const counts: ReviewCounts = {
    pending: tabCounts.pending.total,
    flagged: tabCounts.flagged.total,
    decided: tabCounts.decided.total,
    kinds: current.kinds,
  };

  return {
    items: merged.slice(start, start + pageSize),
    page: filters.page,
    pageSize,
    total,
    hasMore: start + pageSize < total,
    counts,
    reviewMode: config.reviewMode,
  };
}

function clearFlag() {
  return { flaggedAt: null, flaggedByUserId: null, flagNote: null };
}

const STUDIO_APPROVE = new Set(["in_review", "changes_requested", "published"]);
const STUDIO_DECLINE = new Set(["in_review", "published"]);
const STUDIO_FLAG = new Set(["in_review", "published", "changes_requested"]);
const CATALOG_APPROVE = new Set(["pending", "rejected", "published"]);
const CATALOG_DECLINE = new Set(["pending", "published"]);
const CATALOG_FLAG = new Set(["pending", "published", "rejected"]);

function missing(kind: ReviewKind): never {
  throw new AppError(404, "review_missing", `That ${kind} could not be found.`);
}

function badTransition(kind: ReviewKind, action: string): never {
  throw new AppError(
    409,
    "invalid_transition",
    `This ${kind} cannot be ${action} in its current state.`,
  );
}

async function decideCourse(
  reviewerId: string,
  id: string,
  action: "approve" | "decline" | "flag",
  note: string | null,
) {
  const course = await findReviewCourse(id);
  if (!course) missing("course");
  const now = new Date();

  if (action === "approve") {
    if (!STUDIO_APPROVE.has(course.status)) badTransition("course", "approved");
    const updated = await updateReviewCourse(course.id, {
      status: "published",
      submittedAt: course.submittedAt ?? now,
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      publishedAt: course.publishedAt ?? now,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return courseItem(updated);
  }

  if (action === "decline") {
    if (!STUDIO_DECLINE.has(course.status) && !course.flaggedAt) {
      badTransition("course", "declined");
    }
    const updated = await updateReviewCourse(course.id, {
      status: "changes_requested",
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return courseItem(updated);
  }

  if (!STUDIO_FLAG.has(course.status)) badTransition("course", "flagged");
  const updated = await updateReviewCourse(course.id, {
    flaggedAt: now,
    flaggedByUserId: reviewerId,
    flagNote: note,
  });
  return courseItem(updated);
}

async function decideProject(
  reviewerId: string,
  id: string,
  action: "approve" | "decline" | "flag",
  note: string | null,
) {
  const project = await findReviewProject(id);
  if (!project) missing("project");
  const now = new Date();

  if (action === "approve") {
    if (!STUDIO_APPROVE.has(project.status)) badTransition("project", "approved");
    const updated = await updateReviewProject(project.id, {
      status: "published",
      submittedAt: project.submittedAt ?? now,
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      publishedAt: project.publishedAt ?? now,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return projectItem(updated);
  }

  if (action === "decline") {
    if (!STUDIO_DECLINE.has(project.status) && !project.flaggedAt) {
      badTransition("project", "declined");
    }
    const updated = await updateReviewProject(project.id, {
      status: "changes_requested",
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return projectItem(updated);
  }

  if (!STUDIO_FLAG.has(project.status)) badTransition("project", "flagged");
  const updated = await updateReviewProject(project.id, {
    flaggedAt: now,
    flaggedByUserId: reviewerId,
    flagNote: note,
  });
  return projectItem(updated);
}

async function decideResource(
  reviewerId: string,
  id: string,
  action: "approve" | "decline" | "flag",
  note: string | null,
) {
  const resource = await findReviewResource(id);
  if (!resource) missing("resource");
  const now = new Date();

  if (action === "approve") {
    if (!CATALOG_APPROVE.has(resource.status)) badTransition("resource", "approved");
    const updated = await updateReviewResource(resource.id, {
      status: "published",
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      publishedAt: resource.publishedAt ?? now,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return resourceItem(updated);
  }

  if (action === "decline") {
    if (!CATALOG_DECLINE.has(resource.status) && !resource.flaggedAt) {
      badTransition("resource", "declined");
    }
    const updated = await updateReviewResource(resource.id, {
      status: "rejected",
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      publishedAt: null,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return resourceItem(updated);
  }

  if (!CATALOG_FLAG.has(resource.status)) badTransition("resource", "flagged");
  const updated = await updateReviewResource(resource.id, {
    flaggedAt: now,
    flaggedByUserId: reviewerId,
    flagNote: note,
  });
  return resourceItem(updated);
}

async function decideTool(
  reviewerId: string,
  id: string,
  action: "approve" | "decline" | "flag",
  note: string | null,
) {
  const tool = await findReviewTool(id);
  if (!tool) missing("tool");
  const now = new Date();

  if (action === "approve") {
    if (!CATALOG_APPROVE.has(tool.status)) badTransition("tool", "approved");
    const updated = await updateReviewTool(tool.id, {
      status: "published",
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      publishedAt: tool.publishedAt ?? now,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return toolItem(updated);
  }

  if (action === "decline") {
    if (!CATALOG_DECLINE.has(tool.status) && !tool.flaggedAt) {
      badTransition("tool", "declined");
    }
    const updated = await updateReviewTool(tool.id, {
      status: "rejected",
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      reviewNote: note,
      publishedAt: null,
      ...clearFlag(),
    });
    scheduleAchievementEvaluation(reviewerId);
    return toolItem(updated);
  }

  if (!CATALOG_FLAG.has(tool.status)) badTransition("tool", "flagged");
  const updated = await updateReviewTool(tool.id, {
    flaggedAt: now,
    flaggedByUserId: reviewerId,
    flagNote: note,
  });
  return toolItem(updated);
}

export async function decideReviewItem(
  reviewerId: string,
  kindRaw: string,
  id: string,
  action: "approve" | "decline" | "flag",
  input: unknown,
) {
  if (!isReviewKind(kindRaw)) {
    throw new AppError(400, "invalid_kind", "That content type cannot be reviewed.");
  }
  const parsed = parseReviewNote(input, { required: action !== "approve" });
  if (!parsed.ok) {
    throw new AppError(400, "invalid_note", parsed.message);
  }

  if (kindRaw === "course") return decideCourse(reviewerId, id, action, parsed.note);
  if (kindRaw === "project") return decideProject(reviewerId, id, action, parsed.note);
  if (kindRaw === "resource") return decideResource(reviewerId, id, action, parsed.note);
  return decideTool(reviewerId, id, action, parsed.note);
}

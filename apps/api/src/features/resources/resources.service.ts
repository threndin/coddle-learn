import {
  isExperienceLevel,
  isResourceType,
  normalizeResourceUrl,
  RESOURCE_LIMITS,
  RESOURCE_SCOPES,
  RESOURCE_SORTS,
  RESOURCE_TYPES,
  resourceHost,
  type ResourceScope,
  type ResourceSort,
} from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import {
  countResources,
  countResourceBookmarks,
  countResourcesByType,
  countSubmissionsSince,
  createResource,
  deleteBookmark,
  deleteResource,
  findResourceById,
  findResourceByUrl,
  findSkillIdsBySlugs,
  listBookmarkedResourceIds,
  listResources,
  listResourceSkills,
  type ResourceWithRelations,
  upsertBookmark,
} from "./resources.repository.js";

type CatalogFilters = {
  q: string;
  type: string | null;
  level: string | null;
  skill: string | null;
  scope: ResourceScope;
  sort: ResourceSort;
  page: number;
};

const MAX_SEARCH_TERMS = 5;

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

/** Query strings are user-editable, so unknown values fall back instead of erroring. */
function parseFilters(query: Record<string, unknown>): CatalogFilters {
  const type = firstString(query.type);
  const level = firstString(query.level);
  const scope = firstString(query.scope);
  const sort = firstString(query.sort);
  const page = Number.parseInt(firstString(query.page), 10);
  return {
    q: firstString(query.q).slice(0, RESOURCE_LIMITS.queryMax),
    type: isResourceType(type) ? type : null,
    level: isExperienceLevel(level) ? level : null,
    skill: firstString(query.skill).slice(0, 64) || null,
    scope: (RESOURCE_SCOPES as readonly string[]).includes(scope)
      ? (scope as ResourceScope)
      : "all",
    sort: (RESOURCE_SORTS as readonly string[]).includes(sort)
      ? (sort as ResourceSort)
      : "popular",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

function visibleTo(userId: string): Prisma.ResourceWhereInput {
  return { OR: [{ status: "published" }, { submittedByUserId: userId }] };
}

function scopeWhere(userId: string, scope: ResourceScope): Prisma.ResourceWhereInput {
  if (scope === "mine") return { submittedByUserId: userId };
  if (scope === "saved") {
    return { AND: [visibleTo(userId), { bookmarks: { some: { userId } } }] };
  }
  return { status: "published" };
}

function buildWhere(
  userId: string,
  filters: CatalogFilters,
  options: { ignoreType?: boolean } = {},
): Prisma.ResourceWhereInput {
  const and: Prisma.ResourceWhereInput[] = [scopeWhere(userId, filters.scope)];
  if (filters.type && !options.ignoreType) and.push({ type: filters.type });
  if (filters.level) and.push({ level: filters.level });
  if (filters.skill) and.push({ skills: { some: { skill: { slug: filters.skill } } } });

  const terms = filters.q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
  for (const term of terms) {
    const contains = { contains: term, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { description: contains },
        { url: contains },
        { skills: { some: { skill: { name: contains } } } },
      ],
    });
  }
  return { AND: and };
}

function orderFor(sort: ResourceSort): Prisma.ResourceOrderByWithRelationInput[] {
  if (sort === "newest") {
    return [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }];
  }
  if (sort === "title") return [{ title: "asc" }];
  return [
    { bookmarks: { _count: "desc" } },
    { steps: { _count: "desc" } },
    { title: "asc" },
  ];
}

function toItem(resource: ResourceWithRelations, userId: string, bookmarked: Set<string>) {
  const isOwner = resource.submittedByUserId === userId;
  const usedIn = [...resource.steps]
    .sort(
      (a, b) =>
        a.step.roadmap.sortOrder - b.step.roadmap.sortOrder || a.step.sortOrder - b.step.sortOrder,
    )
    .map((link) => ({
      roadmapSlug: link.step.roadmap.slug,
      roadmapName: link.step.roadmap.name,
      stepSlug: link.step.slug,
      stepTitle: link.step.title,
    }));

  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    url: resource.url,
    host: resourceHost(resource.url),
    type: resource.type,
    level: resource.level,
    status: resource.status,
    reviewNote: isOwner ? resource.reviewNote : null,
    skills: resource.skills
      .map((row) => row.skill)
      .sort((a, b) => a.name.localeCompare(b.name)),
    bookmarked: bookmarked.has(resource.id),
    bookmarkCount: resource._count.bookmarks,
    submittedBy: resource.submittedBy,
    isOwner,
    usedIn,
    createdAt: resource.createdAt.toISOString(),
    publishedAt: resource.publishedAt?.toISOString() ?? null,
  };
}

export async function getResourceCatalog(userId: string, query: Record<string, unknown>) {
  const filters = parseFilters(query);
  const pageSize = RESOURCE_LIMITS.pageSize;

  const [{ rows, total }, typeCounts, skills, savedCount, mineCount] = await Promise.all([
    listResources({
      where: buildWhere(userId, filters),
      orderBy: orderFor(filters.sort),
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
    }),
    countResourcesByType(buildWhere(userId, filters, { ignoreType: true })),
    listResourceSkills(),
    countResources(scopeWhere(userId, "saved")),
    countResources(scopeWhere(userId, "mine")),
  ]);

  const bookmarked = await listBookmarkedResourceIds(
    userId,
    rows.map((row) => row.id),
  );

  return {
    resources: rows.map((row) => toItem(row, userId, bookmarked)),
    page: filters.page,
    pageSize,
    total,
    hasMore: filters.page * pageSize < total,
    typeCounts: Object.fromEntries(RESOURCE_TYPES.map((type) => [type, typeCounts.get(type) ?? 0])),
    skills,
    counts: { saved: savedCount, mine: mineCount },
  };
}

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function submitResource(userId: string, input: unknown) {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_resource", "Resource details were missing.");
  }
  const body = input as Record<string, unknown>;

  const url = normalizeResourceUrl(readString(body, "url"));
  if (!url) {
    throw new AppError(400, "invalid_url", "Enter a public http or https link.");
  }

  const title = readString(body, "title").replace(/\s+/g, " ");
  if (title.length < RESOURCE_LIMITS.titleMin || title.length > RESOURCE_LIMITS.titleMax) {
    throw new AppError(
      400,
      "invalid_title",
      `Titles need ${RESOURCE_LIMITS.titleMin}–${RESOURCE_LIMITS.titleMax} characters.`,
    );
  }

  const description = readString(body, "description");
  if (
    description.length < RESOURCE_LIMITS.descriptionMin ||
    description.length > RESOURCE_LIMITS.descriptionMax
  ) {
    throw new AppError(
      400,
      "invalid_description",
      `Descriptions need ${RESOURCE_LIMITS.descriptionMin}–${RESOURCE_LIMITS.descriptionMax} characters.`,
    );
  }

  const type = readString(body, "type");
  if (!isResourceType(type)) {
    throw new AppError(400, "invalid_type", "Choose what kind of resource this is.");
  }

  const level = readString(body, "level");
  if (!isExperienceLevel(level)) {
    throw new AppError(400, "invalid_level", "Choose who this resource is for.");
  }

  const rawSkills = Array.isArray(body.skillSlugs) ? body.skillSlugs : [];
  const skillSlugs = [
    ...new Set(rawSkills.filter((slug): slug is string => typeof slug === "string")),
  ];
  if (skillSlugs.length > RESOURCE_LIMITS.skillMax) {
    throw new AppError(
      400,
      "invalid_skills",
      `Tag up to ${RESOURCE_LIMITS.skillMax} technologies.`,
    );
  }
  const skills = await findSkillIdsBySlugs(skillSlugs);
  if (skills.length !== skillSlugs.length) {
    throw new AppError(400, "invalid_skills", "One of those technologies is not in the catalog.");
  }

  const existing = await findResourceByUrl(url);
  if (existing) {
    throw new AppError(409, "resource_exists", `“${existing.title}” is already listed.`, {
      resourceId: existing.id,
      status: existing.status,
    });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if ((await countSubmissionsSince(userId, since)) >= RESOURCE_LIMITS.dailySubmissions) {
    throw new AppError(
      429,
      "submission_limit",
      `You can share up to ${RESOURCE_LIMITS.dailySubmissions} resources a day. Try again tomorrow.`,
    );
  }

  const autoPublish = config.resourceReviewMode === "auto";
  const created = await createResource({
    url,
    title,
    description,
    type,
    level,
    status: autoPublish ? "published" : "pending",
    publishedAt: autoPublish ? new Date() : null,
    submittedByUserId: userId,
    skillIds: skills.map((skill) => skill.id),
  });

  return { resource: toItem(created, userId, new Set()) };
}

export async function removeResource(userId: string, resourceId: string) {
  const resource = await findResourceById(resourceId);
  if (!resource || resource.submittedByUserId !== userId) {
    throw new AppError(404, "resource_missing", "That resource could not be found.");
  }
  if (resource.steps.length > 0) {
    throw new AppError(
      409,
      "resource_in_use",
      "Roadmaps link to this resource, so it can't be removed.",
    );
  }
  await deleteResource(resource.id);
  return { deleted: true };
}

export async function setResourceBookmark(userId: string, resourceId: string, saved: boolean) {
  const resource = await findResourceById(resourceId);
  const visible =
    resource && (resource.status === "published" || resource.submittedByUserId === userId);
  if (!visible) {
    throw new AppError(404, "resource_missing", "That resource could not be found.");
  }

  if (saved) await upsertBookmark(userId, resource.id);
  else await deleteBookmark(userId, resource.id);

  return {
    bookmarked: saved,
    bookmarkCount: await countResourceBookmarks(resource.id),
  };
}

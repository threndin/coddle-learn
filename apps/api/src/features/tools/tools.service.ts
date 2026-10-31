import { randomBytes } from "node:crypto";
import {
  isToolCategory,
  isToolPlatform,
  isToolPricing,
  normalizeResourceUrl,
  normalizeToolImageUrl,
  resourceHost,
  TOOL_CATEGORIES,
  TOOL_IMAGE_TYPES,
  TOOL_LIMITS,
  TOOL_SCOPES,
  TOOL_SORTS,
  toolSlugFromTitle,
  type ToolScope,
  type ToolSort,
} from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { config, isR2Configured } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { assertR2UploadLimit } from "../../shared/rate-limit.js";
import { notifyToolSaved } from "../notifications/notifications.events.js";
import { isReviewerUser } from "../users/users.service.js";
import { imageExtension, uploadToR2 } from "../../shared/r2.js";
import {
  countSubmissionsSince,
  countToolBookmarks,
  countTools,
  countToolsByCategory,
  createTool,
  deleteBookmark,
  deleteTool,
  findSkillIdsBySlugs,
  findToolById,
  findToolBySlug,
  findToolByUrl,
  listBookmarkedToolIds,
  listTools,
  listToolSkills,
  toolSlugsLike,
  type ToolWithRelations,
  upsertBookmark,
} from "./tools.repository.js";

type CatalogFilters = {
  q: string;
  category: string | null;
  pricing: string | null;
  skill: string | null;
  scope: ToolScope;
  sort: ToolSort;
  page: number;
};

const MAX_SEARCH_TERMS = 5;

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

function parseFilters(query: Record<string, unknown>): CatalogFilters {
  const category = firstString(query.category);
  const pricing = firstString(query.pricing);
  const scope = firstString(query.scope);
  const sort = firstString(query.sort);
  const page = Number.parseInt(firstString(query.page), 10);
  return {
    q: firstString(query.q).slice(0, TOOL_LIMITS.queryMax),
    category: isToolCategory(category) ? category : null,
    pricing: isToolPricing(pricing) ? pricing : null,
    skill: firstString(query.skill).slice(0, 64) || null,
    scope: (TOOL_SCOPES as readonly string[]).includes(scope) ? (scope as ToolScope) : "all",
    sort: (TOOL_SORTS as readonly string[]).includes(sort) ? (sort as ToolSort) : "featured",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

function visibleTo(userId: string): Prisma.ToolWhereInput {
  return { OR: [{ status: "published" }, { submittedByUserId: userId }] };
}

function scopeWhere(userId: string, scope: ToolScope): Prisma.ToolWhereInput {
  if (scope === "mine") return { submittedByUserId: userId };
  if (scope === "saved") {
    return { AND: [visibleTo(userId), { bookmarks: { some: { userId } } }] };
  }
  return { status: "published" };
}

function buildWhere(
  userId: string,
  filters: CatalogFilters,
  options: { ignoreCategory?: boolean } = {},
): Prisma.ToolWhereInput {
  const and: Prisma.ToolWhereInput[] = [scopeWhere(userId, filters.scope)];
  if (filters.category && !options.ignoreCategory) and.push({ category: filters.category });
  if (filters.pricing) and.push({ pricing: filters.pricing });
  if (filters.skill) and.push({ skills: { some: { skill: { slug: filters.skill } } } });

  const terms = filters.q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
  for (const term of terms) {
    const contains = { contains: term, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { summary: contains },
        { url: contains },
        { skills: { some: { skill: { name: contains } } } },
      ],
    });
  }
  return { AND: and };
}

function orderFor(sort: ToolSort): Prisma.ToolOrderByWithRelationInput[] {
  if (sort === "newest") {
    return [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }];
  }
  if (sort === "title") return [{ title: "asc" }];
  if (sort === "popular") {
    return [{ bookmarks: { _count: "desc" } }, { title: "asc" }];
  }
  return [{ sortOrder: "asc" }, { bookmarks: { _count: "desc" } }, { title: "asc" }];
}

function toItem(tool: ToolWithRelations, userId: string, bookmarked: Set<string>) {
  const isOwner = tool.submittedByUserId === userId;
  return {
    id: tool.id,
    slug: tool.slug,
    title: tool.title,
    summary: tool.summary,
    url: tool.url,
    host: resourceHost(tool.url),
    imageUrl: tool.imageUrl,
    category: tool.category,
    pricing: tool.pricing,
    platforms: tool.platforms,
    status: tool.status,
    reviewNote: isOwner ? tool.reviewNote : null,
    skills: tool.skills.map((row) => row.skill).sort((a, b) => a.name.localeCompare(b.name)),
    bookmarked: bookmarked.has(tool.id),
    bookmarkCount: tool._count.bookmarks,
    submittedBy: tool.submittedBy,
    isOwner,
    createdAt: tool.createdAt.toISOString(),
    publishedAt: tool.publishedAt?.toISOString() ?? null,
  };
}

export async function getToolCatalog(userId: string, query: Record<string, unknown>) {
  const filters = parseFilters(query);
  const pageSize = TOOL_LIMITS.pageSize;

  const [{ rows, total }, categoryCounts, skills, savedCount, mineCount] = await Promise.all([
    listTools({
      where: buildWhere(userId, filters),
      orderBy: orderFor(filters.sort),
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
    }),
    countToolsByCategory(buildWhere(userId, filters, { ignoreCategory: true })),
    listToolSkills(),
    countTools(scopeWhere(userId, "saved")),
    countTools(scopeWhere(userId, "mine")),
  ]);

  const bookmarked = await listBookmarkedToolIds(
    userId,
    rows.map((row) => row.id),
  );

  return {
    tools: rows.map((row) => toItem(row, userId, bookmarked)),
    page: filters.page,
    pageSize,
    total,
    hasMore: filters.page * pageSize < total,
    categoryCounts: Object.fromEntries(
      TOOL_CATEGORIES.map((category) => [category, categoryCounts.get(category) ?? 0]),
    ),
    skills,
    counts: { saved: savedCount, mine: mineCount },
    uploadsEnabled: isR2Configured(),
  };
}

export async function getToolBySlug(userId: string, slug: string) {
  const tool = await findToolBySlug(slug);
  const visible =
    tool &&
    (tool.status === "published" ||
      tool.submittedByUserId === userId ||
      (tool.status !== "published" && (await isReviewerUser(userId))));
  if (!visible) {
    throw new AppError(404, "tool_missing", "That tool could not be found.");
  }
  const bookmarked = await listBookmarkedToolIds(userId, [tool.id]);
  return { tool: toItem(tool, userId, bookmarked) };
}

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function submitTool(userId: string, input: unknown) {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_tool", "Tool details were missing.");
  }
  const body = input as Record<string, unknown>;

  const url = normalizeResourceUrl(readString(body, "url"));
  if (!url) {
    throw new AppError(400, "invalid_url", "Enter a public http or https link.");
  }

  const imageUrl = normalizeToolImageUrl(readString(body, "imageUrl"));
  if (!imageUrl) {
    throw new AppError(400, "invalid_image", "Add a public image URL, or upload a cover image.");
  }

  const title = readString(body, "title").replace(/\s+/g, " ");
  if (title.length < TOOL_LIMITS.titleMin || title.length > TOOL_LIMITS.titleMax) {
    throw new AppError(
      400,
      "invalid_title",
      `Names need ${TOOL_LIMITS.titleMin}–${TOOL_LIMITS.titleMax} characters.`,
    );
  }

  const summary = readString(body, "summary");
  if (summary.length < TOOL_LIMITS.summaryMin || summary.length > TOOL_LIMITS.summaryMax) {
    throw new AppError(
      400,
      "invalid_summary",
      `Descriptions need ${TOOL_LIMITS.summaryMin}–${TOOL_LIMITS.summaryMax} characters.`,
    );
  }

  const category = readString(body, "category");
  if (!isToolCategory(category)) {
    throw new AppError(400, "invalid_category", "Choose what kind of tool this is.");
  }

  const pricing = readString(body, "pricing");
  if (!isToolPricing(pricing)) {
    throw new AppError(400, "invalid_pricing", "Choose how this tool is priced.");
  }

  const rawPlatforms = Array.isArray(body.platforms) ? body.platforms : [];
  const platforms = [
    ...new Set(rawPlatforms.filter((value): value is string => isToolPlatform(value))),
  ];
  if (platforms.length === 0) {
    throw new AppError(400, "invalid_platforms", "Pick at least one platform.");
  }
  if (platforms.length > TOOL_LIMITS.platformMax) {
    throw new AppError(
      400,
      "invalid_platforms",
      `Pick up to ${TOOL_LIMITS.platformMax} platforms.`,
    );
  }

  const rawSkills = Array.isArray(body.skillSlugs) ? body.skillSlugs : [];
  const skillSlugs = [
    ...new Set(rawSkills.filter((slug): slug is string => typeof slug === "string")),
  ];
  if (skillSlugs.length > TOOL_LIMITS.skillMax) {
    throw new AppError(
      400,
      "invalid_skills",
      `Tag up to ${TOOL_LIMITS.skillMax} technologies.`,
    );
  }
  const skills = await findSkillIdsBySlugs(skillSlugs);
  if (skills.length !== skillSlugs.length) {
    throw new AppError(400, "invalid_skills", "One of those technologies is not in the catalog.");
  }

  const existing = await findToolByUrl(url);
  if (existing) {
    throw new AppError(409, "tool_exists", `“${existing.title}” is already listed.`, {
      toolId: existing.id,
      slug: existing.slug,
      status: existing.status,
    });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if ((await countSubmissionsSince(userId, since)) >= TOOL_LIMITS.dailySubmissions) {
    throw new AppError(
      429,
      "submission_limit",
      `You can share up to ${TOOL_LIMITS.dailySubmissions} tools a day. Try again tomorrow.`,
    );
  }

  const autoPublish = config.reviewMode === "auto";
  const slugBase = toolSlugFromTitle(title, []);
  const slug = toolSlugFromTitle(title, await toolSlugsLike(slugBase));

  const created = await createTool({
    slug,
    url,
    title,
    summary,
    imageUrl,
    category,
    pricing,
    platforms,
    status: autoPublish ? "published" : "pending",
    publishedAt: autoPublish ? new Date() : null,
    submittedByUserId: userId,
    skillIds: skills.map((skill) => skill.id),
  });

  return { tool: toItem(created, userId, new Set()) };
}

export async function removeTool(userId: string, toolId: string) {
  const tool = await findToolById(toolId);
  if (!tool || tool.submittedByUserId !== userId) {
    throw new AppError(404, "tool_missing", "That tool could not be found.");
  }
  await deleteTool(tool.id);
  return { deleted: true };
}

export async function setToolBookmark(userId: string, toolId: string, saved: boolean) {
  const tool = await findToolById(toolId);
  const visible = tool && (tool.status === "published" || tool.submittedByUserId === userId);
  if (!visible) {
    throw new AppError(404, "tool_missing", "That tool could not be found.");
  }

  if (saved) {
    const already = await listBookmarkedToolIds(userId, [tool.id]);
    await upsertBookmark(userId, tool.id);
    if (!already.has(tool.id)) {
      await notifyToolSaved({
        userId,
        toolId: tool.id,
        toolSlug: tool.slug,
        title: tool.title,
      });
    }
  } else {
    await deleteBookmark(userId, tool.id);
  }

  return {
    bookmarked: saved,
    bookmarkCount: await countToolBookmarks(tool.id),
  };
}

function sniffImage(buffer: Buffer, contentType: string): boolean {
  const hex = buffer.subarray(0, 12).toString("hex");
  switch (contentType) {
    case "image/png":
      return hex.startsWith("89504e470d0a1a0a");
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/gif":
      return hex.startsWith("47494638");
    case "image/webp":
      return hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
    default:
      return false;
  }
}

function readImage(contentType: string | undefined, body: unknown) {
  if (!isR2Configured()) {
    throw new AppError(503, "uploads_unavailable", "Image uploads are not configured on this server.");
  }
  const type = (contentType ?? "").split(";")[0]!.trim().toLowerCase();
  if (!(TOOL_IMAGE_TYPES as readonly string[]).includes(type)) {
    throw new AppError(415, "unsupported_image", "Upload a PNG, JPEG, WebP, or GIF image.");
  }
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new AppError(400, "empty_upload", "The image was empty.");
  }
  if (body.length > TOOL_LIMITS.imageBytesMax) {
    throw new AppError(
      413,
      "image_too_large",
      `Images must be ${Math.round(TOOL_LIMITS.imageBytesMax / (1024 * 1024))} MB or smaller.`,
    );
  }
  if (!sniffImage(body, type)) {
    throw new AppError(415, "unsupported_image", "That file does not look like a valid image.");
  }
  return { type, buffer: body, ext: imageExtension(type)! };
}

export async function uploadToolImage(
  userId: string,
  contentType: string | undefined,
  body: unknown,
) {
  const image = readImage(contentType, body);
  assertR2UploadLimit(userId);
  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const { url } = await uploadToR2({
    path: `tools/${userId}/${name}.${image.ext}`,
    body: image.buffer,
    contentType: image.type,
  });
  return { url };
}

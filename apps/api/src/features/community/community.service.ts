import { randomBytes } from "node:crypto";
import {
  COMMUNITY_IMAGE_TYPES,
  COMMUNITY_KINDS,
  COMMUNITY_LIMITS,
  COMMUNITY_REACTION_EMOJIS,
  COMMUNITY_SCOPES,
  isCommunityKind,
  isCommunityReactionEmoji,
  isCommunityTopic,
  type CommunityKind,
  type CommunityReactionEmoji,
  type CommunityScope,
  type CommunityTopic,
} from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { isR2Configured } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { imageExtension, uploadToR2 } from "../../shared/r2.js";
import { prisma } from "../../shared/db.js";
import {
  countCommunityPosts,
  countCommunityPostsByKind,
  countPostsSince,
  createCommunityPost,
  deleteReaction,
  findCommunityPost,
  findMyReaction,
  listCommunityPosts,
  listMyReactions,
  listReactionCounts,
  listSpotlightLearners,
  recordImpression,
  softDeleteCommunityPost,
  upsertReaction,
  type CommunityPostRow,
} from "./community.repository.js";

const SPOTLIGHT_TAKE = 5;

type CatalogFilters = {
  q: string;
  kind: CommunityKind | null;
  topic: CommunityTopic | null;
  scope: CommunityScope;
  page: number;
};

const MAX_SEARCH_TERMS = 5;
const RELATED_TAKE = 40;

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

function parseFilters(query: Record<string, unknown>): CatalogFilters {
  const kind = firstString(query.kind);
  const topic = firstString(query.topic);
  const scope = firstString(query.scope);
  const page = Number.parseInt(firstString(query.page), 10);
  return {
    q: firstString(query.q).slice(0, COMMUNITY_LIMITS.queryMax),
    kind: isCommunityKind(kind) ? kind : null,
    topic: isCommunityTopic(topic) ? topic : null,
    scope: (COMMUNITY_SCOPES as readonly string[]).includes(scope)
      ? (scope as CommunityScope)
      : "all",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

const notDeleted: Prisma.CommunityPostWhereInput = { isDeleted: false };

function buildWhere(userId: string, filters: CatalogFilters): Prisma.CommunityPostWhereInput {
  const and: Prisma.CommunityPostWhereInput[] = [notDeleted];
  if (filters.scope === "mine") and.push({ authorId: userId });
  if (filters.kind) and.push({ kind: filters.kind });
  if (filters.topic) and.push({ topic: filters.topic });

  const terms = filters.q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
  for (const term of terms) {
    const contains = { contains: term, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { body: contains },
        { relatedSlug: contains },
        { relatedTitle: contains },
      ],
    });
  }
  return { AND: and };
}

function relatedHref(topic: string, relatedSlug: string | null): string | null {
  if (!relatedSlug) return null;
  if (topic === "course") return `/courses/${relatedSlug}`;
  if (topic === "roadmap") return `/roadmaps/${relatedSlug}`;
  if (topic === "project") return `/projects/${relatedSlug}`;
  return null;
}

type ReactionCounts = Record<CommunityReactionEmoji, number>;

function emptyReactionCounts(): ReactionCounts {
  return Object.fromEntries(COMMUNITY_REACTION_EMOJIS.map((emoji) => [emoji, 0])) as ReactionCounts;
}

function postPayload(
  row: CommunityPostRow,
  userId: string,
  engagement: {
    reactionCounts: ReactionCounts;
    myReaction: CommunityReactionEmoji | null;
  } = {
    reactionCounts: emptyReactionCounts(),
    myReaction: null,
  },
) {
  return {
    id: row.id,
    kind: row.kind,
    topic: row.topic,
    relatedSlug: row.relatedSlug,
    relatedTitle: row.relatedTitle,
    relatedHref: relatedHref(row.topic, row.relatedSlug),
    title: row.title,
    body: row.body,
    imageUrls: row.imageUrls,
    impressionCount: row.impressionCount,
    commentCount: row.commentCount,
    reactionCounts: engagement.reactionCounts,
    myReaction: engagement.myReaction,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: {
      id: row.author.id,
      name: row.author.name,
      avatarUrl: row.author.avatarUrl,
    },
    isMine: row.authorId === userId,
  };
}

async function engagementForPosts(userId: string, postIds: string[]) {
  const [counts, mine] = await Promise.all([
    listReactionCounts(postIds),
    listMyReactions(userId, postIds),
  ]);
  const countsByPost = new Map<string, ReactionCounts>();
  for (const id of postIds) countsByPost.set(id, emptyReactionCounts());
  for (const row of counts) {
    if (!isCommunityReactionEmoji(row.emoji)) continue;
    const bucket = countsByPost.get(row.postId) ?? emptyReactionCounts();
    bucket[row.emoji] = row._count._all;
    countsByPost.set(row.postId, bucket);
  }
  const mineByPost = new Map<string, CommunityReactionEmoji>();
  for (const row of mine) {
    if (isCommunityReactionEmoji(row.emoji)) mineByPost.set(row.postId, row.emoji);
  }
  return { countsByPost, mineByPost };
}

function emptyKindCounts(): Record<CommunityKind, number> {
  return Object.fromEntries(COMMUNITY_KINDS.map((kind) => [kind, 0])) as Record<
    CommunityKind,
    number
  >;
}

export async function getCommunityCatalog(userId: string, query: Record<string, unknown>) {
  const filters = parseFilters(query);
  const where = buildWhere(userId, filters);
  const skip = (filters.page - 1) * COMMUNITY_LIMITS.pageSize;

  const [listed, kindCountsRaw, mineCount] = await Promise.all([
    listCommunityPosts({
      where,
      skip,
      take: COMMUNITY_LIMITS.pageSize,
    }),
    countCommunityPostsByKind(notDeleted),
    countCommunityPosts({ ...notDeleted, authorId: userId }),
  ]);

  const kindCounts = emptyKindCounts();
  for (const kind of COMMUNITY_KINDS) {
    kindCounts[kind] = kindCountsRaw.get(kind) ?? 0;
  }

  const postIds = listed.rows.map((row) => row.id);
  const { countsByPost, mineByPost } = await engagementForPosts(userId, postIds);

  return {
    posts: listed.rows.map((row) =>
      postPayload(row, userId, {
        reactionCounts: countsByPost.get(row.id) ?? emptyReactionCounts(),
        myReaction: mineByPost.get(row.id) ?? null,
      }),
    ),
    page: filters.page,
    pageSize: COMMUNITY_LIMITS.pageSize,
    total: listed.total,
    hasMore: skip + listed.rows.length < listed.total,
    kindCounts,
    counts: { mine: mineCount },
    filters: {
      q: filters.q,
      kind: filters.kind,
      topic: filters.topic,
      scope: filters.scope,
    },
  };
}

export type RelatedOption = { slug: string; title: string; subtitle: string | null };

export async function listRelatedOptions(
  topic: unknown,
  query: unknown,
): Promise<{ options: RelatedOption[] }> {
  if (!isCommunityTopic(topic) || topic === "general") {
    throw new AppError(400, "invalid_field", "Pick a course, roadmap, or project topic.", {
      field: "topic",
    });
  }
  const q = firstString(query).slice(0, COMMUNITY_LIMITS.queryMax).toLowerCase();
  const matches = (title: string, slug: string) => {
    if (!q) return true;
    return title.toLowerCase().includes(q) || slug.toLowerCase().includes(q);
  };

  if (topic === "course") {
    const rows = await prisma.course.findMany({
      where: { status: "published" },
      select: { slug: true, title: true, level: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      take: 200,
    });
    return {
      options: rows
        .filter((row) => matches(row.title, row.slug))
        .slice(0, RELATED_TAKE)
        .map((row) => ({
          slug: row.slug,
          title: row.title,
          subtitle: row.level,
        })),
    };
  }

  if (topic === "roadmap") {
    const rows = await prisma.roadmap.findMany({
      select: { slug: true, name: true, level: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 200,
    });
    return {
      options: rows
        .filter((row) => matches(row.name, row.slug))
        .slice(0, RELATED_TAKE)
        .map((row) => ({
          slug: row.slug,
          title: row.name,
          subtitle: row.level,
        })),
    };
  }

  const rows = await prisma.project.findMany({
    where: { status: "published" },
    select: { slug: true, title: true, level: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: 200,
  });
  return {
    options: rows
      .filter((row) => matches(row.title, row.slug))
      .slice(0, RELATED_TAKE)
      .map((row) => ({
        slug: row.slug,
        title: row.title,
        subtitle: row.level,
      })),
  };
}

async function resolveRelated(
  topic: CommunityTopic,
  relatedSlug: string | null,
): Promise<{ relatedSlug: string | null; relatedTitle: string | null }> {
  if (!relatedSlug || topic === "general") {
    return { relatedSlug: null, relatedTitle: null };
  }

  if (topic === "course") {
    const course = await prisma.course.findFirst({
      where: { slug: relatedSlug, status: "published" },
      select: { slug: true, title: true },
    });
    if (!course) {
      throw new AppError(400, "invalid_field", "Choose a published course.", {
        field: "relatedSlug",
      });
    }
    return { relatedSlug: course.slug, relatedTitle: course.title };
  }

  if (topic === "roadmap") {
    const roadmap = await prisma.roadmap.findUnique({
      where: { slug: relatedSlug },
      select: { slug: true, name: true },
    });
    if (!roadmap) {
      throw new AppError(400, "invalid_field", "Choose a roadmap.", { field: "relatedSlug" });
    }
    return { relatedSlug: roadmap.slug, relatedTitle: roadmap.name };
  }

  const project = await prisma.project.findFirst({
    where: { slug: relatedSlug, status: "published" },
    select: { slug: true, title: true },
  });
  if (!project) {
    throw new AppError(400, "invalid_field", "Choose a published project.", {
      field: "relatedSlug",
    });
  }
  return { relatedSlug: project.slug, relatedTitle: project.title };
}

function requireString(input: unknown, field: string, min: number, max: number) {
  if (typeof input !== "string") {
    throw new AppError(400, "invalid_field", `${field} must be text.`, { field });
  }
  const value = input.trim();
  if (value.length < min) {
    throw new AppError(400, "invalid_field", `${field} is too short.`, { field });
  }
  if (value.length > max) {
    throw new AppError(400, "invalid_field", `${field} is too long.`, { field });
  }
  return value;
}

function parseImageUrls(input: unknown): string[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) {
    throw new AppError(400, "invalid_field", "Images must be a list of URLs.", {
      field: "imageUrls",
    });
  }
  if (input.length > COMMUNITY_LIMITS.imagesMax) {
    throw new AppError(
      400,
      "invalid_field",
      `You can attach up to ${COMMUNITY_LIMITS.imagesMax} images.`,
      { field: "imageUrls" },
    );
  }
  const urls: string[] = [];
  for (const item of input) {
    if (typeof item !== "string" || !item.trim()) {
      throw new AppError(400, "invalid_field", "Each image must be a URL.", {
        field: "imageUrls",
      });
    }
    const url = item.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("data:image/")) {
      throw new AppError(400, "invalid_field", "Image URLs must be http(s).", {
        field: "imageUrls",
      });
    }
    urls.push(url);
  }
  return urls;
}

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
};

export async function createCommunityFeedPost(
  userId: string,
  input: unknown,
  files: UploadedImage[] = [],
) {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_body", "Post details were missing.");
  }
  const body = input as Record<string, unknown>;

  if (!isCommunityKind(body.kind)) {
    throw new AppError(400, "invalid_field", "Choose a post type.", { field: "kind" });
  }
  const topicRaw = body.topic ?? "general";
  if (!isCommunityTopic(topicRaw)) {
    throw new AppError(400, "invalid_field", "Choose a topic.", { field: "topic" });
  }

  let relatedSlug: string | null = null;
  if (body.relatedSlug !== undefined && body.relatedSlug !== null && body.relatedSlug !== "") {
    if (typeof body.relatedSlug !== "string") {
      throw new AppError(400, "invalid_field", "Related item must be a slug.", {
        field: "relatedSlug",
      });
    }
    relatedSlug = body.relatedSlug.trim().slice(0, COMMUNITY_LIMITS.relatedSlugMax) || null;
  }

  const related = await resolveRelated(topicRaw, relatedSlug);
  const title = requireString(
    body.title,
    "Title",
    COMMUNITY_LIMITS.titleMin,
    COMMUNITY_LIMITS.titleMax,
  );
  const postBody = requireString(
    body.body,
    "Body",
    COMMUNITY_LIMITS.bodyMin,
    COMMUNITY_LIMITS.bodyMax,
  );

  if (files.length > COMMUNITY_LIMITS.imagesMax) {
    throw new AppError(
      400,
      "invalid_field",
      `You can attach up to ${COMMUNITY_LIMITS.imagesMax} images.`,
      { field: "images" },
    );
  }

  // Prefer multipart files sent with the post. Legacy JSON `imageUrls` still works.
  const imageUrls =
    files.length > 0
      ? await Promise.all(files.map((file) => storeCommunityImage(userId, file)))
      : parseImageUrls(body.imageUrls);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await countPostsSince(userId, since);
  if (recent >= COMMUNITY_LIMITS.dailyPosts) {
    throw new AppError(
      429,
      "rate_limited",
      `You can post up to ${COMMUNITY_LIMITS.dailyPosts} times per day. Try again tomorrow.`,
    );
  }

  const row = await createCommunityPost({
    authorId: userId,
    kind: body.kind,
    topic: topicRaw,
    relatedSlug: related.relatedSlug,
    relatedTitle: related.relatedTitle,
    title,
    body: postBody,
    imageUrls,
  });

  return { post: postPayload(row, userId) };
}

async function storeCommunityImage(userId: string, file: UploadedImage) {
  const image = readImage(file.mimetype, file.buffer);
  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const { url } = await uploadToR2({
    path: `community/${userId}/${name}.${image.ext}`,
    body: image.buffer,
    contentType: image.type,
  });
  return url;
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
  if (!(COMMUNITY_IMAGE_TYPES as readonly string[]).includes(type)) {
    throw new AppError(415, "unsupported_image", "Upload a PNG, JPEG, WebP, or GIF image.");
  }
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new AppError(400, "empty_upload", "The image was empty.");
  }
  if (body.length > COMMUNITY_LIMITS.imageBytesMax) {
    throw new AppError(
      413,
      "image_too_large",
      `Images must be ${Math.round(COMMUNITY_LIMITS.imageBytesMax / (1024 * 1024))} MB or smaller.`,
    );
  }
  if (!sniffImage(body, type)) {
    throw new AppError(415, "unsupported_image", "That file does not look like a valid image.");
  }
  return { type, buffer: body, ext: imageExtension(type)! };
}

export async function uploadCommunityImage(
  userId: string,
  contentType: string | undefined,
  body: unknown,
) {
  const url = await storeCommunityImage(userId, {
    mimetype: contentType ?? "",
    buffer: Buffer.isBuffer(body) ? body : Buffer.alloc(0),
  });
  return { url };
}

export async function deleteCommunityFeedPost(userId: string, postId: string) {
  const deleted = await softDeleteCommunityPost(postId, userId);
  if (!deleted) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  return { ok: true as const };
}

export async function recordCommunityImpression(userId: string, postId: string) {
  const post = await findCommunityPost(postId);
  if (!post) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  const created = await recordImpression(post.id, userId);
  const impressionCount = created ? post.impressionCount + 1 : post.impressionCount;
  return { impressionCount, recorded: created };
}

async function reactionSnapshot(postId: string, userId: string) {
  const [counts, mine] = await Promise.all([
    listReactionCounts([postId]),
    findMyReaction(postId, userId),
  ]);
  const reactionCounts = emptyReactionCounts();
  for (const row of counts) {
    if (isCommunityReactionEmoji(row.emoji)) reactionCounts[row.emoji] = row._count._all;
  }
  return {
    reactionCounts,
    myReaction: mine && isCommunityReactionEmoji(mine.emoji) ? mine.emoji : null,
  };
}

export async function setCommunityReaction(userId: string, postId: string, input: unknown) {
  const post = await findCommunityPost(postId);
  if (!post) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_body", "Reaction details were missing.");
  }
  const emoji = (input as Record<string, unknown>).emoji;
  if (!isCommunityReactionEmoji(emoji)) {
    throw new AppError(400, "invalid_field", "Pick a valid reaction.", { field: "emoji" });
  }

  const existing = await findMyReaction(postId, userId);
  if (existing?.emoji === emoji) {
    await deleteReaction(postId, userId);
  } else {
    await upsertReaction(postId, userId, emoji);
  }

  return reactionSnapshot(postId, userId);
}

function spotlightNote(user: {
  experienceLevel: string | null;
  points: number;
  _count: { communityPosts: number; projectSubmissions: number };
}) {
  const bits: string[] = [];
  if (user.experienceLevel) {
    bits.push(user.experienceLevel.charAt(0).toUpperCase() + user.experienceLevel.slice(1));
  }
  if (user._count.communityPosts > 0) {
    bits.push(
      `${user._count.communityPosts} post${user._count.communityPosts === 1 ? "" : "s"}`,
    );
  } else if (user._count.projectSubmissions > 0) {
    bits.push(
      `${user._count.projectSubmissions} project${user._count.projectSubmissions === 1 ? "" : "s"}`,
    );
  } else {
    bits.push(`${user.points.toLocaleString()} pts`);
  }
  return bits.join(" · ");
}

export async function getSpotlightLearners(userId: string) {
  const rows = await listSpotlightLearners(userId, SPOTLIGHT_TAKE);
  return {
    learners: rows.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      points: user.points,
      experienceLevel: user.experienceLevel,
      postCount: user._count.communityPosts,
      projectCount: user._count.projectSubmissions,
      note: spotlightNote(user),
    })),
  };
}

import { randomBytes } from "node:crypto";
import {
  COMMUNITY_IMAGE_TYPES,
  COMMUNITY_KINDS,
  COMMUNITY_LIMITS,
  COMMUNITY_POST_CREATE_POINT_REASON,
  COMMUNITY_POST_CREATE_POINTS,
  COMMUNITY_REACTION_EMOJIS,
  COMMUNITY_SCOPES,
  isCommunityKind,
  isCommunityPeopleSort,
  isCommunityReactionEmoji,
  isCommunityReportReason,
  isCommunitySearchType,
  isCommunitySearchWhen,
  isCommunitySort,
  isCommunityTopic,
  isExperienceLevel,
  slugify,
  uniqueSlug,
  type CommunityKind,
  type CommunityPeopleSort,
  type CommunityReactionEmoji,
  type CommunityScope,
  type CommunitySearchType,
  type CommunitySearchWhen,
  type CommunitySort,
  type CommunityTopic,
  type ExperienceLevel,
} from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { isR2Configured } from "../../config.js";
import { assertR2UploadLimit } from "../../shared/rate-limit.js";
import { AppError } from "../../shared/errors.js";
import { imageExtension, uploadToR2 } from "../../shared/r2.js";
import { prisma } from "../../shared/db.js";
import { findById } from "../users/users.repository.js";
import {
  notifyCommunityComment,
  notifyCommunityPostCreated,
  notifyCommunityQuote,
  notifyCommunityReaction,
  notifyCommunityReply,
} from "../notifications/notifications.events.js";
import { awardUserPoints } from "../points/points.repository.js";
import { listFollowingIds } from "../profiles/profiles.repository.js";
import {
  countCommunityPosts,
  countCommunityPostsByKind,
  countPostsSince,
  communitySlugsLike,
  createComment,
  createCommunityPost,
  createReport,
  deleteCommentReaction,
  deleteReaction,
  findComment,
  findCommunityPost,
  findCommunityPostByRef,
  findMyCommentReaction,
  findMyReaction,
  findReportByReporterAndComment,
  findReportByReporterAndPost,
  listCommentReactionCounts,
  listCommunityPostCandidates,
  listCommunityPosts,
  listMyCommentReactions,
  listMyReactions,
  listPostReactions,
  listQuotesOfPost,
  listReactionCounts,
  listRepliesForParents,
  listSpotlightLearners,
  listTopLevelComments,
  recordImpression,
  searchPeopleCandidates,
  softDeleteCommentTree,
  softDeleteCommunityPost,
  updateCommentBody,
  updateCommunityPost,
  upsertCommentReaction,
  upsertReaction,
  type CommunityCommentRow,
  type CommunityPostRow,
  type SpotlightUserRow,
} from "./community.repository.js";

async function allocatePostSlug(title: string, excludeId?: string) {
  const base = slugify(title, "post");
  return uniqueSlug(base, await communitySlugsLike(base, excludeId));
}

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
        { author: { name: contains } },
      ],
    });
  }
  return { AND: and };
}

function searchTerms(q: string): string[] {
  return q
    .split(/\s+/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TERMS);
}

function whenSince(when: CommunitySearchWhen): Date | null {
  if (when === "any") return null;
  const ms =
    when === "day" ? 24 * 60 * 60 * 1000 : when === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

function scorePostRelevance(
  row: CommunityPostRow,
  terms: string[],
  q: string,
  reactionTotal: number,
): number {
  let score = 0;
  const title = row.title.toLowerCase();
  const body = row.body.toLowerCase();
  const author = row.author.name.toLowerCase();
  const related = `${row.relatedTitle ?? ""} ${row.relatedSlug ?? ""}`.toLowerCase();
  const qLower = q.toLowerCase().trim();

  if (qLower) {
    if (title === qLower) score += 120;
    else if (title.startsWith(qLower)) score += 80;
    else if (title.includes(qLower)) score += 55;
    if (author === qLower) score += 50;
    else if (author.startsWith(qLower)) score += 35;
    else if (author.includes(qLower)) score += 22;
  }

  for (const term of terms) {
    if (title.includes(term)) score += 28;
    if (author.includes(term)) score += 18;
    if (related.includes(term)) score += 12;
    if (body.includes(term)) score += 8;
  }

  score += Math.min(24, row.commentCount * 2);
  score += Math.min(18, reactionTotal);
  const ageDays = (Date.now() - row.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  score += Math.max(0, 18 - ageDays * 0.6);
  return score;
}

function scorePersonRelevance(row: SpotlightUserRow, terms: string[], q: string): number {
  let score = 0;
  const name = row.name.toLowerCase();
  const qLower = q.toLowerCase().trim();

  if (qLower) {
    if (name === qLower) score += 100;
    else if (name.startsWith(qLower)) score += 70;
    else if (name.includes(qLower)) score += 40;
  }
  for (const term of terms) {
    if (name.includes(term)) score += 25;
  }
  score += Math.min(30, row._count.communityPosts * 3);
  score += Math.min(20, Math.floor(row.points / 25));
  return score;
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

function quotedPostPayload(row: CommunityPostRow["quotePost"]) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    body: row.body,
    imageUrls: row.imageUrls.slice(0, 2),
    createdAt: row.createdAt.toISOString(),
    isDeleted: row.isDeleted,
    author: {
      id: row.author.id,
      username: row.author.username,
      name: row.author.name,
      avatarUrl: row.author.avatarUrl,
    },
  };
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
    slug: row.slug,
    kind: row.kind,
    topic: row.topic,
    relatedSlug: row.relatedSlug,
    relatedTitle: row.relatedTitle,
    relatedHref: relatedHref(row.topic, row.relatedSlug),
    title: row.title,
    body: row.body,
    imageUrls: row.imageUrls,
    quotePostId: row.quotePostId,
    quotedPost: quotedPostPayload(row.quotePost),
    impressionCount: row.impressionCount,
    commentCount: row.commentCount,
    reactionCounts: engagement.reactionCounts,
    myReaction: engagement.myReaction,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    isEdited: Boolean(row.editedAt),
    author: {
      id: row.author.id,
      username: row.author.username,
      name: row.author.name,
      avatarUrl: row.author.avatarUrl,
    },
    isMine: row.authorId === userId,
  };
}

type CommentPayload = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isEdited: boolean;
  author: { id: string; username: string; name: string; avatarUrl: string | null };
  isMine: boolean;
  reactionCounts: ReactionCounts;
  myReaction: CommunityReactionEmoji | null;
  replies: CommentPayload[];
};

function commentPayload(
  row: CommunityCommentRow,
  userId: string,
  engagement: {
    reactionCounts: ReactionCounts;
    myReaction: CommunityReactionEmoji | null;
  } = {
    reactionCounts: emptyReactionCounts(),
    myReaction: null,
  },
  replies: CommentPayload[] = [],
): CommentPayload {
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    isEdited: Boolean(row.editedAt),
    author: {
      id: row.author.id,
      username: row.author.username,
      name: row.author.name,
      avatarUrl: row.author.avatarUrl,
    },
    isMine: row.authorId === userId,
    reactionCounts: engagement.reactionCounts,
    myReaction: engagement.myReaction,
    replies,
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

type SearchFilters = {
  q: string;
  type: CommunitySearchType;
  kind: CommunityKind | null;
  topic: CommunityTopic | null;
  sort: CommunitySort;
  peopleSort: CommunityPeopleSort;
  when: CommunitySearchWhen;
  experienceLevel: ExperienceLevel | null;
  page: number;
};

function parseSearchFilters(query: Record<string, unknown>): SearchFilters {
  const typeRaw = firstString(query.type);
  const sortRaw = firstString(query.sort);
  const peopleSortRaw = firstString(query.peopleSort);
  const whenRaw = firstString(query.when);
  const levelRaw = firstString(query.experienceLevel);
  const kind = firstString(query.kind);
  const topic = firstString(query.topic);
  const page = Number.parseInt(firstString(query.page), 10);
  const q = firstString(query.q).slice(0, COMMUNITY_LIMITS.queryMax);
  const type: CommunitySearchType = isCommunitySearchType(typeRaw) ? typeRaw : "all";
  const defaultSort: CommunitySort = q ? "relevant" : "newest";
  return {
    q,
    type,
    kind: isCommunityKind(kind) ? kind : null,
    topic: isCommunityTopic(topic) ? topic : null,
    sort: isCommunitySort(sortRaw) ? sortRaw : defaultSort,
    peopleSort: isCommunityPeopleSort(peopleSortRaw) ? peopleSortRaw : q ? "relevant" : "posts",
    when: isCommunitySearchWhen(whenRaw) ? whenRaw : "any",
    experienceLevel: isExperienceLevel(levelRaw) ? levelRaw : null,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

function buildSearchPostWhere(filters: SearchFilters): Prisma.CommunityPostWhereInput {
  const and: Prisma.CommunityPostWhereInput[] = [notDeleted];
  if (filters.kind) and.push({ kind: filters.kind });
  if (filters.topic) and.push({ topic: filters.topic });
  const since = whenSince(filters.when);
  if (since) and.push({ createdAt: { gte: since } });

  const terms = searchTerms(filters.q);
  for (const term of terms) {
    const contains = { contains: term, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { body: contains },
        { relatedSlug: contains },
        { relatedTitle: contains },
        { author: { name: contains } },
      ],
    });
  }
  return { AND: and };
}

function buildSearchPeopleWhere(
  _viewerId: string,
  filters: SearchFilters,
): Prisma.UserWhereInput {
  // Include the viewer so searching your own name returns your profile too.
  const and: Prisma.UserWhereInput[] = [{ onboardingCompletedAt: { not: null } }];
  if (filters.experienceLevel) and.push({ experienceLevel: filters.experienceLevel });

  const terms = searchTerms(filters.q);
  for (const term of terms) {
    const contains = { contains: term, mode: "insensitive" as const };
    and.push({
      OR: [{ name: contains }, { bio: contains }, { username: contains }],
    });
  }
  return { AND: and };
}

function personPayload(row: SpotlightUserRow) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl,
    bio: null as string | null,
    points: row.points,
    experienceLevel: row.experienceLevel,
    postCount: row._count.communityPosts,
    projectCount: row._count.projectSubmissions,
    note: spotlightNote(row),
  };
}

async function searchPosts(userId: string, filters: SearchFilters) {
  const where = buildSearchPostWhere(filters);
  const pageSize = COMMUNITY_LIMITS.pageSize;
  const skip = (filters.page - 1) * pageSize;
  const terms = searchTerms(filters.q);
  const useRelevance = filters.sort === "relevant" && terms.length > 0;

  if (useRelevance) {
    const candidates = await listCommunityPostCandidates({
      where,
      take: COMMUNITY_LIMITS.searchCandidateMax,
    });
    const postIds = candidates.rows.map((row) => row.id);
    const { countsByPost, mineByPost } = await engagementForPosts(userId, postIds);
    const ranked = candidates.rows
      .map((row) => {
        const counts = countsByPost.get(row.id) ?? emptyReactionCounts();
        const reactionTotal = COMMUNITY_REACTION_EMOJIS.reduce(
          (sum, emoji) => sum + (counts[emoji] ?? 0),
          0,
        );
        return {
          row,
          score: scorePostRelevance(row, terms, filters.q, reactionTotal),
          reactionCounts: counts,
          myReaction: mineByPost.get(row.id) ?? null,
        };
      })
      .sort((a, b) => b.score - a.score || b.row.createdAt.getTime() - a.row.createdAt.getTime());

    const slice = ranked.slice(skip, skip + pageSize);
    return {
      posts: slice.map((item) =>
        postPayload(item.row, userId, {
          reactionCounts: item.reactionCounts,
          myReaction: item.myReaction,
        }),
      ),
      page: filters.page,
      pageSize,
      total: candidates.total,
      hasMore: skip + slice.length < candidates.total,
    };
  }

  const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
    filters.sort === "top"
      ? [{ commentCount: "desc" }, { impressionCount: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const listed = await listCommunityPosts({ where, skip, take: pageSize, orderBy });
  const { countsByPost, mineByPost } = await engagementForPosts(
    userId,
    listed.rows.map((row) => row.id),
  );
  return {
    posts: listed.rows.map((row) =>
      postPayload(row, userId, {
        reactionCounts: countsByPost.get(row.id) ?? emptyReactionCounts(),
        myReaction: mineByPost.get(row.id) ?? null,
      }),
    ),
    page: filters.page,
    pageSize,
    total: listed.total,
    hasMore: skip + listed.rows.length < listed.total,
  };
}

async function searchPeople(viewerId: string, filters: SearchFilters) {
  const where = buildSearchPeopleWhere(viewerId, filters);
  const pageSize = COMMUNITY_LIMITS.peoplePageSize;
  const skip = (filters.page - 1) * pageSize;
  const terms = searchTerms(filters.q);
  const useRelevance = filters.peopleSort === "relevant" && terms.length > 0;

  if (useRelevance) {
    const candidates = await searchPeopleCandidates({
      where,
      take: COMMUNITY_LIMITS.searchCandidateMax,
    });
    const ranked = candidates.rows
      .map((row) => ({
        row,
        score: scorePersonRelevance(row, terms, filters.q),
      }))
      .sort((a, b) => b.score - a.score || b.row.points - a.row.points);
    const slice = ranked.slice(skip, skip + pageSize);
    const people = await attachPeopleBios(viewerId, slice.map((item) => item.row));
    return {
      people,
      page: filters.page,
      pageSize,
      total: candidates.total,
      hasMore: skip + slice.length < candidates.total,
    };
  }

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    filters.peopleSort === "points"
      ? [{ points: "desc" }, { createdAt: "desc" }]
      : [{ communityPosts: { _count: "desc" } }, { points: "desc" }];

  const listed = await searchPeopleCandidates({
    where,
    take: COMMUNITY_LIMITS.searchCandidateMax,
    orderBy,
  });
  const slice = listed.rows.slice(skip, skip + pageSize);
  const people = await attachPeopleBios(viewerId, slice);
  return {
    people,
    page: filters.page,
    pageSize,
    total: listed.total,
    hasMore: skip + slice.length < listed.total,
  };
}

async function attachPeopleBios(viewerId: string, rows: SpotlightUserRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [bios, following] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, bio: true },
    }),
    listFollowingIds(viewerId, ids),
  ]);
  const bioById = new Map(bios.map((row) => [row.id, row.bio]));
  return rows.map((row) => ({
    ...personPayload(row),
    bio: bioById.get(row.id) ?? null,
    isFollowing: following.has(row.id),
  }));
}

export async function searchCommunity(userId: string, query: Record<string, unknown>) {
  const filters = parseSearchFilters(query);
  const includePosts = filters.type === "all" || filters.type === "posts";
  const includePeople = filters.type === "all" || filters.type === "people";

  const emptyPosts = {
    posts: [] as ReturnType<typeof postPayload>[],
    page: filters.page,
    pageSize: COMMUNITY_LIMITS.pageSize,
    total: 0,
    hasMore: false,
  };
  const emptyPeople = {
    people: [] as Awaited<ReturnType<typeof attachPeopleBios>>,
    page: filters.page,
    pageSize: COMMUNITY_LIMITS.peoplePageSize,
    total: 0,
    hasMore: false,
  };

  const emptyResponse = {
    posts: emptyPosts.posts,
    people: emptyPeople.people,
    page: filters.page,
    pageSize: emptyPosts.pageSize,
    total: 0,
    hasMore: false,
    peopleTotal: 0,
    peopleHasMore: false,
    peoplePageSize: emptyPeople.pageSize,
    filters: {
      q: filters.q,
      type: filters.type,
      kind: filters.kind,
      topic: filters.topic,
      sort: filters.sort,
      peopleSort: filters.peopleSort,
      when: filters.when,
      experienceLevel: filters.experienceLevel,
    },
  };

  // No results until the learner actually searches.
  if (!filters.q.trim()) {
    return emptyResponse;
  }

  // On "All", people stay a top preview (page 1); posts own pagination.
  const peopleFilters: SearchFilters =
    filters.type === "all" ? { ...filters, page: 1 } : filters;

  const [postsResult, peopleResult] = await Promise.all([
    includePosts ? searchPosts(userId, filters) : Promise.resolve(emptyPosts),
    includePeople ? searchPeople(userId, peopleFilters) : Promise.resolve(emptyPeople),
  ]);

  const peoplePreview =
    filters.type === "all"
      ? {
          people: peopleResult.people.slice(0, 6),
          total: peopleResult.total,
          hasMore: peopleResult.total > 6,
          pageSize: 6,
          page: 1,
        }
      : peopleResult;

  return {
    posts: postsResult.posts,
    people: peoplePreview.people,
    page: filters.page,
    pageSize: postsResult.pageSize,
    total: postsResult.total,
    hasMore: postsResult.hasMore,
    peopleTotal: peoplePreview.total,
    peopleHasMore: peoplePreview.hasMore,
    peoplePageSize: peoplePreview.pageSize,
    filters: emptyResponse.filters,
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

  let quotePostId: string | null = null;
  let quotedPost: CommunityPostRow | null = null;
  if (body.quotePostId !== undefined && body.quotePostId !== null && body.quotePostId !== "") {
    if (typeof body.quotePostId !== "string") {
      throw new AppError(400, "invalid_field", "Quote target must be a post id.", {
        field: "quotePostId",
      });
    }
    quotedPost = await findCommunityPost(body.quotePostId.trim());
    if (!quotedPost) {
      throw new AppError(404, "quote_missing", "That post could not be quoted.");
    }
    quotePostId = quotedPost.id;
  }

  const related = await resolveRelated(topicRaw, relatedSlug);
  const bodyMin = quotePostId ? COMMUNITY_LIMITS.quoteBodyMin : COMMUNITY_LIMITS.bodyMin;
  const title = requireString(
    body.title,
    "Title",
    COMMUNITY_LIMITS.titleMin,
    COMMUNITY_LIMITS.titleMax,
  );
  const postBody = requireString(body.body, "Body", bodyMin, COMMUNITY_LIMITS.bodyMax);

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

  const slug = await allocatePostSlug(title);
  const row = await createCommunityPost({
    authorId: userId,
    slug,
    kind: body.kind,
    topic: topicRaw,
    relatedSlug: related.relatedSlug,
    relatedTitle: related.relatedTitle,
    title,
    body: postBody,
    imageUrls,
    quotePostId,
  });

  await awardUserPoints({
    userId,
    amount: COMMUNITY_POST_CREATE_POINTS,
    reason: COMMUNITY_POST_CREATE_POINT_REASON,
    refType: "community_post",
    refId: row.id,
  });

  if (quotedPost && quotedPost.author.id !== userId) {
    await notifyCommunityQuote({
      recipientId: quotedPost.author.id,
      actor: row.author,
      postSlug: row.slug,
      postTitle: row.title,
    });
  }

  await notifyCommunityPostCreated({
    userId,
    postId: row.id,
    postSlug: row.slug,
    postTitle: row.title,
  });

  return { post: postPayload(row, userId) };
}

async function storeCommunityImage(userId: string, file: UploadedImage) {
  const image = readImage(file.mimetype, file.buffer);
  assertR2UploadLimit(userId);
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

export async function deleteCommunityFeedPost(userId: string, postRef: string) {
  const post = await findCommunityPostByRef(postRef);
  if (!post || post.authorId !== userId) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  const deleted = await softDeleteCommunityPost(post.id, userId);
  if (!deleted) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  return { ok: true as const };
}

export async function updateCommunityFeedPost(
  userId: string,
  postRef: string,
  input: unknown,
) {
  const existing = await findCommunityPostByRef(postRef);
  if (!existing || existing.authorId !== userId) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_body", "Post details were missing.");
  }
  const body = input as Record<string, unknown>;

  const topicRaw = body.topic ?? existing.topic;
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
  } else if (body.relatedSlug === null || body.relatedSlug === "") {
    relatedSlug = null;
  } else {
    relatedSlug = existing.relatedSlug;
  }

  const related = await resolveRelated(topicRaw, relatedSlug);
  const bodyMin = existing.quotePostId
    ? COMMUNITY_LIMITS.quoteBodyMin
    : COMMUNITY_LIMITS.bodyMin;
  const title = requireString(
    body.title ?? existing.title,
    "Title",
    COMMUNITY_LIMITS.titleMin,
    COMMUNITY_LIMITS.titleMax,
  );
  const postBody = requireString(
    body.body ?? existing.body,
    "Body",
    bodyMin,
    COMMUNITY_LIMITS.bodyMax,
  );

  // Slug is coined at create time and stays stable so shared URLs keep working.
  const row = await updateCommunityPost(existing.id, userId, {
    slug: existing.slug,
    title,
    body: postBody,
    topic: topicRaw,
    relatedSlug: related.relatedSlug,
    relatedTitle: related.relatedTitle,
    editedAt: new Date(),
  });
  if (!row) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }

  const { countsByPost, mineByPost } = await engagementForPosts(userId, [row.id]);
  return {
    post: postPayload(row, userId, {
      reactionCounts: countsByPost.get(row.id) ?? emptyReactionCounts(),
      myReaction: mineByPost.get(row.id) ?? null,
    }),
  };
}

function parseReportInput(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_body", "Report details were missing.");
  }
  const body = input as Record<string, unknown>;
  if (!isCommunityReportReason(body.reason)) {
    throw new AppError(400, "invalid_field", "Choose a report reason.", { field: "reason" });
  }
  let details: string | null = null;
  if (body.details !== undefined && body.details !== null && body.details !== "") {
    if (typeof body.details !== "string") {
      throw new AppError(400, "invalid_field", "Details must be text.", { field: "details" });
    }
    details = body.details.trim().slice(0, COMMUNITY_LIMITS.reportDetailsMax) || null;
  }
  if (body.reason === "other" && !details) {
    throw new AppError(400, "invalid_field", "Add a short note for “Something else”.", {
      field: "details",
    });
  }
  return { reason: body.reason, details };
}

export async function reportCommunityPost(userId: string, postId: string, input: unknown) {
  const post = await findCommunityPostByRef(postId);
  if (!post) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  if (post.authorId === userId) {
    throw new AppError(400, "invalid_report", "You cannot report your own post.");
  }
  const existing = await findReportByReporterAndPost(userId, post.id);
  if (existing) {
    throw new AppError(409, "already_reported", "You already reported this post.");
  }
  const { reason, details } = parseReportInput(input);
  await createReport({
    reporterId: userId,
    postId: post.id,
    commentId: null,
    reason,
    details,
  });
  return { ok: true as const };
}

export async function reportCommunityComment(
  userId: string,
  commentId: string,
  input: unknown,
) {
  const comment = await findComment(commentId);
  if (!comment) {
    throw new AppError(404, "comment_missing", "That comment could not be found.");
  }
  if (comment.authorId === userId) {
    throw new AppError(400, "invalid_report", "You cannot report your own comment.");
  }
  const existing = await findReportByReporterAndComment(userId, comment.id);
  if (existing) {
    throw new AppError(409, "already_reported", "You already reported this comment.");
  }
  const { reason, details } = parseReportInput(input);
  await createReport({
    reporterId: userId,
    postId: null,
    commentId: comment.id,
    reason,
    details,
  });
  return { ok: true as const };
}

async function engagementForComments(userId: string, commentIds: string[]) {
  const [counts, mine] = await Promise.all([
    listCommentReactionCounts(commentIds),
    listMyCommentReactions(userId, commentIds),
  ]);
  const countsByComment = new Map<string, ReactionCounts>();
  for (const id of commentIds) countsByComment.set(id, emptyReactionCounts());
  for (const row of counts) {
    if (!isCommunityReactionEmoji(row.emoji)) continue;
    const bucket = countsByComment.get(row.commentId) ?? emptyReactionCounts();
    bucket[row.emoji] = row._count._all;
    countsByComment.set(row.commentId, bucket);
  }
  const mineByComment = new Map<string, CommunityReactionEmoji>();
  for (const row of mine) {
    if (isCommunityReactionEmoji(row.emoji)) mineByComment.set(row.commentId, row.emoji);
  }
  return { countsByComment, mineByComment };
}

async function loadCommentThread(userId: string, postId: string) {
  const tops = await listTopLevelComments(postId, COMMUNITY_LIMITS.commentsPageSize);
  const replies = await listRepliesForParents(tops.map((row) => row.id));
  const allIds = [...tops.map((row) => row.id), ...replies.map((row) => row.id)];
  const { countsByComment, mineByComment } = await engagementForComments(userId, allIds);

  const repliesByParent = new Map<string, CommunityCommentRow[]>();
  for (const reply of replies) {
    if (!reply.parentId) continue;
    const list = repliesByParent.get(reply.parentId) ?? [];
    list.push(reply);
    repliesByParent.set(reply.parentId, list);
  }

  return tops.map((top) =>
    commentPayload(
      top,
      userId,
      {
        reactionCounts: countsByComment.get(top.id) ?? emptyReactionCounts(),
        myReaction: mineByComment.get(top.id) ?? null,
      },
      (repliesByParent.get(top.id) ?? []).map((reply) =>
        commentPayload(reply, userId, {
          reactionCounts: countsByComment.get(reply.id) ?? emptyReactionCounts(),
          myReaction: mineByComment.get(reply.id) ?? null,
        }),
      ),
    ),
  );
}

export async function getCommunityPostDetail(userId: string, postId: string) {
  const post = await findCommunityPostByRef(postId);
  if (!post) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  const [{ countsByPost, mineByPost }, comments] = await Promise.all([
    engagementForPosts(userId, [post.id]),
    loadCommentThread(userId, post.id),
  ]);
  return {
    post: postPayload(post, userId, {
      reactionCounts: countsByPost.get(post.id) ?? emptyReactionCounts(),
      myReaction: mineByPost.get(post.id) ?? null,
    }),
    comments,
  };
}

export async function getCommunityPostReactions(_userId: string, postRef: string) {
  const post = await findCommunityPostByRef(postRef);
  if (!post) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }

  const [rows, quoteRows] = await Promise.all([
    listPostReactions(post.id),
    listQuotesOfPost(post.id),
  ]);
  const reactionCounts = emptyReactionCounts();
  const reactions = [];
  for (const row of rows) {
    if (!isCommunityReactionEmoji(row.emoji)) continue;
    reactionCounts[row.emoji] += 1;
    reactions.push({
      id: row.id,
      emoji: row.emoji,
      createdAt: row.createdAt.toISOString(),
      user: {
        id: row.user.id,
        username: row.user.username,
        name: row.user.name,
        avatarUrl: row.user.avatarUrl,
      },
    });
  }

  const quotes = quoteRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      username: row.author.username,
      name: row.author.name,
      avatarUrl: row.author.avatarUrl,
    },
  }));

  return {
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
    },
    reactions,
    reactionCounts,
    total: reactions.length,
    quotes,
    quoteCount: quotes.length,
  };
}

export async function createCommunityComment(
  userId: string,
  postId: string,
  input: unknown,
) {
  const post = await findCommunityPostByRef(postId);
  if (!post) {
    throw new AppError(404, "post_missing", "That post could not be found.");
  }
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_body", "Comment details were missing.");
  }
  const body = input as Record<string, unknown>;
  const text = requireString(
    body.body,
    "Comment",
    COMMUNITY_LIMITS.commentBodyMin,
    COMMUNITY_LIMITS.commentBodyMax,
  );

  let parentId: string | null = null;
  let parent: CommunityCommentRow | null = null;
  if (body.parentId !== undefined && body.parentId !== null && body.parentId !== "") {
    if (typeof body.parentId !== "string") {
      throw new AppError(400, "invalid_field", "Reply target must be a comment id.", {
        field: "parentId",
      });
    }
    parent = await findComment(body.parentId.trim());
    if (!parent || parent.postId !== post.id) {
      throw new AppError(404, "comment_missing", "That comment could not be found.");
    }
    if (parent.parentId) {
      throw new AppError(
        400,
        "invalid_field",
        "Replies are limited to one level under a comment.",
        { field: "parentId" },
      );
    }
    parentId = parent.id;
  }

  const row = await createComment({
    postId: post.id,
    authorId: userId,
    parentId,
    body: text,
  });

  if (parent && parent.authorId !== userId) {
    await notifyCommunityReply({
      recipientId: parent.authorId,
      actor: row.author,
      postSlug: post.slug,
      postTitle: post.title,
    });
  }
  if (post.authorId !== userId && post.authorId !== parent?.authorId) {
    await notifyCommunityComment({
      recipientId: post.authorId,
      actor: row.author,
      postSlug: post.slug,
      postTitle: post.title,
    });
  }

  return {
    comment: commentPayload(row, userId),
    commentCount: post.commentCount + 1,
  };
}

export async function updateCommunityComment(
  userId: string,
  commentId: string,
  input: unknown,
) {
  const existing = await findComment(commentId);
  if (!existing || existing.authorId !== userId) {
    throw new AppError(404, "comment_missing", "That comment could not be found.");
  }
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_body", "Comment details were missing.");
  }
  const text = requireString(
    (input as Record<string, unknown>).body,
    "Comment",
    COMMUNITY_LIMITS.commentBodyMin,
    COMMUNITY_LIMITS.commentBodyMax,
  );
  const row = await updateCommentBody(commentId, userId, text);
  if (!row) {
    throw new AppError(404, "comment_missing", "That comment could not be found.");
  }
  const { countsByComment, mineByComment } = await engagementForComments(userId, [row.id]);
  return {
    comment: commentPayload(row, userId, {
      reactionCounts: countsByComment.get(row.id) ?? emptyReactionCounts(),
      myReaction: mineByComment.get(row.id) ?? null,
    }),
  };
}

export async function deleteCommunityComment(userId: string, commentId: string) {
  const result = await softDeleteCommentTree(commentId, userId);
  if (!result) {
    throw new AppError(404, "comment_missing", "That comment could not be found.");
  }
  const post = await findCommunityPost(result.postId);
  return {
    ok: true as const,
    commentCount: post?.commentCount ?? 0,
  };
}

async function commentReactionSnapshot(commentId: string, userId: string) {
  const [counts, mine] = await Promise.all([
    listCommentReactionCounts([commentId]),
    findMyCommentReaction(commentId, userId),
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

export async function setCommunityCommentReaction(
  userId: string,
  commentId: string,
  input: unknown,
) {
  const comment = await findComment(commentId);
  if (!comment) {
    throw new AppError(404, "comment_missing", "That comment could not be found.");
  }
  if (!input || typeof input !== "object") {
    throw new AppError(400, "invalid_body", "Reaction details were missing.");
  }
  const emoji = (input as Record<string, unknown>).emoji;
  if (!isCommunityReactionEmoji(emoji)) {
    throw new AppError(400, "invalid_field", "Pick a valid reaction.", { field: "emoji" });
  }

  const existing = await findMyCommentReaction(commentId, userId);
  if (existing?.emoji === emoji) {
    await deleteCommentReaction(commentId, userId);
  } else {
    await upsertCommentReaction(commentId, userId, emoji);
    if (comment.authorId !== userId) {
      const [post, actor] = await Promise.all([
        findCommunityPost(comment.postId),
        findById(userId),
      ]);
      if (post && actor) {
        await notifyCommunityReaction({
          recipientId: comment.authorId,
          actor,
          postSlug: post.slug,
          postTitle: post.title,
          target: "comment",
          targetId: comment.id,
        });
      }
    }
  }

  return commentReactionSnapshot(commentId, userId);
}

export async function recordCommunityImpression(userId: string, postId: string) {
  const post = await findCommunityPostByRef(postId);
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
  const post = await findCommunityPostByRef(postId);
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
    if (post.authorId !== userId) {
      const actor = await findById(userId);
      if (actor) {
        await notifyCommunityReaction({
          recipientId: post.authorId,
          actor,
          postSlug: post.slug,
          postTitle: post.title,
          target: "post",
          targetId: post.id,
        });
      }
    }
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
  const following = await listFollowingIds(
    userId,
    rows.map((user) => user.id),
  );
  return {
    learners: rows.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      points: user.points,
      experienceLevel: user.experienceLevel,
      postCount: user._count.communityPosts,
      projectCount: user._count.projectSubmissions,
      note: spotlightNote(user),
      isFollowing: following.has(user.id),
    })),
  };
}

import {
  SEARCH_LIMITS,
  SEARCH_TYPES,
  isMentorAvailability,
  isResourceType,
  isSearchType,
  isToolCategory,
  isToolPricing,
  levelById,
  MENTOR_AVAILABILITY_LABELS,
  profilePath,
  RESOURCE_TYPE_LABELS,
  resourceFaviconUrl,
  resourceHost,
  TOOL_CATEGORY_LABELS,
  TOOL_PRICING_LABELS,
  type SearchGroup,
  type SearchHit,
  type SearchResult,
  type SearchType,
} from "@coddle/shared";
import { rankDocuments, type SearchDocument } from "./rank.js";
import { parseSearchQuery } from "./query.js";
import {
  listSkillNameBySlug,
  searchCourseCandidates,
  searchDeveloperCandidates,
  searchMentorCandidates,
  searchProjectCandidates,
  searchResourceCandidates,
  searchRoadmapCandidates,
  searchSkillCandidates,
  searchToolCandidates,
} from "./search.repository.js";

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

function levelLabel(level: string): string {
  return levelById(level)?.label ?? level;
}

function toHit(doc: ReturnType<typeof rankDocuments>[number]): SearchHit {
  return {
    id: doc.id,
    type: doc.type,
    title: doc.title,
    subtitle: doc.subtitle,
    snippet: doc.snippet,
    href: doc.href,
    imageUrl: doc.imageUrl,
    skills: doc.skills,
    score: Number(doc.score.toFixed(6)),
  };
}

function emptyResult(q: string, type: SearchType | "all"): SearchResult {
  return {
    q,
    type,
    parsed: parseSearchQuery(q),
    total: 0,
    hits: [],
    groups: [],
  };
}

export async function searchCatalog(
  query: Record<string, unknown>,
  options: { limit?: number } = {},
): Promise<SearchResult> {
  const q = firstString(query.q).slice(0, SEARCH_LIMITS.queryMax);
  const typeRaw = firstString(query.type);
  const type: SearchType | "all" = isSearchType(typeRaw) ? typeRaw : "all";
  const parsed = parseSearchQuery(q);
  const limit = Math.min(
    Math.max(options.limit ?? SEARCH_LIMITS.defaultLimit, 1),
    SEARCH_LIMITS.defaultLimit,
  );

  if (!parsed.raw) return emptyResult(q, type);

  const terms = parsed.expanded.length > 0 ? parsed.expanded : parsed.terms;
  const inferredOnly = type === "all" && parsed.inferredTypes.length > 0 && parsed.terms.length === 0;
  const wanted: readonly SearchType[] = type !== "all" ? [type] : inferredOnly ? parsed.inferredTypes : SEARCH_TYPES;
  const include = (candidate: SearchType) => wanted.includes(candidate);

  const [courses, roadmaps, resources, projects, developers, mentors, skills, tools, skillNames] =
    await Promise.all([
      include("course") ? searchCourseCandidates(terms) : Promise.resolve([]),
      include("roadmap") ? searchRoadmapCandidates(terms) : Promise.resolve([]),
      include("resource") ? searchResourceCandidates(terms) : Promise.resolve([]),
      include("project") ? searchProjectCandidates(terms) : Promise.resolve([]),
      include("developer") ? searchDeveloperCandidates(terms) : Promise.resolve([]),
      include("mentor") ? searchMentorCandidates(terms) : Promise.resolve([]),
      include("skill") ? searchSkillCandidates(terms) : Promise.resolve([]),
      include("tool") ? searchToolCandidates(terms) : Promise.resolve([]),
      listSkillNameBySlug(),
    ]);

  const docs: SearchDocument[] = [];

  for (const row of courses) {
    docs.push({
      id: row.id,
      type: "course",
      title: row.title,
      subtitle: `${levelLabel(row.level)} · ${row.estimatedHours}h`,
      body: row.summary,
      href: `/courses/${row.slug}`,
      imageUrl: row.thumbnailUrl,
      skills: row.skills.map((link) => link.skill),
      popularity: row._count.enrollments,
    });
  }

  for (const row of roadmaps) {
    docs.push({
      id: row.id,
      type: "roadmap",
      title: row.name,
      subtitle: `${levelLabel(row.level)} · ${row.weeks} weeks`,
      body: row.summary,
      href: `/roadmaps/${row.slug}`,
      imageUrl: null,
      skills: row.skillSlugs.map((slug) => ({
        slug,
        name: skillNames.get(slug) ?? slug,
      })),
      popularity: row._count.enrollments,
    });
  }

  for (const row of resources) {
    const typeLabel = isResourceType(row.type) ? RESOURCE_TYPE_LABELS[row.type] : row.type;
    docs.push({
      id: row.id,
      type: "resource",
      title: row.title,
      subtitle: [typeLabel, resourceHost(row.url), levelLabel(row.level)].filter(Boolean).join(" · "),
      body: row.description,
      href: row.url,
      imageUrl: resourceFaviconUrl(row.url),
      skills: row.skills.map((link) => link.skill),
      popularity: row._count.bookmarks,
    });
  }

  for (const row of projects) {
    docs.push({
      id: row.id,
      type: "project",
      title: row.title,
      subtitle: levelLabel(row.level),
      body: `${row.summary} ${row.body}`,
      href: `/projects/${row.slug}`,
      imageUrl: row.exampleImageUrl,
      skills: row.skills.map((link) => link.skill),
      popularity: row._count.submissions,
    });
  }

  for (const row of developers) {
    docs.push({
      id: row.id,
      type: "developer",
      title: row.name,
      subtitle: [row.username, row.experienceLevel ? levelLabel(row.experienceLevel) : null]
        .filter(Boolean)
        .join(" · "),
      body: row.bio ?? "",
      href: profilePath(row.username),
      imageUrl: row.avatarUrl,
      skills: row.skills.map((link) => link.skill),
      popularity: row.points,
    });
  }

  for (const row of mentors) {
    const availability = isMentorAvailability(row.availability)
      ? MENTOR_AVAILABILITY_LABELS[row.availability]
      : row.availability;
    docs.push({
      id: row.id,
      type: "mentor",
      title: row.user.name,
      subtitle: [availability, row.headline].filter(Boolean).join(" · "),
      body: row.about,
      href: `/mentors/${encodeURIComponent(row.user.username)}`,
      imageUrl: row.user.avatarUrl,
      skills: row.skills.map((link) => link.skill),
      popularity: row._count.programs + (row.availability === "open" ? 4 : 0),
    });
  }

  for (const row of skills) {
    docs.push({
      id: row.id,
      type: "skill",
      title: row.name,
      subtitle: row.category,
      body: `${row.category} ${row.slug}`,
      href: `/skills`,
      imageUrl: null,
      skills: [{ slug: row.slug, name: row.name }],
      popularity: row._count.users + row._count.courses * 2 + row._count.resources,
    });
  }

  for (const row of tools) {
    const category = isToolCategory(row.category) ? TOOL_CATEGORY_LABELS[row.category] : row.category;
    const pricing = isToolPricing(row.pricing) ? TOOL_PRICING_LABELS[row.pricing] : row.pricing;
    docs.push({
      id: row.id,
      type: "tool",
      title: row.title,
      subtitle: [category, pricing].filter(Boolean).join(" · "),
      body: row.summary,
      href: `/tools/${row.slug}`,
      imageUrl: row.imageUrl,
      skills: row.skills.map((link) => link.skill),
      popularity: row._count.bookmarks,
    });
  }

  const ranked = rankDocuments(docs, parsed.text || parsed.raw, terms, parsed.inferredTypes);
  const hits = ranked.map(toHit);
  const groups: SearchGroup[] = SEARCH_TYPES.filter((item) => include(item))
    .map((item) => {
      const typed = hits.filter((hit) => hit.type === item);
      return { type: item, total: typed.length, hits: typed.slice(0, 6) };
    })
    .filter((group) => group.total > 0);

  return {
    q: parsed.raw,
    type,
    parsed,
    total: hits.length,
    hits: hits.slice(0, limit),
    groups,
  };
}

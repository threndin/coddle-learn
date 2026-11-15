import { ACHIEVEMENT_DEFINITIONS } from "@coddle/shared";
import {
  listSitemapChallenges,
  listSitemapCommunityPosts,
  listSitemapCourses,
  listSitemapCredentials,
  listSitemapMentors,
  listSitemapProjects,
  listSitemapRoadmaps,
  listSitemapTools,
  listSitemapUsers,
} from "./sitemap.repository.js";

export async function getSitemapData() {
  const [
    courses,
    roadmaps,
    projects,
    challenges,
    tools,
    communityPosts,
    users,
    mentors,
    credentials,
  ] = await Promise.all([
    listSitemapCourses(),
    listSitemapRoadmaps(),
    listSitemapProjects(),
    listSitemapChallenges(),
    listSitemapTools(),
    listSitemapCommunityPosts(),
    listSitemapUsers(),
    listSitemapMentors(),
    listSitemapCredentials(),
  ]);

  const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    slug: def.slug,
  }));

  return {
    courses: courses.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt.toISOString() })),
    roadmaps: roadmaps.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() })),
    projects: projects.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt.toISOString() })),
    challenges: challenges.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt.toISOString() })),
    tools: tools.map((t) => ({ slug: t.slug, updatedAt: t.updatedAt.toISOString() })),
    achievements,
    community: communityPosts.map((cp) => ({ slug: cp.slug, updatedAt: cp.updatedAt.toISOString() })),
    users: users.map((u) => ({ username: u.username, updatedAt: u.updatedAt.toISOString() })),
    mentors: mentors.map((m) => ({ username: m.user.username, updatedAt: m.updatedAt.toISOString() })),
    credentials: credentials.map((c) => ({ code: c.code, issuedAt: c.issuedAt.toISOString() })),
  };
}


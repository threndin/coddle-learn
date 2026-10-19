import {
  ACHIEVEMENT_DEFINITIONS,
  achievementBySlug,
  isAchievementSlug,
  isExperienceLevel,
  parseProfileUpdateInput,
  pathLabelForRoadmapSlug,
  roadmapProgressPercent,
} from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { config } from "../../config.js";
import { getMySkillGraph } from "../skills/skills.service.js";
import { findByUsernameOrId } from "../users/users.repository.js";
import { toPublicUser, visibilityFromUser } from "../users/users.service.js";
import {
  countCommunityPosts,
  countCompletedCourses,
  countCompletedSteps,
  countCredentials,
  countFollowers,
  countFollowing,
  countSubmittedProjects,
  createFollow,
  deleteFollow,
  findFollow,
  listEarnedAchievements,
  listEnrolledRoadmaps,
  listFollowers,
  listFollowing,
  listPublicCredentials,
  listRecentPosts,
  listSubmittedProjects,
} from "./profiles.repository.js";
import { saveProfileUpdate } from "./profiles-update.repository.js";

const EMPTY_SKILL_GRAPH = {
  demonstratedCount: 0,
  learningCount: 0,
  interestedCount: 0,
  lockedCount: 0,
  totalCount: 0,
  nodes: [] as Awaited<ReturnType<typeof getMySkillGraph>>["nodes"],
  edges: [] as Awaited<ReturnType<typeof getMySkillGraph>>["edges"],
};

function verifyUrl(code: string) {
  return `${config.webOrigin}/verify/${encodeURIComponent(code)}`;
}

function personCard(user: {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio?: string | null;
  experienceLevel?: string | null;
  points?: number;
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio ?? null,
    experienceLevel: isExperienceLevel(user.experienceLevel)
      ? user.experienceLevel
      : user.experienceLevel ?? null,
    points: user.points ?? 0,
  };
}

export async function getPublicProfile(usernameOrId: string, viewerId: string | null) {
  const user = await findByUsernameOrId(usernameOrId);
  if (!user || !user.onboardingCompletedAt) {
    throw new AppError(404, "profile_missing", "That profile could not be found.");
  }

  const isOwn = viewerId === user.id;
  const visibility = visibilityFromUser(user);
  // Owners always see their full profile; visitors respect visibility toggles.
  const reveal = {
    roadmaps: isOwn || visibility.roadmaps,
    projects: isOwn || visibility.projects,
    posts: isOwn || visibility.posts,
    skills: isOwn || visibility.skills,
    credentials: isOwn || visibility.credentials,
    achievements: isOwn || visibility.achievements,
  };

  const [
    followerCount,
    followingCount,
    isFollowing,
    credentialCount,
    achievementRows,
    projectCount,
    courseCount,
    postCount,
    credentials,
    projects,
    roadmaps,
    posts,
    skillGraph,
  ] = await Promise.all([
    countFollowers(user.id),
    countFollowing(user.id),
    viewerId && !isOwn
      ? findFollow(viewerId, user.id).then((row) => Boolean(row))
      : Promise.resolve(false),
    countCredentials(user.id),
    reveal.achievements ? listEarnedAchievements(user.id) : Promise.resolve([]),
    countSubmittedProjects(user.id),
    countCompletedCourses(user.id),
    countCommunityPosts(user.id),
    reveal.credentials ? listPublicCredentials(user.id, 12) : Promise.resolve([]),
    reveal.projects ? listSubmittedProjects(user.id, 12) : Promise.resolve([]),
    reveal.roadmaps ? listEnrolledRoadmaps(user.id) : Promise.resolve([]),
    reveal.posts ? listRecentPosts(user.id, 6) : Promise.resolve([]),
    reveal.skills ? getMySkillGraph(user.id) : Promise.resolve(EMPTY_SKILL_GRAPH),
  ]);

  const earnedAchievements = achievementRows
    .filter((row) => isAchievementSlug(row.slug))
    .map((row) => {
      const definition = achievementBySlug(row.slug);
      if (!definition) return null;
      return {
        slug: definition.slug,
        title: definition.title,
        summary: definition.summary,
        category: definition.category,
        icon: definition.icon,
        earnedAt: row.earnedAt.toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const roadmapPayload = await Promise.all(
    roadmaps.map(async (row) => {
      const stepIds = row.roadmap.steps.map((step) => step.id);
      const done = await countCompletedSteps(user.id, stepIds);
      return {
        slug: row.roadmap.slug,
        name: row.roadmap.name,
        summary: row.roadmap.summary,
        level: row.roadmap.level,
        isPrimary: row.isPrimary,
        progressPercent: roadmapProgressPercent(done, stepIds.length),
        completedAt: row.completedAt?.toISOString() ?? null,
        startedAt: row.startedAt.toISOString(),
      };
    }),
  );

  const highlightedSkills = reveal.skills
    ? skillGraph.nodes
        .filter(
          (node) =>
            node.status === "credentialed" ||
            node.status === "demonstrated" ||
            node.status === "learning",
        )
        .slice(0, 16)
        .map((node) => ({
          slug: node.slug,
          name: node.name,
          category: node.category,
          status: node.status,
        }))
    : [];

  return {
    profile: {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      experienceLevel: isExperienceLevel(user.experienceLevel) ? user.experienceLevel : null,
      points: user.points,
      memberSince: user.createdAt.toISOString(),
      skills: reveal.skills
        ? user.skills.map((row) => ({
            slug: row.skill.slug,
            name: row.skill.name,
          }))
        : [],
      highlightedSkills,
      visibility,
      followerCount,
      followingCount,
      isOwn,
      isFollowing,
      stats: {
        credentials: reveal.credentials ? credentialCount : 0,
        achievements: reveal.achievements ? earnedAchievements.length : 0,
        projects: reveal.projects ? projectCount : 0,
        coursesCompleted: courseCount,
        posts: reveal.posts ? postCount : 0,
        roadmaps: reveal.roadmaps ? roadmaps.length : 0,
        demonstratedSkills: reveal.skills ? skillGraph.demonstratedCount : 0,
      },
    },
    skillGraph: reveal.skills ? skillGraph : EMPTY_SKILL_GRAPH,
    credentials: credentials.map((row) => ({
      id: row.id,
      code: row.code,
      kind: row.kind,
      title: row.title,
      summary: row.summary,
      issuedAt: row.issuedAt.toISOString(),
      verifyUrl: verifyUrl(row.code),
      source:
        row.kind === "assessment" && row.assessment
          ? {
              kind: "assessment" as const,
              assessmentTitle: row.assessment.title,
              courseSlug: row.assessment.course.slug,
              courseTitle: row.assessment.course.title,
            }
          : row.kind === "project" && row.project
            ? {
                kind: "project" as const,
                projectSlug: row.project.slug,
                projectTitle: row.project.title,
                pathLabel: pathLabelForRoadmapSlug(row.project.roadmap.slug),
              }
            : { kind: row.kind },
    })),
    achievements: earnedAchievements,
    projects: projects.map((row) => ({
      id: row.id,
      status: row.status,
      repoUrl: row.repoUrl,
      liveUrl: row.liveUrl,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      project: {
        slug: row.project.slug,
        title: row.project.title,
        summary: row.project.summary,
        level: row.project.level,
        primarySkillSlug: row.project.primarySkillSlug,
        exampleImageUrl: row.project.exampleImageUrl,
        path: {
          roadmapSlug: row.project.roadmap.slug,
          roadmapName: row.project.roadmap.name,
          label: pathLabelForRoadmapSlug(row.project.roadmap.slug),
        },
      },
    })),
    roadmaps: roadmapPayload,
    posts: posts.map((row) => ({
      id: row.id,
      slug: row.slug,
      kind: row.kind,
      topic: row.topic,
      title: row.title,
      body: row.body.slice(0, 220),
      imageUrls: row.imageUrls,
      imageUrl: row.imageUrls[0] ?? null,
      commentCount: row.commentCount,
      createdAt: row.createdAt.toISOString(),
    })),
    achievementCatalogSize: ACHIEVEMENT_DEFINITIONS.length,
  };
}

export async function updateOwnProfile(userId: string, input: unknown) {
  const parsed = parseProfileUpdateInput(input);
  if (!parsed.ok) {
    throw new AppError(400, "invalid_profile", parsed.message);
  }

  const updated = await saveProfileUpdate(userId, parsed.value);
  if (!updated) {
    throw new AppError(404, "user_missing", "Account no longer exists. Sign in again.");
  }

  return toPublicUser(updated);
}

export async function followProfile(viewerId: string, usernameOrId: string) {
  const user = await findByUsernameOrId(usernameOrId);
  if (!user || !user.onboardingCompletedAt) {
    throw new AppError(404, "profile_missing", "That profile could not be found.");
  }
  if (user.id === viewerId) {
    throw new AppError(400, "cannot_follow_self", "You cannot follow yourself.");
  }

  const existing = await findFollow(viewerId, user.id);
  if (!existing) {
    await createFollow(viewerId, user.id);
  }

  return {
    username: user.username,
    isFollowing: true,
    followerCount: await countFollowers(user.id),
  };
}

export async function unfollowProfile(viewerId: string, usernameOrId: string) {
  const user = await findByUsernameOrId(usernameOrId);
  if (!user || !user.onboardingCompletedAt) {
    throw new AppError(404, "profile_missing", "That profile could not be found.");
  }

  await deleteFollow(viewerId, user.id);

  return {
    username: user.username,
    isFollowing: false,
    followerCount: await countFollowers(user.id),
  };
}

export async function getProfileFollowers(usernameOrId: string) {
  const user = await findByUsernameOrId(usernameOrId);
  if (!user || !user.onboardingCompletedAt) {
    throw new AppError(404, "profile_missing", "That profile could not be found.");
  }
  const rows = await listFollowers(user.id);
  return {
    username: user.username,
    people: rows.map((row) => personCard(row.follower)),
  };
}

export async function getProfileFollowing(usernameOrId: string) {
  const user = await findByUsernameOrId(usernameOrId);
  if (!user || !user.onboardingCompletedAt) {
    throw new AppError(404, "profile_missing", "That profile could not be found.");
  }
  const rows = await listFollowing(user.id);
  return {
    username: user.username,
    people: rows.map((row) => personCard(row.following)),
  };
}

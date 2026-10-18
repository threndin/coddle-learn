import {
  ACHIEVEMENT_DEFINITIONS,
  achievementBySlug,
  isAchievementSlug,
  isExperienceLevel,
  pathLabelForRoadmapSlug,
  roadmapProgressPercent,
} from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { config } from "../../config.js";
import { getMySkillGraph } from "../skills/skills.service.js";
import { findByUsernameOrId } from "../users/users.repository.js";
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
    listEarnedAchievements(user.id),
    countSubmittedProjects(user.id),
    countCompletedCourses(user.id),
    countCommunityPosts(user.id),
    listPublicCredentials(user.id, 12),
    listSubmittedProjects(user.id, 12),
    listEnrolledRoadmaps(user.id),
    listRecentPosts(user.id, 6),
    getMySkillGraph(user.id),
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

  const highlightedSkills = skillGraph.nodes
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
    }));

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
      skills: user.skills.map((row) => ({
        slug: row.skill.slug,
        name: row.skill.name,
      })),
      highlightedSkills,
      followerCount,
      followingCount,
      isOwn,
      isFollowing,
      stats: {
        credentials: credentialCount,
        achievements: earnedAchievements.length,
        projects: projectCount,
        coursesCompleted: courseCount,
        posts: postCount,
        roadmaps: roadmaps.length,
        demonstratedSkills: skillGraph.demonstratedCount,
      },
    },
    skillGraph,
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

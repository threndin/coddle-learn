import type { ExperienceLevel, ProfileVisibility, SkillStatus } from "@coddle/shared";
import { profilePath } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";
import type { SkillGraph } from "@/lib/skills";

export { profilePath };

export type ProfilePerson = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio?: string | null;
  experienceLevel?: string | null;
  points?: number;
};

export type PublicProfileSkill = {
  slug: string;
  name: string;
  category?: string;
  status?: SkillStatus;
};

export type PublicProfileCredential = {
  id: string;
  code: string;
  kind: string;
  title: string;
  summary: string;
  issuedAt: string;
  verifyUrl: string;
  source: {
    kind: string;
    assessmentTitle?: string;
    courseSlug?: string;
    courseTitle?: string;
    projectSlug?: string;
    projectTitle?: string;
    pathLabel?: string | null;
  };
};

export type PublicProfileAchievement = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  icon: string;
  earnedAt: string;
};

export type PublicProfileProject = {
  id: string;
  status: string;
  repoUrl: string | null;
  liveUrl: string | null;
  submittedAt: string | null;
  project: {
    slug: string;
    title: string;
    summary: string;
    level: string;
    primarySkillSlug: string;
    exampleImageUrl: string | null;
    path: {
      roadmapSlug: string;
      roadmapName: string;
      label: string;
    };
  };
};

export type PublicProfileRoadmap = {
  slug: string;
  name: string;
  summary: string;
  level: string;
  isPrimary: boolean;
  progressPercent: number;
  completedAt: string | null;
  startedAt: string;
};

export type PublicProfilePost = {
  id: string;
  slug: string;
  kind: string;
  topic: string;
  title: string;
  body: string;
  /** First attached image, when the post has media. */
  imageUrl: string | null;
  imageUrls?: string[];
  commentCount: number;
  createdAt: string;
};

export type PublicProfile = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  experienceLevel: ExperienceLevel | null;
  points: number;
  memberSince: string;
  skills: { slug: string; name: string }[];
  highlightedSkills: PublicProfileSkill[];
  visibility: ProfileVisibility;
  followerCount: number;
  followingCount: number;
  isOwn: boolean;
  isFollowing: boolean;
  mentorship: {
    headline: string;
    availability: string;
    topics: string[];
    openProgramCount: number;
  } | null;
  stats: {
    credentials: number;
    achievements: number;
    projects: number;
    coursesCompleted: number;
    posts: number;
    roadmaps: number;
    demonstratedSkills: number;
  };
};

export type PublicProfilePayload = {
  profile: PublicProfile;
  skillGraph: SkillGraph;
  credentials: PublicProfileCredential[];
  achievements: PublicProfileAchievement[];
  projects: PublicProfileProject[];
  roadmaps: PublicProfileRoadmap[];
  posts: PublicProfilePost[];
  achievementCatalogSize: number;
};

export type FollowMutationResult = {
  username: string;
  isFollowing: boolean;
  followerCount: number;
};

export type ProfilePeoplePayload = {
  username: string;
  people: ProfilePerson[];
};

export function fetchPublicProfile(username: string, signal?: AbortSignal) {
  return apiRequest<PublicProfilePayload>(
    `/profiles/${encodeURIComponent(username)}`,
    { signal },
  );
}

export function followProfile(username: string) {
  return apiRequest<FollowMutationResult>(
    `/profiles/${encodeURIComponent(username)}/follow`,
    { method: "POST" },
  );
}

export function unfollowProfile(username: string) {
  return apiRequest<FollowMutationResult>(
    `/profiles/${encodeURIComponent(username)}/follow`,
    { method: "DELETE" },
  );
}

export function fetchProfileFollowers(username: string) {
  return apiRequest<ProfilePeoplePayload>(
    `/profiles/${encodeURIComponent(username)}/followers`,
  );
}

export function fetchProfileFollowing(username: string) {
  return apiRequest<ProfilePeoplePayload>(
    `/profiles/${encodeURIComponent(username)}/following`,
  );
}

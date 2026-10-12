import type { ExperienceLevel, ProjectSubmissionStatus } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type ProjectSkill = {
  slug: string;
  name: string;
  category: string;
};

export type ProjectPath = {
  roadmapSlug: string;
  roadmapName: string;
  label: string;
};

export type ProjectCatalogItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: ExperienceLevel | string;
  estimatedHours: number;
  exampleImageUrl: string | null;
  primarySkillSlug: string;
  primarySkillName: string;
  skills: ProjectSkill[];
  checklistCount: number;
  startedCount: number;
  path: ProjectPath;
  course: { slug: string; title: string } | null;
  mySubmission: {
    status: ProjectSubmissionStatus | string;
    startedAt: string;
    submittedAt: string | null;
  } | null;
};

export type ProjectSubmission = {
  id: string;
  status: ProjectSubmissionStatus | string;
  repoUrl: string | null;
  liveUrl: string | null;
  notes: string;
  pointsAwarded: number;
  startedAt: string;
  submittedAt: string | null;
  updatedAt: string;
};

export type ProjectDetail = ProjectCatalogItem & {
  body: string;
  checklist: string[];
  roadmapStep: { slug: string; title: string } | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  publishedAt: string | null;
  submission: ProjectSubmission | null;
};

export type ProjectActivityItem = {
  id: string;
  status: ProjectSubmissionStatus | string;
  startedAt: string;
  submittedAt: string | null;
  updatedAt: string;
  project: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    level: string;
    primarySkillSlug: string;
    exampleImageUrl: string | null;
    path: ProjectPath;
  };
};

export function fetchProjects() {
  return apiRequest<{ projects: ProjectCatalogItem[] }>("/projects");
}

export function fetchProject(slug: string) {
  return apiRequest<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(slug)}`);
}

export function startProject(slug: string) {
  return apiRequest<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(slug)}/start`, {
    method: "POST",
  });
}

export function submitProjectSolution(
  slug: string,
  input: { repoUrl?: string | null; liveUrl?: string | null; notes?: string },
) {
  return apiRequest<{
    project: ProjectDetail;
    pointsAwarded: number;
    credential: { id: string; title: string } | null;
  }>(`/projects/${encodeURIComponent(slug)}/submit`, {
    method: "POST",
    json: input,
  });
}

export function fetchMyProjects() {
  return apiRequest<{ submissions: ProjectActivityItem[] }>("/projects/mine");
}

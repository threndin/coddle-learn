import type {
  ExperienceLevel,
  ProjectChecklistItem,
  ProjectStatus,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";
import type { ProjectSkill } from "@/lib/projects";

export type StudioProjectListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: ExperienceLevel | string;
  status: ProjectStatus;
  primarySkillSlug: string;
  exampleImageUrl: string | null;
  estimatedHours: number;
  startedCount: number;
  reviewNote: string | null;
  path: { roadmapSlug: string; roadmapName: string; label: string };
  submittedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type StudioProjectList = {
  reviewMode: "auto" | "manual";
  projects: StudioProjectListItem[];
};

export type StudioProject = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  level: ExperienceLevel | string;
  checklist: string[];
  exampleImageUrl: string | null;
  primarySkillSlug: string;
  estimatedHours: number;
  status: ProjectStatus;
  sortOrder: number;
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewMode: "auto" | "manual";
  skills: ProjectSkill[];
  path: {
    roadmapId: string;
    roadmapSlug: string;
    roadmapName: string;
    label: string;
    stepId: string | null;
    stepSlug: string | null;
    stepTitle: string | null;
  };
  course: { id: string; slug: string; title: string } | null;
  startedCount: number;
  checklistReady: ProjectChecklistItem[];
  permissions: {
    canEdit: boolean;
    canSubmit: boolean;
    canWithdraw: boolean;
    canArchive: boolean;
    canRestore: boolean;
    canDelete: boolean;
  };
};

export type StudioProjectOptions = {
  roadmaps: Array<{
    id: string;
    slug: string;
    name: string;
    label: string;
    steps: Array<{ id: string; slug: string; title: string }>;
  }>;
  courses: Array<{ id: string; slug: string; title: string }>;
};

const base = (projectId: string) => `/studio/projects/${encodeURIComponent(projectId)}`;

export function fetchStudioProjects() {
  return apiRequest<StudioProjectList>("/studio/projects");
}

export function fetchStudioProjectOptions() {
  return apiRequest<StudioProjectOptions>("/studio/projects/options");
}

export function createStudioProject(input: {
  title: string;
  summary?: string;
  level: string;
  roadmapSlug: string;
  primarySkillSlug: string;
  skillSlugs: string[];
}) {
  return apiRequest<{ project: StudioProject }>("/studio/projects", {
    method: "POST",
    json: input,
  });
}

export function fetchStudioProject(projectId: string) {
  return apiRequest<{ project: StudioProject }>(base(projectId));
}

export function updateStudioProject(
  projectId: string,
  patch: Partial<{
    title: string;
    summary: string;
    body: string;
    level: string;
    checklist: string[];
    exampleImageUrl: string | null;
    primarySkillSlug: string;
    skillSlugs: string[];
    estimatedHours: number;
    roadmapSlug: string;
    roadmapStepSlug: string | null;
    courseSlug: string | null;
  }>,
) {
  return apiRequest<{ project: StudioProject }>(base(projectId), {
    method: "PATCH",
    json: patch,
  });
}

export function deleteStudioProject(projectId: string) {
  return apiRequest<{ ok: true }>(base(projectId), { method: "DELETE" });
}

export type ProjectLifecycleAction = "submit" | "withdraw" | "archive" | "restore";

export function runProjectLifecycle(projectId: string, action: ProjectLifecycleAction) {
  return apiRequest<{ project: StudioProject }>(`${base(projectId)}/${action}`, {
    method: "POST",
  });
}

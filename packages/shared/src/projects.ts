import {
  COURSE_STATUSES,
  COURSE_STATUS_META,
  EDITABLE_COURSE_STATUSES,
  type CourseChecklistItem,
  type CourseStatus,
} from "./course-studio.js";
import { STARTER_ROADMAPS } from "./roadmaps.js";
import type { ExperienceLevel } from "./onboarding.js";

/** Same lifecycle as courses. */
export const PROJECT_STATUSES = COURSE_STATUSES;
export type ProjectStatus = CourseStatus;

export const PROJECT_STATUS_META = COURSE_STATUS_META;
export const EDITABLE_PROJECT_STATUSES = EDITABLE_COURSE_STATUSES;

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    (PROJECT_STATUSES as readonly string[]).includes(value)
  );
}

export const PROJECT_SUBMISSION_STATUSES = ["started", "submitted"] as const;
export type ProjectSubmissionStatus = (typeof PROJECT_SUBMISSION_STATUSES)[number];

export function isProjectSubmissionStatus(
  value: unknown,
): value is ProjectSubmissionStatus {
  return (
    typeof value === "string" &&
    (PROJECT_SUBMISSION_STATUSES as readonly string[]).includes(value)
  );
}

export const PROJECT_LIMITS = {
  titleMin: 4,
  titleMax: 90,
  summaryMin: 20,
  summaryMax: 280,
  bodyMin: 80,
  bodyMax: 40_000,
  skillMax: 6,
  checklistMax: 12,
  checklistItemMax: 200,
  notesMax: 4000,
  urlMax: 500,
  exampleImageUrlMax: 500,
  estimatedHoursMin: 1,
  estimatedHoursMax: 80,
  queryMax: 80,
} as const;

/** Points for the first submitted solution on a project. */
export const PROJECT_SUBMIT_POINTS = 25;

export type ProjectPathFilter = {
  roadmapSlug: string;
  label: string;
};

/** Short catalog chips mapped from seeded roadmaps. */
export const PROJECT_PATH_FILTERS: readonly ProjectPathFilter[] = [
  { roadmapSlug: "programming-foundations", label: "Foundations" },
  { roadmapSlug: "frontend-developer", label: "Frontend" },
  { roadmapSlug: "typescript", label: "TypeScript" },
  { roadmapSlug: "node-backend", label: "Backend" },
  { roadmapSlug: "cloud-engineering", label: "Cloud" },
  { roadmapSlug: "go-services", label: "Go" },
  { roadmapSlug: "system-design", label: "System Design" },
] as const;

export function pathLabelForRoadmapSlug(slug: string): string {
  return (
    PROJECT_PATH_FILTERS.find((path) => path.roadmapSlug === slug)?.label ??
    STARTER_ROADMAPS.find((roadmap) => roadmap.slug === slug)?.name ??
    slug
  );
}

export type ProjectChecklistItem = CourseChecklistItem;

export function projectChecklist(input: {
  title: string;
  summary: string;
  body: string;
  checklist: readonly string[];
  primarySkillSlug: string;
  skillCount: number;
  roadmapSlug: string | null;
}): ProjectChecklistItem[] {
  return [
    {
      id: "title",
      label: "Title is specific",
      done: input.title.trim().length >= PROJECT_LIMITS.titleMin,
    },
    {
      id: "summary",
      label: "Short goal summary",
      done: input.summary.trim().length >= PROJECT_LIMITS.summaryMin,
    },
    {
      id: "body",
      label: "Requirements write-up",
      done: input.body.trim().length >= PROJECT_LIMITS.bodyMin,
    },
    {
      id: "checklist",
      label: "Done checklist (at least 3 items)",
      done: input.checklist.filter((item) => item.trim().length > 0).length >= 3,
    },
    {
      id: "skills",
      label: "Primary skill and tags",
      done: Boolean(input.primarySkillSlug) && input.skillCount >= 1,
    },
    {
      id: "path",
      label: "Learning path (roadmap)",
      done: Boolean(input.roadmapSlug),
    },
  ];
}

export type StarterProject = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  level: ExperienceLevel;
  checklist: readonly string[];
  /** Path under the web app public folder, e.g. `/projects/single-page-cv.jpg`. */
  exampleImageUrl: string;
  primarySkillSlug: string;
  skillSlugs: readonly string[];
  roadmapSlug: string;
  roadmapStepSlug?: string;
  courseSlug?: string;
  estimatedHours: number;
};

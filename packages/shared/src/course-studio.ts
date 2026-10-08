import { exerciseIssues, type ExerciseReadinessInput } from "./exercises.js";

export const COURSE_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "published",
  "archived",
] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export function isCourseStatus(value: unknown): value is CourseStatus {
  return (
    typeof value === "string" && (COURSE_STATUSES as readonly string[]).includes(value)
  );
}

export const COURSE_STATUS_META: Record<
  CourseStatus,
  { label: string; description: string }
> = {
  draft: {
    label: "Draft",
    description: "Only you can see this course. Keep building, then submit it for review.",
  },
  in_review: {
    label: "In review",
    description: "A reviewer is checking this course. Editing is paused until review finishes.",
  },
  changes_requested: {
    label: "Changes requested",
    description: "A reviewer asked for changes. Update the course and submit it again.",
  },
  published: {
    label: "Published",
    description: "Learners can find and take this course.",
  },
  archived: {
    label: "Archived",
    description: "Hidden from the catalog. Enrolled learners keep access.",
  },
};

/** Statuses in which the creator may change content. */
export const EDITABLE_COURSE_STATUSES: readonly CourseStatus[] = [
  "draft",
  "changes_requested",
  "published",
  "archived",
];

export const COURSE_LIMITS = {
  titleMin: 4,
  titleMax: 90,
  summaryMin: 30,
  summaryMax: 280,
  skillMax: 6,
  moduleTitleMax: 90,
  moduleSummaryMax: 240,
  lessonTitleMax: 120,
  lessonSummaryMax: 240,
  lessonContentMax: 60_000,
  lessonContentMin: 120,
  lessonMinutesMin: 1,
  lessonMinutesMax: 600,
  modulesMax: 40,
  lessonsPerModuleMax: 40,
  reviewBodyMax: 2000,
  reviewNoteMax: 2000,
  thumbnailBytesMax: 3 * 1024 * 1024,
  assetBytesMax: 5 * 1024 * 1024,
} as const;

export const COURSE_ACCENTS = [
  { id: "#004CC8", label: "Coddle blue" },
  { id: "#0F766E", label: "Teal" },
  { id: "#B45309", label: "Amber" },
  { id: "#7C3AED", label: "Violet" },
  { id: "#BE123C", label: "Rose" },
  { id: "#0369A1", label: "Sky" },
  { id: "#15803D", label: "Green" },
  { id: "#334155", label: "Slate" },
] as const;

export function isCourseAccent(value: unknown): value is string {
  return typeof value === "string" && COURSE_ACCENTS.some((accent) => accent.id === value);
}

export const COURSE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export function slugify(input: string, fallback = "untitled"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** Pick `base`, or `base-2`, `base-3`... when taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function markdownWordCount(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|\-]+/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Rough study time: ~180 wpm for prose, ~2 min per code block, then
 * practice time proportional to reading.
 */
export function suggestedLessonMinutes(markdown: string): number {
  const words = markdownWordCount(markdown);
  const codeBlocks = (markdown.match(/```/g)?.length ?? 0) / 2;
  const reading = words / 180 + Math.floor(codeBlocks) * 2;
  const withPractice = reading * 1.6;
  return Math.max(5, Math.min(COURSE_LIMITS.lessonMinutesMax, Math.round(withPractice / 5) * 5));
}

export function estimatedHoursFromMinutes(totalMinutes: number): number {
  return Math.max(1, Math.round(totalMinutes / 60));
}

export type CourseChecklistInput = {
  title: string;
  summary: string;
  skillCount: number;
  modules: readonly {
    title: string;
    lessons: readonly {
      title: string;
      content: string;
      exercises: readonly ExerciseReadinessInput[];
    }[];
  }[];
};

export type CourseChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

/** What a course needs before it can be submitted for review. */
export function courseChecklist(input: CourseChecklistInput): CourseChecklistItem[] {
  const lessons = input.modules.flatMap((courseModule) => courseModule.lessons);
  const thinLessons = lessons.filter(
    (lesson) => lesson.content.trim().length < COURSE_LIMITS.lessonContentMin,
  );
  const exercises = lessons.flatMap((lesson) => lesson.exercises);
  const unfinishedExercises = exercises.filter((exercise) => exerciseIssues(exercise).length > 0);
  return [
    {
      id: "title",
      label: `Title is at least ${COURSE_LIMITS.titleMin} characters`,
      done: input.title.trim().length >= COURSE_LIMITS.titleMin,
    },
    {
      id: "summary",
      label: `Summary is at least ${COURSE_LIMITS.summaryMin} characters`,
      done: input.summary.trim().length >= COURSE_LIMITS.summaryMin,
    },
    {
      id: "skills",
      label: "At least one skill is tagged",
      done: input.skillCount > 0,
    },
    {
      id: "modules",
      label: "At least one module",
      done: input.modules.length > 0,
    },
    {
      id: "lessons",
      label: "Every module has a lesson",
      done:
        input.modules.length > 0 &&
        input.modules.every((courseModule) => courseModule.lessons.length > 0),
    },
    {
      id: "content",
      label:
        thinLessons.length > 0
          ? `Every lesson has real content (${thinLessons.length} still thin)`
          : "Every lesson has real content",
      done: lessons.length > 0 && thinLessons.length === 0,
    },
    {
      id: "exercises",
      label: "Every module has an exercise",
      done:
        input.modules.length > 0 &&
        input.modules.every((courseModule) =>
          courseModule.lessons.some((lesson) => lesson.exercises.length > 0),
        ),
    },
    {
      id: "exercise-content",
      label:
        unfinishedExercises.length > 0
          ? `Every exercise is ready (${unfinishedExercises.length} still need work)`
          : "Every exercise is ready",
      done: exercises.length > 0 && unfinishedExercises.length === 0,
    },
  ];
}

export const REVIEW_SORTS = ["recent", "highest", "lowest"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export function isReviewSort(value: unknown): value is ReviewSort {
  return typeof value === "string" && (REVIEW_SORTS as readonly string[]).includes(value);
}

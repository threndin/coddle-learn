import type {
  CourseStatus,
  ExerciseKind,
  ExerciseSubmissionStatus,
  ExperienceLevel,
  LessonProgressStatus,
  ReviewSort,
} from "@coddle/shared";
import { apiFetch, apiRequest, csrfHeaders } from "@/lib/api-client";

export type CourseCreator = {
  id: string;
  username?: string;
  name: string;
  avatarUrl: string | null;
};

export type CourseSkill = {
  slug: string;
  name: string;
  category: string;
};

export type LessonUiStatus = "locked" | "current" | "completed" | "skipped";

export type CourseRating = {
  average: number;
  count: number;
};

export type CourseCatalogItem = {
  slug: string;
  title: string;
  summary: string;
  level: ExperienceLevel | string;
  thumbnailUrl: string;
  estimatedHours: number;
  publishedAt: string | null;
  rating: CourseRating;
  createdBy: CourseCreator;
  skills: CourseSkill[];
  skillSlugs: string[];
  matchedSkillSlugs: string[];
  moduleCount: number;
  lessonCount: number;
  exerciseCount: number;
  hasAssessment?: boolean;
  enrolled: boolean;
  startedAt: string | null;
  completedAt: string | null;
  progressPercent: number;
  nextLesson: {
    slug: string;
    title: string;
    moduleSlug?: string;
  } | null;
};

export type ExerciseSubmissionResponse = {
  checked?: number[];
  url?: string;
  note?: string;
  answer?: string;
  answers?: Record<string, string>;
  results?: Record<string, boolean>;
  correct?: number;
  total?: number;
};

export type CourseExerciseDetail = {
  id: string;
  kind: ExerciseKind;
  title: string;
  instructions: string;
  estimatedMinutes: number;
  hint: string;
  hasSolution: boolean;
  /** Only sent once the learner is done. */
  solution: string | null;
  requirements: string[];
  quiz: {
    passPercent: number;
    questions: {
      id: string;
      prompt: string;
      options: { id: string; text: string }[];
      correctOptionId: string | null;
      explanation: string | null;
    }[];
  } | null;
  submission: {
    status: ExerciseSubmissionStatus;
    response: ExerciseSubmissionResponse;
    score: number | null;
    attempts: number;
    updatedAt: string;
  } | null;
};

export type CourseLessonDetail = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
  status: LessonUiStatus;
  exercises: CourseExerciseDetail[];
};

export type CourseModuleDetail = {
  slug: string;
  title: string;
  summary: string;
  lessons: CourseLessonDetail[];
};

export type CourseDetail = {
  slug: string;
  title: string;
  summary: string;
  level: ExperienceLevel | string;
  status: CourseStatus;
  thumbnailUrl: string;
  estimatedHours: number;
  publishedAt: string | null;
  updatedAt: string;
  rating: CourseRating;
  viewer: {
    isCreator: boolean;
    studioCourseId: string | null;
    canStart: boolean;
  };
  createdBy: CourseCreator;
  skills: CourseSkill[];
  enrolled: boolean;
  startedAt: string | null;
  completedAt: string | null;
  progressPercent: number;
  exerciseCount: number;
  exercisesDone: number;
  nextLesson: {
    slug: string;
    title: string;
    moduleSlug?: string;
  } | null;
  assessment: {
    id: string;
    title: string;
    passed: boolean;
    unlocked: boolean;
  } | null;
  modules: CourseModuleDetail[];
};

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return body?.error?.message ?? "Something went wrong";
}

export async function fetchCourses(): Promise<CourseCatalogItem[]> {
  const res = await apiFetch("/api/courses");
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { courses: CourseCatalogItem[] } };
  return body.data.courses;
}

export async function fetchCourse(slug: string): Promise<CourseDetail> {
  const res = await apiFetch(`/api/courses/${encodeURIComponent(slug)}`);
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { course: CourseDetail } };
  return body.data.course;
}

export async function startCourse(slug: string): Promise<CourseDetail> {
  const res = await apiFetch(`/api/courses/${encodeURIComponent(slug)}/start`, {
    method: "POST",
    headers: csrfHeaders(),
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { course: CourseDetail } };
  return body.data.course;
}

export async function updateCourseProgress(
  slug: string,
  moduleSlug: string,
  lessonSlug: string,
  status: LessonProgressStatus | "incomplete",
): Promise<{
  course: CourseDetail;
  pointsAwarded: number;
  courseCompleteBonus: number;
}> {
  const res = await apiFetch(`/api/courses/${encodeURIComponent(slug)}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({ moduleSlug, lessonSlug, status }),
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as {
    data: {
      course: CourseDetail;
      pointsAwarded: number;
      courseCompleteBonus: number;
    };
  };
  return {
    course: body.data.course,
    pointsAwarded: body.data.pointsAwarded ?? 0,
    courseCompleteBonus: body.data.courseCompleteBonus ?? 0,
  };
}

export type ExerciseSubmissionInput = {
  checked?: number[];
  url?: string;
  note?: string;
  answer?: string;
  answers?: Record<string, string>;
};

export type ExerciseSubmitResult = {
  course: CourseDetail;
  result: { status: ExerciseSubmissionStatus; score: number | null };
  pointsAwarded: number;
  courseCompleteBonus: number;
};

const exercisePath = (slug: string, exerciseId: string) =>
  `/courses/${encodeURIComponent(slug)}/exercises/${encodeURIComponent(exerciseId)}/submission`;

export function submitExercise(slug: string, exerciseId: string, input: ExerciseSubmissionInput) {
  return apiRequest<ExerciseSubmitResult>(exercisePath(slug, exerciseId), {
    method: "POST",
    json: input,
  });
}

export function resetExercise(slug: string, exerciseId: string) {
  return apiRequest<{ course: CourseDetail }>(exercisePath(slug, exerciseId), {
    method: "DELETE",
  });
}

export type CourseReview = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  author: CourseCreator;
  completedCourse: boolean;
  isMine: boolean;
};

export type ReviewSummary = CourseRating & {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type ReviewEligibility =
  | { canReview: true; reason: null }
  | { canReview: false; reason: "creator" | "not_enrolled" | "not_published" };

export type CourseReviewsPage = {
  summary: ReviewSummary;
  reviews: CourseReview[];
  myReview: CourseReview | null;
  eligibility: ReviewEligibility;
  page: number;
  hasMore: boolean;
  sort: ReviewSort;
};

const reviewsPath = (slug: string) => `/courses/${encodeURIComponent(slug)}/reviews`;

export function fetchCourseReviews(slug: string, sort: ReviewSort, page = 1) {
  return apiRequest<CourseReviewsPage>(
    `${reviewsPath(slug)}?sort=${encodeURIComponent(sort)}&page=${page}`,
  );
}

export function saveCourseReview(slug: string, input: { rating: number; body: string }) {
  return apiRequest<{ review: CourseReview; summary: ReviewSummary }>(reviewsPath(slug), {
    method: "PUT",
    json: input,
  });
}

export function deleteCourseReview(slug: string) {
  return apiRequest<{ summary: ReviewSummary }>(reviewsPath(slug), { method: "DELETE" });
}

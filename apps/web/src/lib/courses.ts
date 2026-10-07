import type {
  CourseStatus,
  ExperienceLevel,
  LessonProgressStatus,
  ReviewSort,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type CourseCreator = {
  id: string;
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

export type CourseLessonDetail = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
  status: LessonUiStatus;
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
  nextLesson: {
    slug: string;
    title: string;
    moduleSlug?: string;
  } | null;
  modules: CourseModuleDetail[];
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function csrfHeaders(): HeadersInit {
  const csrf = readCookie("learn_csrf");
  return csrf ? { "x-csrf-token": csrf } : {};
}

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return body?.error?.message ?? "Something went wrong";
}

export async function fetchCourses(): Promise<CourseCatalogItem[]> {
  const res = await fetch("/api/courses", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { courses: CourseCatalogItem[] } };
  return body.data.courses;
}

export async function fetchCourse(slug: string): Promise<CourseDetail> {
  const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { course: CourseDetail } };
  return body.data.course;
}

export async function startCourse(slug: string): Promise<CourseDetail> {
  const res = await fetch(`/api/courses/${encodeURIComponent(slug)}/start`, {
    method: "POST",
    credentials: "include",
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
  const res = await fetch(`/api/courses/${encodeURIComponent(slug)}/progress`, {
    method: "POST",
    credentials: "include",
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

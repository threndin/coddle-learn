import type {
  CourseChecklistItem,
  CourseStatus,
  ExperienceLevel,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";
import type { CourseSkill } from "@/lib/courses";

export type StudioLesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
  updatedAt: string;
};

export type StudioModule = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  lessons: StudioLesson[];
};

export type StudioCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: ExperienceLevel | string;
  status: CourseStatus;
  accent: string;
  thumbnailUrl: string;
  customThumbnail: boolean;
  estimatedHours: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewMode: "auto" | "manual";
  uploadsEnabled: boolean;
  skills: CourseSkill[];
  modules: StudioModule[];
  stats: {
    enrolledCount: number;
    completedCount: number;
    ratingAverage: number;
    ratingCount: number;
  };
  checklist: CourseChecklistItem[];
  permissions: {
    canEdit: boolean;
    canSubmit: boolean;
    canWithdraw: boolean;
    canArchive: boolean;
    canRestore: boolean;
    canDelete: boolean;
  };
};

export type StudioCourseListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: ExperienceLevel | string;
  status: CourseStatus;
  accent: string;
  thumbnailUrl: string;
  estimatedHours: number;
  moduleCount: number;
  lessonCount: number;
  enrolledCount: number;
  completedCount: number;
  ratingAverage: number;
  ratingCount: number;
  reviewNote: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type StudioCourseList = {
  reviewMode: "auto" | "manual";
  courses: StudioCourseListItem[];
};

type CourseResponse = { course: StudioCourse };
type CreatedResponse = CourseResponse & { createdId: string };

const base = (courseId: string) => `/studio/courses/${encodeURIComponent(courseId)}`;

export function fetchStudioCourses() {
  return apiRequest<StudioCourseList>("/studio/courses");
}

export function createStudioCourse(input: {
  title: string;
  summary: string;
  level: string;
  accent: string;
  skillSlugs: string[];
}) {
  return apiRequest<CourseResponse>("/studio/courses", { method: "POST", json: input });
}

export function updateStudioCourse(
  courseId: string,
  patch: Partial<{
    title: string;
    summary: string;
    level: string;
    accent: string;
    skillSlugs: string[];
  }>,
) {
  return apiRequest<CourseResponse>(base(courseId), { method: "PATCH", json: patch });
}

export function deleteStudioCourse(courseId: string) {
  return apiRequest<{ deleted: true }>(base(courseId), { method: "DELETE" });
}

export type LifecycleAction = "submit" | "withdraw" | "archive" | "restore";

export function runLifecycleAction(courseId: string, action: LifecycleAction) {
  return apiRequest<CourseResponse>(`${base(courseId)}/${action}`, { method: "POST" });
}

export function uploadThumbnail(courseId: string, file: File) {
  return apiRequest<CourseResponse>(`${base(courseId)}/thumbnail`, {
    method: "PUT",
    body: file,
    contentType: file.type,
  });
}

export function resetThumbnail(courseId: string) {
  return apiRequest<CourseResponse>(`${base(courseId)}/thumbnail`, { method: "DELETE" });
}

export function uploadLessonImage(courseId: string, file: File) {
  return apiRequest<{ url: string }>(`${base(courseId)}/assets`, {
    method: "POST",
    body: file,
    contentType: file.type,
  });
}

export function saveOutline(courseId: string, modules: { id: string; lessonIds: string[] }[]) {
  return apiRequest<CourseResponse>(`${base(courseId)}/outline`, {
    method: "PUT",
    json: { modules },
  });
}

export function createModule(courseId: string, input: { title: string; summary?: string }) {
  return apiRequest<CreatedResponse>(`${base(courseId)}/modules`, { method: "POST", json: input });
}

export function updateModule(
  courseId: string,
  moduleId: string,
  patch: Partial<{ title: string; summary: string }>,
) {
  return apiRequest<CourseResponse>(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}`, {
    method: "PATCH",
    json: patch,
  });
}

export function deleteModule(courseId: string, moduleId: string) {
  return apiRequest<CourseResponse>(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
  });
}

export function createLesson(
  courseId: string,
  moduleId: string,
  input: { title: string; summary?: string; content?: string; estimatedMinutes?: number },
) {
  return apiRequest<CreatedResponse>(
    `${base(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons`,
    { method: "POST", json: input },
  );
}

export function updateLesson(
  courseId: string,
  lessonId: string,
  patch: Partial<{ title: string; summary: string; content: string; estimatedMinutes: number }>,
  options: { keepalive?: boolean } = {},
) {
  return apiRequest<{ lesson: StudioLesson }>(
    `${base(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
    { method: "PATCH", json: patch, keepalive: options.keepalive },
  );
}

export function deleteLesson(courseId: string, lessonId: string) {
  return apiRequest<CourseResponse>(`${base(courseId)}/lessons/${encodeURIComponent(lessonId)}`, {
    method: "DELETE",
  });
}

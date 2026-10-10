import type { AssessmentQuestionKind, ExperienceLevel } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type AssessmentCourseRef = {
  slug: string;
  title: string;
  summary: string;
  level: ExperienceLevel | string;
  thumbnailUrl: string;
};

export type AssessmentAttemptSummary = {
  id: string;
  status: "in_progress" | "submitted" | string;
  score: number | null;
  passed: boolean | null;
  pointsEarned: number;
  startedAt: string;
  submittedAt: string | null;
};

export type AssessmentCatalogItem = {
  id: string;
  title: string;
  summary: string;
  passPercent: number;
  timeLimitMinutes: number | null;
  questionCount: number;
  totalPoints: number;
  course: AssessmentCourseRef;
  enrolled: boolean;
  courseCompleted: boolean;
  lessonsReady: boolean;
  canStart: boolean;
  passed: boolean;
  bestScore: number | null;
  attemptCount: number;
  inProgressAttemptId: string | null;
  latestAttempt: AssessmentAttemptSummary | null;
};

export type AssessmentDetail = AssessmentCatalogItem & {
  attempts: AssessmentAttemptSummary[];
};

export type AssessmentQuestion = {
  id: string;
  kind: AssessmentQuestionKind;
  prompt: string;
  points: number;
  options: { id: string; text: string }[];
  correctOptionId: string | null;
  acceptedAnswers: string[] | null;
  explanation: string | null;
};

export type AssessmentAttemptDetail = AssessmentAttemptSummary & {
  answers: Record<string, string> | unknown;
  results: Record<string, boolean> | null;
  questions: AssessmentQuestion[];
};

export type AssessmentMeta = {
  id: string;
  title: string;
  summary: string;
  passPercent: number;
  timeLimitMinutes: number | null;
  questionCount: number;
  totalPoints: number;
  course: AssessmentCourseRef;
};

export function fetchAssessments() {
  return apiRequest<{ assessments: AssessmentCatalogItem[] }>("/assessments");
}

export function fetchAssessment(id: string) {
  return apiRequest<{ assessment: AssessmentDetail }>(
    `/assessments/${encodeURIComponent(id)}`,
  );
}

export function startAssessmentAttempt(id: string) {
  return apiRequest<{ attempt: AssessmentAttemptDetail; assessment: AssessmentMeta }>(
    `/assessments/${encodeURIComponent(id)}/attempts`,
    { method: "POST" },
  );
}

export function submitAssessmentAttempt(
  id: string,
  attemptId: string,
  answers: Record<string, string>,
) {
  return apiRequest<{
    attempt: AssessmentAttemptDetail;
    assessment: AssessmentMeta;
    pointsAwarded: number;
    courseCompleteBonus: number;
  }>(`/assessments/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
    json: { answers },
  });
}

export function fetchAssessmentAttempt(id: string, attemptId: string) {
  return apiRequest<{ attempt: AssessmentAttemptDetail; assessment: AssessmentMeta }>(
    `/assessments/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}`,
  );
}

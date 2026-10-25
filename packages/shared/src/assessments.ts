import { QUIZ_ID_PATTERN, quizPassed } from "./exercises.js";

export const ASSESSMENT_QUESTION_KINDS = [
  "multiple_choice",
  "true_false",
  "short_answer",
] as const;
export type AssessmentQuestionKind = (typeof ASSESSMENT_QUESTION_KINDS)[number];

export function isAssessmentQuestionKind(value: unknown): value is AssessmentQuestionKind {
  return (
    typeof value === "string" &&
    (ASSESSMENT_QUESTION_KINDS as readonly string[]).includes(value)
  );
}

export const ASSESSMENT_QUESTION_KIND_META: Record<
  AssessmentQuestionKind,
  { label: string; description: string }
> = {
  multiple_choice: {
    label: "Multiple choice",
    description: "One correct option among several answers.",
  },
  true_false: {
    label: "True / false",
    description: "A statement the learner marks true or false.",
  },
  short_answer: {
    label: "Short answer",
    description: "A short text answer checked against accepted responses.",
  },
};

export const ASSESSMENT_ATTEMPT_STATUSES = ["in_progress", "submitted"] as const;
export type AssessmentAttemptStatus = (typeof ASSESSMENT_ATTEMPT_STATUSES)[number];

export const ASSESSMENT_PASS_POINTS = 25;
export const ASSESSMENT_PASS_POINT_REASON = "assessment_pass" as const;

export const ASSESSMENT_LIMITS = {
  titleMin: 4,
  titleMax: 120,
  summaryMax: 500,
  passPercentMin: 50,
  passPercentMax: 100,
  passPercentDefault: 80,
  questionsMin: 3,
  questionsMax: 40,
  promptMax: 800,
  explanationMax: 1_000,
  optionsMin: 2,
  optionsMax: 6,
  optionTextMax: 300,
  acceptedAnswersMin: 1,
  acceptedAnswersMax: 8,
  acceptedAnswerMax: 200,
  pointsMin: 1,
  pointsMax: 10,
  timeLimitMin: 5,
  timeLimitMax: 180,
} as const;

export type AssessmentOption = { id: string; text: string };

/** Stored in `assessment_questions.config`. */
export type AssessmentQuestionConfig = {
  options: AssessmentOption[];
  correctOptionId: string | null;
  acceptedAnswers: string[];
};

export type AssessmentQuestionSeed = {
  kind: AssessmentQuestionKind;
  prompt: string;
  explanation?: string;
  points?: number;
  options?: readonly AssessmentOption[];
  correctOptionId?: string | null;
  acceptedAnswers?: readonly string[];
};

export type AssessmentSeed = {
  title: string;
  summary: string;
  passPercent?: number;
  timeLimitMinutes?: number | null;
  questions: readonly AssessmentQuestionSeed[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function readAssessmentQuestionConfig(raw: unknown): AssessmentQuestionConfig {
  const source = isRecord(raw) ? raw : {};
  const options = Array.isArray(source.options)
    ? source.options
        .filter(isRecord)
        .map((option) => ({ id: asString(option.id), text: asString(option.text) }))
    : [];
  const correct = asString(source.correctOptionId);
  const acceptedAnswers = Array.isArray(source.acceptedAnswers)
    ? source.acceptedAnswers.filter((item): item is string => typeof item === "string")
    : [];
  return {
    options,
    correctOptionId: correct || null,
    acceptedAnswers,
  };
}

export function normalizeShortAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function shortAnswerMatches(answer: string, accepted: readonly string[]): boolean {
  const normalized = normalizeShortAnswer(answer);
  if (!normalized) return false;
  return accepted.some((item) => normalizeShortAnswer(item) === normalized);
}

export type AssessmentQuestionReadiness = {
  kind: string;
  prompt: string;
  options: readonly AssessmentOption[];
  correctOptionId: string | null;
  acceptedAnswers: readonly string[];
};

/** Problems that block submitting the course for review. Empty means ready. */
export function assessmentQuestionIssues(question: AssessmentQuestionReadiness): string[] {
  const issues: string[] = [];
  if (!question.prompt.trim()) issues.push("needs a prompt");
  if (!isAssessmentQuestionKind(question.kind)) {
    issues.push("has an unsupported type");
    return issues;
  }

  if (question.kind === "short_answer") {
    const answers = question.acceptedAnswers.map((item) => item.trim()).filter(Boolean);
    if (answers.length < ASSESSMENT_LIMITS.acceptedAnswersMin) {
      issues.push("needs at least one accepted answer");
    }
    return issues;
  }

  const filled = question.options.filter((option) => option.text.trim());
  const min = question.kind === "true_false" ? 2 : ASSESSMENT_LIMITS.optionsMin;
  const correct = question.options.find((option) => option.id === question.correctOptionId);
  if (filled.length < min || !correct?.text.trim()) {
    issues.push(
      question.kind === "true_false"
        ? "needs True and False with a correct answer"
        : "needs options and a correct answer",
    );
  }
  return issues;
}

export type AssessmentReadinessInput = {
  title: string;
  questions: readonly AssessmentQuestionReadiness[];
};

export function assessmentIssues(assessment: AssessmentReadinessInput | null | undefined): string[] {
  if (!assessment) return ["needs a final assessment"];
  const issues: string[] = [];
  if (assessment.title.trim().length < ASSESSMENT_LIMITS.titleMin) {
    issues.push(`title needs at least ${ASSESSMENT_LIMITS.titleMin} characters`);
  }
  if (assessment.questions.length < ASSESSMENT_LIMITS.questionsMin) {
    issues.push(`needs at least ${ASSESSMENT_LIMITS.questionsMin} questions`);
  }
  assessment.questions.forEach((question, index) => {
    const problem = assessmentQuestionIssues(question)[0];
    if (problem) issues.push(`question ${index + 1} ${problem}`);
  });
  return issues;
}

export function assessmentPassed(
  earnedPoints: number,
  totalPoints: number,
  passPercent: number,
): boolean {
  return quizPassed(earnedPoints, totalPoints, passPercent);
}

/** Score as a percent from weighted points. */
export function assessmentScorePercent(earnedPoints: number, totalPoints: number): number {
  if (totalPoints <= 0) return 0;
  return Math.round((earnedPoints / totalPoints) * 100);
}

export function isQuizId(value: string): boolean {
  return QUIZ_ID_PATTERN.test(value);
}

export const TRUE_FALSE_OPTIONS: readonly AssessmentOption[] = [
  { id: "true", text: "True" },
  { id: "false", text: "False" },
];

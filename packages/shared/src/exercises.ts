export const EXERCISE_KINDS = ["task", "link", "text", "quiz"] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export function isExerciseKind(value: unknown): value is ExerciseKind {
  return typeof value === "string" && (EXERCISE_KINDS as readonly string[]).includes(value);
}

export const EXERCISE_KIND_META: Record<
  ExerciseKind,
  { label: string; description: string; doneLabel: string }
> = {
  task: {
    label: "Task",
    description: "Learners do the work on their own machine, tick the requirements, and mark it complete.",
    doneLabel: "Completed",
  },
  link: {
    label: "Link submission",
    description: "Learners submit a GitHub repo, gist, or live URL as proof of their work.",
    doneLabel: "Submitted",
  },
  text: {
    label: "Written answer",
    description: "Learners answer a prompt in their own words.",
    doneLabel: "Submitted",
  },
  quiz: {
    label: "Quiz",
    description: "Multiple-choice questions, graded instantly. Learners retry until they pass.",
    doneLabel: "Passed",
  },
};

/**
 * `attempted` is a failed quiz. Only `completed` and `submitted` count as done.
 */
export const EXERCISE_SUBMISSION_STATUSES = ["completed", "submitted", "attempted"] as const;
export type ExerciseSubmissionStatus = (typeof EXERCISE_SUBMISSION_STATUSES)[number];

export function isExerciseDone(status: string | null | undefined): boolean {
  return status === "completed" || status === "submitted";
}

export const EXERCISE_COMPLETE_POINTS = 10;

export const EXERCISE_LIMITS = {
  perLessonMax: 10,
  titleMax: 120,
  instructionsMin: 40,
  instructionsMax: 20_000,
  hintMax: 2_000,
  solutionMax: 20_000,
  minutesMin: 1,
  minutesMax: 600,
  requirementsMax: 15,
  requirementMax: 200,
  questionsMax: 25,
  questionPromptMax: 500,
  optionsMin: 2,
  optionsMax: 6,
  optionTextMax: 300,
  explanationMax: 1_000,
  passPercentMin: 50,
  passPercentMax: 100,
  passPercentDefault: 80,
  urlMax: 2_000,
  noteMax: 1_000,
  answerMin: 20,
  answerMax: 10_000,
} as const;

export type QuizOption = { id: string; text: string };

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string | null;
  explanation: string;
};

/** Stored in `course_exercises.config`; fields a kind doesn't use stay empty. */
export type ExerciseConfig = {
  requirements: string[];
  questions: QuizQuestion[];
  passPercent: number;
};

export const QUIZ_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Lenient read of stored config; never throws on old or partial rows. */
export function readExerciseConfig(raw: unknown): ExerciseConfig {
  const source = isRecord(raw) ? raw : {};
  const requirements = Array.isArray(source.requirements)
    ? source.requirements.filter((item): item is string => typeof item === "string")
    : [];
  const questions = Array.isArray(source.questions)
    ? source.questions.filter(isRecord).map((question) => {
        const options = Array.isArray(question.options)
          ? question.options
              .filter(isRecord)
              .map((option) => ({ id: asString(option.id), text: asString(option.text) }))
          : [];
        const correct = asString(question.correctOptionId);
        return {
          id: asString(question.id),
          prompt: asString(question.prompt),
          options,
          correctOptionId: correct || null,
          explanation: asString(question.explanation),
        };
      })
    : [];
  const passPercent = Number(source.passPercent);
  return {
    requirements,
    questions,
    passPercent:
      Number.isInteger(passPercent) &&
      passPercent >= EXERCISE_LIMITS.passPercentMin &&
      passPercent <= EXERCISE_LIMITS.passPercentMax
        ? passPercent
        : EXERCISE_LIMITS.passPercentDefault,
  };
}

export type ExerciseReadinessInput = {
  kind: string;
  title: string;
  instructions: string;
  requirements: readonly string[];
  questions: readonly QuizQuestion[];
};

/** Problems that block submitting the course for review. Empty means ready. */
export function exerciseIssues(exercise: ExerciseReadinessInput): string[] {
  const issues: string[] = [];
  if (!exercise.title.trim()) issues.push("needs a title");
  if (exercise.kind === "quiz") {
    if (exercise.questions.length === 0) issues.push("needs at least one question");
    exercise.questions.forEach((question, index) => {
      const filled = question.options.filter((option) => option.text.trim());
      const correct = question.options.find((option) => option.id === question.correctOptionId);
      if (
        !question.prompt.trim() ||
        filled.length < EXERCISE_LIMITS.optionsMin ||
        !correct?.text.trim()
      ) {
        issues.push(`question ${index + 1} needs a prompt, two answers, and a correct answer`);
      }
    });
  } else if (exercise.instructions.trim().length < EXERCISE_LIMITS.instructionsMin) {
    issues.push(`needs at least ${EXERCISE_LIMITS.instructionsMin} characters of instructions`);
  }
  return issues;
}

export function quizPassed(correct: number, total: number, passPercent: number): boolean {
  if (total <= 0) return false;
  return (correct / total) * 100 >= passPercent;
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i.test(value);
}

export type CourseExerciseSeed = {
  kind: ExerciseKind;
  title: string;
  instructions: string;
  estimatedMinutes: number;
  hint?: string;
  solution?: string;
  requirements?: readonly string[];
  questions?: readonly QuizQuestion[];
  passPercent?: number;
};

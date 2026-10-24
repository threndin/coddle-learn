import {
  CHALLENGE_LIMITS,
  challengeValuesEqual,
  formatChallengeCall,
  isChallengeDifficulty,
  readChallengeCases,
  type ChallengeCase,
  type ChallengeDifficulty,
} from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { challengeCodeIssue, runChallengeCode } from "./challenge-runner.js";
import {
  countChallengeSolves,
  countSolvesByChallenge,
  countUserSubmissions,
  createChallengeSubmission,
  findPublishedChallenge,
  findUserSolve,
  findUsersByIds,
  latestUserSubmission,
  listChallengeBoard,
  listPublishedChallenges,
  listStandingRows,
  listUserSolves,
  readUserPoints,
  recordFirstSolve,
} from "./challenges.repository.js";

type Body = Record<string, unknown>;

export type ChallengeResultView = {
  label: string;
  hidden: boolean;
  passed: boolean;
  error: string | null;
  call: string | null;
  expectedJson: string | null;
  actualJson: string | null;
};

export type ChallengeBoardEntry = {
  rank: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  attempts: number;
  pointsAwarded: number;
  rankBonus: number;
  solvedAt: string;
  you: boolean;
};

export type ChallengeStanding = {
  rank: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  challengePoints: number;
  solvedCount: number;
  you: boolean;
};

type StoredResult = {
  label?: unknown;
  hidden?: unknown;
  passed?: unknown;
  error?: unknown;
  call?: unknown;
  expectedJson?: unknown;
  actualJson?: unknown;
};

function asBody(input: unknown): Body {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "invalid_submission", "Send your solution as code.");
  }
  return input as Body;
}

function difficultyOf(value: string): ChallengeDifficulty {
  return isChallengeDifficulty(value) ? value : "easy";
}

function jsonText(value: unknown): string | null {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === "string" ? encoded : null;
  } catch {
    return null;
  }
}

function readStoredResults(raw: unknown): ChallengeResultView[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is StoredResult => Boolean(item) && typeof item === "object").map(
    (item) => ({
      label: typeof item.label === "string" ? item.label : "Test",
      hidden: item.hidden === true,
      passed: item.passed === true,
      error: typeof item.error === "string" ? item.error : null,
      call: typeof item.call === "string" ? item.call : null,
      expectedJson: typeof item.expectedJson === "string" ? item.expectedJson : null,
      actualJson: typeof item.actualJson === "string" ? item.actualJson : null,
    }),
  );
}

function toPublicResults(
  functionName: string,
  examples: ChallengeCase[],
  outcomes: { error: string | null; actualJson: string | null; passed: boolean }[],
): ChallengeResultView[] {
  return outcomes.map((outcome, index) => {
    const hidden = index >= examples.length;
    const example = examples[index];
    const hiddenIndex = index - examples.length + 1;
    return {
      label: hidden ? `Hidden test ${hiddenIndex}` : `Example ${index + 1}`,
      hidden,
      passed: outcome.passed,
      error: outcome.error,
      call: hidden || !example ? null : formatChallengeCall(functionName, example.args),
      expectedJson: hidden || !example ? null : jsonText(example.expected),
      actualJson: hidden ? null : outcome.actualJson,
    };
  });
}

async function standingsFor(userId: string) {
  const [rows, solves] = await Promise.all([listStandingRows(), listUserSolves(userId)]);
  const ranked = rows
    .map((row) => ({
      userId: row.userId,
      challengePoints: row._sum.pointsAwarded ?? 0,
      solvedCount: row._count.userId,
      firstSolve: row._min.solvedAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((left, right) => {
      if (right.challengePoints !== left.challengePoints) {
        return right.challengePoints - left.challengePoints;
      }
      if (right.solvedCount !== left.solvedCount) return right.solvedCount - left.solvedCount;
      if (left.firstSolve !== right.firstSolve) return left.firstSolve - right.firstSolve;
      return left.userId.localeCompare(right.userId);
    });

  const youIndex = ranked.findIndex((row) => row.userId === userId);
  const youRow = youIndex >= 0 ? ranked[youIndex] : null;
  const visible = ranked.slice(0, CHALLENGE_LIMITS.standingsLimit);
  const users = await findUsersByIds(visible.map((row) => row.userId));
  const byId = new Map(users.map((user) => [user.id, user]));

  const standings: ChallengeStanding[] = visible.flatMap((row, index) => {
    const user = byId.get(row.userId);
    if (!user) return [];
    return [
      {
        rank: index + 1,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        challengePoints: row.challengePoints,
        solvedCount: row.solvedCount,
        you: user.id === userId,
      },
    ];
  });

  const challengePoints = solves.reduce((total, solve) => total + solve.pointsAwarded, 0);
  return {
    standings,
    you: {
      rank: youIndex >= 0 ? youIndex + 1 : null,
      challengePoints,
      solvedCount: solves.length,
    },
  };
}

async function boardFor(userId: string, challengeId: string): Promise<ChallengeBoardEntry[]> {
  const rows = await listChallengeBoard(challengeId, CHALLENGE_LIMITS.boardLimit);
  return rows.map((row) => ({
    rank: row.rank,
    username: row.user.username,
    name: row.user.name,
    avatarUrl: row.user.avatarUrl,
    attempts: row.attempts,
    pointsAwarded: row.pointsAwarded,
    rankBonus: row.rankBonus,
    solvedAt: row.solvedAt.toISOString(),
    you: row.userId === userId,
  }));
}

export async function getChallengeCatalog(userId: string) {
  const [challenges, counts, solves, arena] = await Promise.all([
    listPublishedChallenges(),
    countSolvesByChallenge(),
    listUserSolves(userId),
    standingsFor(userId),
  ]);
  const solvers = new Map(counts.map((row) => [row.challengeId, row._count.userId]));
  const mine = new Map(solves.map((solve) => [solve.challengeId, solve]));

  return {
    challenges: challenges.map((challenge) => {
      const solve = mine.get(challenge.id);
      return {
        slug: challenge.slug,
        title: challenge.title,
        summary: challenge.summary,
        difficulty: difficultyOf(challenge.difficulty),
        language: challenge.language,
        points: challenge.points,
        functionName: challenge.functionName,
        solverCount: solvers.get(challenge.id) ?? 0,
        solved: Boolean(solve),
        solveRank: solve?.rank ?? null,
        pointsAwarded: solve?.pointsAwarded ?? null,
      };
    }),
    standings: arena.standings,
    you: arena.you,
  };
}

export async function getChallengeDetail(userId: string, slug: string) {
  const challenge = await findPublishedChallenge(slug);
  if (!challenge) {
    throw new AppError(404, "challenge_missing", "That challenge could not be found.");
  }

  const examples = readChallengeCases(challenge.examples);
  const [solve, latest, solverCount, board, attempts] = await Promise.all([
    findUserSolve(userId, challenge.id),
    latestUserSubmission(userId, challenge.id),
    countChallengeSolves(challenge.id),
    boardFor(userId, challenge.id),
    countUserSubmissions(userId, challenge.id),
  ]);

  return {
    slug: challenge.slug,
    title: challenge.title,
    summary: challenge.summary,
    statement: challenge.statement,
    difficulty: difficultyOf(challenge.difficulty),
    language: challenge.language,
    points: challenge.points,
    functionName: challenge.functionName,
    starterCode: challenge.starterCode,
    examples: examples.map((example) => ({
      call: formatChallengeCall(challenge.functionName, example.args),
      expectedJson: jsonText(example.expected),
    })),
    solverCount,
    you: {
      solved: Boolean(solve),
      rank: solve?.rank ?? null,
      pointsAwarded: solve?.pointsAwarded ?? 0,
      rankBonus: solve?.rankBonus ?? 0,
      attempts: solve?.attempts ?? attempts,
    },
    board,
    latest: latest
      ? {
          code: latest.code,
          status: latest.status === "passed" ? "passed" : "failed",
          testsPassed: latest.testsPassed,
          testsTotal: latest.testsTotal,
          createdAt: latest.createdAt.toISOString(),
          error: latest.runtimeError,
          results: readStoredResults(latest.results),
        }
      : null,
  };
}

export async function submitChallengeSolution(userId: string, slug: string, input: unknown) {
  const body = asBody(input);
  const code = body.code;
  if (typeof code !== "string") {
    throw new AppError(400, "invalid_submission", "Write a function before submitting.", {
      field: "code",
    });
  }
  const issue = challengeCodeIssue(code);
  if (issue) {
    throw new AppError(400, "invalid_submission", issue, { field: "code" });
  }

  const challenge = await findPublishedChallenge(slug);
  if (!challenge) {
    throw new AppError(404, "challenge_missing", "That challenge could not be found.");
  }

  const examples = readChallengeCases(challenge.examples);
  const hidden = readChallengeCases(challenge.tests);
  const cases = [...examples, ...hidden];
  if (cases.length === 0) {
    throw new AppError(409, "challenge_unready", "This challenge has no tests yet.");
  }

  const [attempts, latest, existingSolve] = await Promise.all([
    countUserSubmissions(userId, challenge.id),
    latestUserSubmission(userId, challenge.id),
    findUserSolve(userId, challenge.id),
  ]);

  if (attempts >= CHALLENGE_LIMITS.submissionsPerChallenge) {
    throw new AppError(
      409,
      "challenge_limit",
      "You've reached the submission limit for this challenge.",
    );
  }
  if (
    latest &&
    Date.now() - latest.createdAt.getTime() < CHALLENGE_LIMITS.minSubmitIntervalMs
  ) {
    throw new AppError(429, "challenge_slow_down", "Wait a second before submitting again.");
  }

  const run = await runChallengeCode({
    code,
    functionName: challenge.functionName,
    cases: cases.map((item) => ({ args: item.args })),
  });

  let runtimeError: string | null = null;
  let outcomes: { error: string | null; actualJson: string | null; passed: boolean }[] = [];

  if (!run.ok) {
    runtimeError = run.error;
  } else if (run.cases.length !== cases.length) {
    runtimeError = "The checker could not run your solution. Try again.";
  } else {
    outcomes = run.cases.map((result, index) => {
      if (result.error || result.actualJson == null) {
        return {
          error: result.error ?? "That test failed.",
          actualJson: null,
          passed: false,
        };
      }
      try {
        const actual = JSON.parse(result.actualJson) as unknown;
        return {
          error: null,
          actualJson: result.actualJson,
          passed: challengeValuesEqual(actual, cases[index]?.expected),
        };
      } catch {
        return {
          error: "That test returned a value the checker could not read.",
          actualJson: null,
          passed: false,
        };
      }
    });
  }

  const results = toPublicResults(challenge.functionName, examples, outcomes);
  const testsPassed = results.filter((result) => result.passed).length;
  const passed = runtimeError == null && testsPassed === cases.length && cases.length > 0;

  const submission = await createChallengeSubmission({
    userId,
    challengeId: challenge.id,
    code,
    status: passed ? "passed" : "failed",
    testsPassed,
    testsTotal: cases.length,
    runtimeError,
    results,
  });

  let pointsAwarded = 0;
  if (passed && !existingSolve) {
    const awarded = await recordFirstSolve({
      userId,
      challengeId: challenge.id,
      submissionId: submission.id,
      basePoints: challenge.points,
    });
    if (awarded.created) pointsAwarded = awarded.pointsAwarded;
  }

  const [user, solverCount, board, solve] = await Promise.all([
    readUserPoints(userId),
    countChallengeSolves(challenge.id),
    boardFor(userId, challenge.id),
    findUserSolve(userId, challenge.id),
  ]);

  return {
    status: passed ? "passed" : "failed",
    testsPassed,
    testsTotal: cases.length,
    results,
    error: runtimeError,
    pointsAwarded,
    rank: solve?.rank ?? null,
    rankBonus: solve?.rankBonus ?? 0,
    basePoints: challenge.points,
    alreadySolved: Boolean(solve) && pointsAwarded === 0,
    attempts: solve?.attempts ?? attempts + 1,
    userPoints: user?.points ?? 0,
    solverCount,
    board,
  };
}

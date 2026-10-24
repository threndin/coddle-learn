import type { ChallengeDifficulty } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

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

export type ChallengeListItem = {
  slug: string;
  title: string;
  summary: string;
  difficulty: ChallengeDifficulty;
  language: string;
  points: number;
  functionName: string;
  solverCount: number;
  solved: boolean;
  solveRank: number | null;
  pointsAwarded: number | null;
};

export type ChallengeCatalog = {
  challenges: ChallengeListItem[];
  standings: ChallengeStanding[];
  you: {
    rank: number | null;
    challengePoints: number;
    solvedCount: number;
  };
};

export type ChallengeDetail = {
  slug: string;
  title: string;
  summary: string;
  statement: string;
  difficulty: ChallengeDifficulty;
  language: string;
  points: number;
  functionName: string;
  starterCode: string;
  examples: { call: string; expectedJson: string | null }[];
  solverCount: number;
  you: {
    solved: boolean;
    rank: number | null;
    pointsAwarded: number;
    rankBonus: number;
    attempts: number;
  };
  board: ChallengeBoardEntry[];
  latest: {
    code: string;
    status: "passed" | "failed";
    testsPassed: number;
    testsTotal: number;
    createdAt: string;
    error: string | null;
    results: ChallengeResultView[];
  } | null;
};

export type ChallengeSubmitResult = {
  status: "passed" | "failed";
  testsPassed: number;
  testsTotal: number;
  results: ChallengeResultView[];
  error: string | null;
  pointsAwarded: number;
  rank: number | null;
  rankBonus: number;
  basePoints: number;
  alreadySolved: boolean;
  attempts: number;
  userPoints: number;
  solverCount: number;
  board: ChallengeBoardEntry[];
};

export function fetchChallengeCatalog() {
  return apiRequest<ChallengeCatalog>("/challenges");
}

export function submitChallenge(slug: string, code: string) {
  return apiRequest<ChallengeSubmitResult>(
    `/challenges/${encodeURIComponent(slug)}/submissions`,
    { method: "POST", json: { code } },
  );
}

export function formatChallengeAgo(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

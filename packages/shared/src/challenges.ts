export const CHALLENGE_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type ChallengeDifficulty = (typeof CHALLENGE_DIFFICULTIES)[number];

export const CHALLENGE_SOLVE_POINT_REASON = "challenge_solve";

export const CHALLENGE_LIMITS = {
  codeMax: 12_000,
  submissionsPerChallenge: 80,
  standingsLimit: 12,
  boardLimit: 15,
  minSubmitIntervalMs: 1_000,
  resultJsonMax: 4_000,
  errorMax: 240,
} as const;

export const CHALLENGE_DIFFICULTY_META: Record<
  ChallengeDifficulty,
  { label: string; hint: string }
> = {
  easy: { label: "Easy", hint: "A short function with a clear rule." },
  medium: { label: "Medium", hint: "A few cases and a bit of bookkeeping." },
  hard: { label: "Hard", hint: "Needs a plan, not just the first loop." },
};

export function isChallengeDifficulty(value: unknown): value is ChallengeDifficulty {
  return (
    typeof value === "string" &&
    (CHALLENGE_DIFFICULTIES as readonly string[]).includes(value)
  );
}

/**
 * Bonus locked in when you become the Nth person to solve a challenge.
 * Later solves keep the base points only.
 */
export function challengeRankBonus(rank: number): number {
  if (rank === 1) return 50;
  if (rank === 2) return 30;
  if (rank === 3) return 20;
  if (rank >= 4 && rank <= 10) return 10;
  return 0;
}

export type ChallengeCase = {
  args: unknown[];
  expected: unknown;
};

export function readChallengeCases(raw: unknown): ChallengeCase[] {
  if (!Array.isArray(raw)) return [];
  const cases: ChallengeCase[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (!Array.isArray(row.args) || !Object.prototype.hasOwnProperty.call(row, "expected")) {
      continue;
    }
    cases.push({ args: row.args, expected: row.expected });
  }
  return cases;
}

export function formatChallengeCall(functionName: string, args: unknown[]): string {
  return `${functionName}(${args.map((arg) => JSON.stringify(arg)).join(", ")})`;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = canonicalize(record[key]);
    }
    return sorted;
  }
  return value;
}

/** Order-insensitive object comparison. Array order still matters. */
export function challengeValuesEqual(actual: unknown, expected: unknown): boolean {
  try {
    return JSON.stringify(canonicalize(actual)) === JSON.stringify(canonicalize(expected));
  } catch {
    return false;
  }
}

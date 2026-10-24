import { CHALLENGE_DIFFICULTY_META, type ChallengeDifficulty } from "@coddle/shared";

const STYLES: Record<ChallengeDifficulty, string> = {
  easy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  medium: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
  hard: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

export function DifficultyBadge({ difficulty }: { difficulty: ChallengeDifficulty }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STYLES[difficulty]}`}>
      {CHALLENGE_DIFFICULTY_META[difficulty].label}
    </span>
  );
}

export function languageLabel(language: string): string {
  if (language === "javascript") return "JavaScript";
  return language;
}

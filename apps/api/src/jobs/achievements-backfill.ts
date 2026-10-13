import { backfillAchievementsForAllUsers } from "../features/achievements/achievements.service.js";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 15_000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function runOnce(reason: string, reset = false) {
  if (running) {
    console.log(`[achievements-backfill] skipped (${reason}): already running`);
    return;
  }
  running = true;
  const started = Date.now();
  try {
    const result = await backfillAchievementsForAllUsers({ reset });
    console.log(
      `[achievements-backfill] ${reason}: cleared ${result.cleared}, awarded ${result.awarded}, updated ${result.updated} across ${result.users} users in ${Date.now() - started}ms`,
    );
  } catch (error) {
    console.error(`[achievements-backfill] ${reason} failed`, error);
  } finally {
    running = false;
  }
}

/**
 * Awards achievements to existing users who already qualify.
 * Runs shortly after boot, then on a fixed interval.
 */
export function startAchievementsBackfillJob(intervalMs = DEFAULT_INTERVAL_MS) {
  if (timer) return;

  const startup = setTimeout(() => {
    void runOnce("startup");
  }, STARTUP_DELAY_MS);
  startup.unref?.();

  timer = setInterval(() => {
    void runOnce("interval");
  }, intervalMs);
  timer.unref?.();

  console.log(
    `[achievements-backfill] scheduled (startup in ${STARTUP_DELAY_MS}ms, then every ${intervalMs}ms)`,
  );
}

/** CLI entry: `pnpm --filter @coddle/api achievements:backfill` (add `-- --reset` to clear first). */
async function main() {
  const reset = process.argv.includes("--reset");
  await runOnce(reset ? "cli-reset" : "cli", reset);
  process.exit(0);
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("achievements-backfill.ts") ||
    process.argv[1].endsWith("achievements-backfill.js"));

if (isDirect) {
  void main();
}

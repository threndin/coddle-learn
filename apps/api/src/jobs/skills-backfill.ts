import { backfillSkillGraphForAllUsers } from "../features/skills/skills.service.js";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 25_000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function runOnce(reason: string) {
  if (running) {
    console.log(`[skills-backfill] skipped (${reason}): already running`);
    return;
  }
  running = true;
  const started = Date.now();
  try {
    const result = await backfillSkillGraphForAllUsers();
    console.log(
      `[skills-backfill] ${reason}: wrote progress for ${result.progressRows} skill rows across ${result.users} users in ${Date.now() - started}ms`,
    );
  } catch (error) {
    console.error(`[skills-backfill] ${reason} failed`, error);
  } finally {
    running = false;
  }
}

/** Recomputes evidence-based skill progress for existing users. */
export function startSkillsBackfillJob(intervalMs = DEFAULT_INTERVAL_MS) {
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
    `[skills-backfill] scheduled (startup in ${STARTUP_DELAY_MS}ms, then every ${intervalMs}ms)`,
  );
}

async function main() {
  await runOnce("cli");
  process.exit(0);
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("skills-backfill.ts") ||
    process.argv[1].endsWith("skills-backfill.js"));

if (isDirect) {
  void main();
}

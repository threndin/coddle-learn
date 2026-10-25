import { backfillPointEvents } from "../features/points/points-backfill.js";

const STARTUP_DELAY_MS = 20_000;

let running = false;
let scheduled = false;

async function runOnce(reason: string) {
  if (running) {
    console.log(`[points-backfill] skipped (${reason}): already running`);
    return;
  }
  running = true;
  const started = Date.now();
  try {
    const result = await backfillPointEvents();
    console.log(
      `[points-backfill] ${reason}: inserted ${result.inserted} of ${result.scanned} missing events in ${Date.now() - started}ms`,
    );
  } catch (error) {
    console.error(`[points-backfill] ${reason} failed`, error);
  } finally {
    running = false;
  }
}

/**
 * One-shot reconstruction of UserPointEvent rows for awards that predate the ledger.
 * Runs shortly after boot. Safe to repeat — existing (reason, refType, refId) keys are skipped.
 */
export function startPointsBackfillJob() {
  if (scheduled) return;
  scheduled = true;

  const startup = setTimeout(() => {
    void runOnce("startup");
  }, STARTUP_DELAY_MS);
  startup.unref?.();

  console.log(`[points-backfill] scheduled (startup in ${STARTUP_DELAY_MS}ms)`);
}

/** CLI entry: `pnpm --filter @coddle/api points:backfill` */
async function main() {
  await runOnce("cli");
  process.exit(0);
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("points-backfill.ts") ||
    process.argv[1].endsWith("points-backfill.js"));

if (isDirect) {
  void main();
}

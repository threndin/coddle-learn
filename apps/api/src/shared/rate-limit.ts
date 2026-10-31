import { AppError } from "./errors.js";

const buckets = new Map<string, number[]>();
const MAX_KEYS = 20_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, hits] of buckets) {
    const next = hits.filter((stamp) => now - stamp < 24 * 60 * 60 * 1000);
    if (next.length === 0) buckets.delete(key);
    else buckets.set(key, next);
  }
}

/** In-process sliding window. Use for burst control on a single API instance. */
export function assertRateLimit(
  key: string,
  opts: { max: number; windowMs: number; message: string },
) {
  const now = Date.now();
  prune(now);
  const cutoff = now - opts.windowMs;
  const hits = (buckets.get(key) ?? []).filter((stamp) => stamp > cutoff);
  if (hits.length >= opts.max) {
    throw new AppError(429, "rate_limited", opts.message);
  }
  hits.push(now);
  buckets.set(key, hits);
}

export function assertUserRateLimit(
  userId: string,
  action: string,
  opts: { max: number; windowMs: number; message: string },
) {
  assertRateLimit(`${action}:${userId}`, opts);
}

/** Per-user burst + daily caps on Cloudflare R2 writes. */
export function assertR2UploadLimit(userId: string) {
  assertUserRateLimit(userId, "r2-hour", {
    max: 12,
    windowMs: 60 * 60 * 1000,
    message: "You have uploaded too many files this hour. Try again later.",
  });
  assertUserRateLimit(userId, "r2-day", {
    max: 30,
    windowMs: 24 * 60 * 60 * 1000,
    message: "Daily upload limit reached. Try again tomorrow.",
  });
}

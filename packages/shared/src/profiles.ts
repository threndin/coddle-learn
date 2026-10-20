/** Public profile usernames: lowercase letters, digits, hyphens; 3–32 chars. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "app",
  "coddle",
  "community",
  "dashboard",
  "help",
  "learn",
  "login",
  "me",
  "new",
  "null",
  "profile",
  "settings",
  "studio",
  "support",
  "tools",
  "system",
  "undefined",
  "verify",
  "www",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

export function isValidUsername(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= USERNAME_MIN &&
    value.length <= USERNAME_MAX &&
    USERNAME_PATTERN.test(value) &&
    !isReservedUsername(value)
  );
}

/** Slugify a display name into a username base (may be empty). */
export function slugifyUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, USERNAME_MAX)
    .replace(/-+$/g, "");
}

/**
 * Build a candidate username from a display name.
 * Callers must still ensure uniqueness (append suffix if taken).
 */
export function usernameFromName(name: string, fallback = "learner"): string {
  const base = slugifyUsername(name);
  if (base.length >= USERNAME_MIN && !isReservedUsername(base)) {
    return base.slice(0, USERNAME_MAX);
  }
  if (base.length > 0 && base.length < USERNAME_MIN) {
    const padded = `${base}-user`;
    return padded.slice(0, USERNAME_MAX);
  }
  return fallback;
}

/** Canonical public profile path. */
export function profilePath(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

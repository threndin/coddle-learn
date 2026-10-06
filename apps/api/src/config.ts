function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === "production";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3002",
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://coddle:coddle@localhost:5432/coddle_learn",
  ),
  jwtSecret: required("JWT_SECRET", "dev-learn-jwt-secret-change-me"),
  jwtExpiryHours: Number(process.env.JWT_EXPIRY_HOURS ?? 24),
  coddleAppUrl: (process.env.CODDLE_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
  coddleApiUrl: (process.env.CODDLE_API_URL ?? "http://localhost:4002/api/v1").replace(
    /\/$/,
    "",
  ),
  learnSsoClientId: process.env.LEARN_SSO_CLIENT_ID ?? "coddle-learn",
  learnSsoClientSecret: required(
    "LEARN_SSO_CLIENT_SECRET",
    "dev-learn-sso-secret-change-me",
  ),
  cookieSecure: process.env.COOKIE_SECURE === "true" || isProd,
  isProd,
  seedCourseCreatorEmail:
    process.env.SEED_COURSE_CREATOR_EMAIL ?? "kvngjohnny10@gmail.com",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "coddle",
    endpoint: (process.env.R2_ENDPOINT ?? "").replace(/\/$/, ""),
    publicUrl: (process.env.R2_PUBLIC_URL ?? "https://cdn.coddle.dev").replace(
      /\/$/,
      "",
    ),
    /** All Learn objects live under this prefix in the shared bucket. */
    keyPrefix: "coddle-learn",
  },
} as const;

export function isR2Configured(): boolean {
  return Boolean(
    config.r2.accountId &&
      config.r2.accessKeyId &&
      config.r2.secretAccessKey &&
      config.r2.endpoint &&
      config.r2.bucket,
  );
}

if (
  config.isProd &&
  (config.jwtSecret === "dev-learn-jwt-secret-change-me" ||
    config.learnSsoClientSecret === "dev-learn-sso-secret-change-me")
) {
  throw new Error("Refusing to start with default JWT/SSO secrets in production");
}

export const COOKIE = {
  session: "learn_session",
  csrf: "learn_csrf",
} as const;

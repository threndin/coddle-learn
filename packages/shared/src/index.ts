export type ApiHealth = {
  status: "ok" | "degraded";
  service: "coddle-learn-api";
  timestamp: string;
};

export const APP_NAME = "Coddle Learn";
export const APP_TAGLINE = "Learn, Build, Share, Grow.";

export * from "./onboarding.js";
export * from "./roadmaps.js";
export * from "./courses.js";
export * from "./course-studio.js";

/** Public repository URL. Empty until the remote exists. */
export const GITHUB_URL = "https://github.com/threndin/coddle-learn";

export type ApiHealth = {
  status: "ok" | "degraded";
  service: "coddle-learn-api";
  timestamp: string;
};

export const APP_NAME = "Coddle Learn";
export const APP_TAGLINE = "Learn, Build, Share, Grow.";

export * from "./onboarding.js";
export * from "./roadmaps.js";
export * from "./resources.js";
export * from "./starter-resources.js";
export * from "./courses.js";
export * from "./course-studio.js";
export * from "./exercises.js";
export * from "./starter-exercises.js";
export * from "./assessments.js";
export * from "./starter-assessments.js";
export * from "./projects.js";
export * from "./starter-projects.js";
export * from "./credentials.js";
export * from "./achievements.js";

/** Public repository URL. Empty until the remote exists. */
export const GITHUB_URL = "https://github.com/threndin/coddle-learn";

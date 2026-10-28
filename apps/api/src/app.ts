import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { achievementsRouter } from "./features/achievements/achievements.routes.js";
import { challengesRouter } from "./features/challenges/challenges.routes.js";
import { assessmentsRouter } from "./features/assessments/assessments.routes.js";
import { authRouter } from "./features/auth/auth.routes.js";
import { communityRouter } from "./features/community/community.routes.js";
import {
  credentialsRouter,
  verifyRouter,
} from "./features/credentials/credentials.routes.js";
import { coursesRouter } from "./features/courses/courses.routes.js";
import { healthRouter } from "./features/health/health.routes.js";
import { leaderboardRouter } from "./features/leaderboard/leaderboard.routes.js";
import { mentorsRouter } from "./features/mentors/mentors.routes.js";
import { notificationsRouter } from "./features/notifications/notifications.routes.js";
import { onboardingRouter } from "./features/onboarding/onboarding.routes.js";
import { profilesRouter } from "./features/profiles/profiles.routes.js";
import { projectsRouter } from "./features/projects/projects.routes.js";
import { studioProjectsRouter } from "./features/projects/studio-projects.routes.js";
import { resourcesRouter } from "./features/resources/resources.routes.js";
import { toolsRouter } from "./features/tools/tools.routes.js";
import { roadmapsRouter } from "./features/roadmaps/roadmaps.routes.js";
import { skillsRouter } from "./features/skills/skills.routes.js";
import { reviewersRouter } from "./features/reviewers/reviewers.routes.js";
import { settingsRouter } from "./features/settings/settings.routes.js";
import { studioRouter } from "./features/studio/studio.routes.js";
import { errorHandler } from "./shared/http/error-handler.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true,
    }),
  );
  // Lesson markdown can reach ~60k characters.
  app.use(express.json({ limit: "512kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(morgan(config.isProd ? "combined" : "dev"));

  app.use(healthRouter);
  app.use("/auth", authRouter);
  app.use("/onboarding", onboardingRouter);
  app.use("/roadmaps", roadmapsRouter);
  app.use("/courses", coursesRouter);
  app.use("/resources", resourcesRouter);
  app.use("/tools", toolsRouter);
  app.use("/assessments", assessmentsRouter);
  app.use("/challenges", challengesRouter);
  app.use("/projects", projectsRouter);
  app.use("/credentials", credentialsRouter);
  app.use("/achievements", achievementsRouter);
  app.use("/skills", skillsRouter);
  app.use("/community", communityRouter);
  app.use("/leaderboard", leaderboardRouter);
  app.use("/mentors", mentorsRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/profiles", profilesRouter);
  app.use("/settings", settingsRouter);
  app.use("/verify", verifyRouter);
  app.use("/studio/projects", studioProjectsRouter);
  app.use("/studio", studioRouter);
  app.use("/reviewers", reviewersRouter);

  app.use(errorHandler);

  return app;
}

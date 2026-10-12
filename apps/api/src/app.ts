import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { assessmentsRouter } from "./features/assessments/assessments.routes.js";
import { authRouter } from "./features/auth/auth.routes.js";
import {
  credentialsRouter,
  verifyRouter,
} from "./features/credentials/credentials.routes.js";
import { coursesRouter } from "./features/courses/courses.routes.js";
import { healthRouter } from "./features/health/health.routes.js";
import { onboardingRouter } from "./features/onboarding/onboarding.routes.js";
import { projectsRouter } from "./features/projects/projects.routes.js";
import { studioProjectsRouter } from "./features/projects/studio-projects.routes.js";
import { resourcesRouter } from "./features/resources/resources.routes.js";
import { roadmapsRouter } from "./features/roadmaps/roadmaps.routes.js";
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
  app.use("/assessments", assessmentsRouter);
  app.use("/projects", projectsRouter);
  app.use("/credentials", credentialsRouter);
  app.use("/verify", verifyRouter);
  app.use("/studio/projects", studioProjectsRouter);
  app.use("/studio", studioRouter);

  app.use(errorHandler);

  return app;
}

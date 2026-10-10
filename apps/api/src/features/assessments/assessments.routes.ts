import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  getAssessmentHandler,
  getAttemptHandler,
  listAssessmentsHandler,
  startAttemptHandler,
  submitAttemptHandler,
} from "./assessments.controller.js";

export const assessmentsRouter: Router = Router();

assessmentsRouter.get("/", requireAuth, asyncHandler(listAssessmentsHandler));
assessmentsRouter.get("/:id", requireAuth, asyncHandler(getAssessmentHandler));
assessmentsRouter.post(
  "/:id/attempts",
  requireAuth,
  requireCsrf,
  asyncHandler(startAttemptHandler),
);
assessmentsRouter.get(
  "/:id/attempts/:attemptId",
  requireAuth,
  asyncHandler(getAttemptHandler),
);
assessmentsRouter.post(
  "/:id/attempts/:attemptId/submit",
  requireAuth,
  requireCsrf,
  asyncHandler(submitAttemptHandler),
);

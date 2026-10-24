import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  getChallengeHandler,
  listChallengesHandler,
  submitChallengeHandler,
} from "./challenges.controller.js";

export const challengesRouter: Router = Router();

challengesRouter.get("/", requireAuth, asyncHandler(listChallengesHandler));
challengesRouter.get("/:slug", requireAuth, asyncHandler(getChallengeHandler));
challengesRouter.post(
  "/:slug/submissions",
  requireAuth,
  requireCsrf,
  asyncHandler(submitChallengeHandler),
);

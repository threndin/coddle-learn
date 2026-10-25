import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { listHandler } from "./leaderboard.controller.js";

export const leaderboardRouter: Router = Router();

leaderboardRouter.get("/", requireAuth, asyncHandler(listHandler));

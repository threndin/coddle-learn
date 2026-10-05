import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  bookmarkHandler,
  getContinueHandler,
  getRoadmapHandler,
  listRoadmapsHandler,
  primaryRoadmapHandler,
  startRoadmapHandler,
  updateProgressHandler,
} from "./roadmaps.controller.js";

export const roadmapsRouter: Router = Router();

roadmapsRouter.get("/", requireAuth, asyncHandler(listRoadmapsHandler));
roadmapsRouter.get("/continue", requireAuth, asyncHandler(getContinueHandler));
roadmapsRouter.get("/:slug", requireAuth, asyncHandler(getRoadmapHandler));
roadmapsRouter.post("/:slug/start", requireAuth, requireCsrf, asyncHandler(startRoadmapHandler));
roadmapsRouter.post(
  "/:slug/primary",
  requireAuth,
  requireCsrf,
  asyncHandler(primaryRoadmapHandler),
);
roadmapsRouter.post(
  "/:slug/progress",
  requireAuth,
  requireCsrf,
  asyncHandler(updateProgressHandler),
);
roadmapsRouter.post(
  "/:slug/bookmarks",
  requireAuth,
  requireCsrf,
  asyncHandler(bookmarkHandler),
);

import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  deleteReviewHandler,
  getContinueHandler,
  getCourseHandler,
  listCoursesHandler,
  listReviewsHandler,
  saveReviewHandler,
  startCourseHandler,
  updateProgressHandler,
} from "./courses.controller.js";

export const coursesRouter: Router = Router();

coursesRouter.get("/", requireAuth, asyncHandler(listCoursesHandler));
coursesRouter.get("/continue", requireAuth, asyncHandler(getContinueHandler));
coursesRouter.get("/:slug", requireAuth, asyncHandler(getCourseHandler));
coursesRouter.post("/:slug/start", requireAuth, requireCsrf, asyncHandler(startCourseHandler));
coursesRouter.post(
  "/:slug/progress",
  requireAuth,
  requireCsrf,
  asyncHandler(updateProgressHandler),
);
coursesRouter.get("/:slug/reviews", requireAuth, asyncHandler(listReviewsHandler));
coursesRouter.put("/:slug/reviews", requireAuth, requireCsrf, asyncHandler(saveReviewHandler));
coursesRouter.delete(
  "/:slug/reviews",
  requireAuth,
  requireCsrf,
  asyncHandler(deleteReviewHandler),
);

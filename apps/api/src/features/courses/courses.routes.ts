import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  getContinueHandler,
  getCourseHandler,
  listCoursesHandler,
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

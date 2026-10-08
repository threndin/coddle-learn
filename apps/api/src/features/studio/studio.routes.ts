import express, { Router } from "express";
import { COURSE_IMAGE_TYPES, COURSE_LIMITS } from "@coddle/shared";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  archiveHandler,
  createExerciseHandler,
  createHandler,
  createLessonHandler,
  createModuleHandler,
  deleteExerciseHandler,
  deleteHandler,
  deleteLessonHandler,
  deleteModuleHandler,
  getHandler,
  listHandler,
  outlineHandler,
  reorderExercisesHandler,
  resetThumbnailHandler,
  restoreHandler,
  submitHandler,
  updateExerciseHandler,
  updateHandler,
  updateLessonHandler,
  updateModuleHandler,
  uploadAssetHandler,
  uploadThumbnailHandler,
  withdrawHandler,
} from "./studio.controller.js";

export const studioRouter: Router = Router();

const rawImage = (limit: number) =>
  express.raw({ type: [...COURSE_IMAGE_TYPES], limit: limit + 1024 });

const write = [requireAuth, requireCsrf] as const;

studioRouter.get("/courses", requireAuth, asyncHandler(listHandler));
studioRouter.post("/courses", ...write, asyncHandler(createHandler));
studioRouter.get("/courses/:courseId", requireAuth, asyncHandler(getHandler));
studioRouter.patch("/courses/:courseId", ...write, asyncHandler(updateHandler));
studioRouter.delete("/courses/:courseId", ...write, asyncHandler(deleteHandler));

studioRouter.post("/courses/:courseId/submit", ...write, asyncHandler(submitHandler));
studioRouter.post("/courses/:courseId/withdraw", ...write, asyncHandler(withdrawHandler));
studioRouter.post("/courses/:courseId/archive", ...write, asyncHandler(archiveHandler));
studioRouter.post("/courses/:courseId/restore", ...write, asyncHandler(restoreHandler));

studioRouter.put(
  "/courses/:courseId/thumbnail",
  ...write,
  rawImage(COURSE_LIMITS.thumbnailBytesMax),
  asyncHandler(uploadThumbnailHandler),
);
studioRouter.delete("/courses/:courseId/thumbnail", ...write, asyncHandler(resetThumbnailHandler));
studioRouter.post(
  "/courses/:courseId/assets",
  ...write,
  rawImage(COURSE_LIMITS.assetBytesMax),
  asyncHandler(uploadAssetHandler),
);

studioRouter.put("/courses/:courseId/outline", ...write, asyncHandler(outlineHandler));

studioRouter.post("/courses/:courseId/modules", ...write, asyncHandler(createModuleHandler));
studioRouter.patch(
  "/courses/:courseId/modules/:moduleId",
  ...write,
  asyncHandler(updateModuleHandler),
);
studioRouter.delete(
  "/courses/:courseId/modules/:moduleId",
  ...write,
  asyncHandler(deleteModuleHandler),
);
studioRouter.post(
  "/courses/:courseId/modules/:moduleId/lessons",
  ...write,
  asyncHandler(createLessonHandler),
);
studioRouter.patch(
  "/courses/:courseId/lessons/:lessonId",
  ...write,
  asyncHandler(updateLessonHandler),
);
studioRouter.delete(
  "/courses/:courseId/lessons/:lessonId",
  ...write,
  asyncHandler(deleteLessonHandler),
);
studioRouter.post(
  "/courses/:courseId/lessons/:lessonId/exercises",
  ...write,
  asyncHandler(createExerciseHandler),
);
studioRouter.put(
  "/courses/:courseId/lessons/:lessonId/exercises/order",
  ...write,
  asyncHandler(reorderExercisesHandler),
);
studioRouter.patch(
  "/courses/:courseId/exercises/:exerciseId",
  ...write,
  asyncHandler(updateExerciseHandler),
);
studioRouter.delete(
  "/courses/:courseId/exercises/:exerciseId",
  ...write,
  asyncHandler(deleteExerciseHandler),
);

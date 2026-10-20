import express, { Router } from "express";
import { TOOL_IMAGE_TYPES, TOOL_LIMITS } from "@coddle/shared";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  deleteToolHandler,
  getToolHandler,
  listToolsHandler,
  removeBookmarkHandler,
  saveBookmarkHandler,
  submitToolHandler,
  uploadImageHandler,
} from "./tools.controller.js";

export const toolsRouter: Router = Router();

const rawImage = express.raw({
  type: [...TOOL_IMAGE_TYPES],
  limit: TOOL_LIMITS.imageBytesMax + 1024,
});

toolsRouter.get("/", requireAuth, asyncHandler(listToolsHandler));
toolsRouter.post("/", requireAuth, requireCsrf, asyncHandler(submitToolHandler));
toolsRouter.post(
  "/images",
  requireAuth,
  requireCsrf,
  rawImage,
  asyncHandler(uploadImageHandler),
);
toolsRouter.get("/:slug", requireAuth, asyncHandler(getToolHandler));
toolsRouter.delete("/:id", requireAuth, requireCsrf, asyncHandler(deleteToolHandler));
toolsRouter.put(
  "/:id/bookmark",
  requireAuth,
  requireCsrf,
  asyncHandler(saveBookmarkHandler),
);
toolsRouter.delete(
  "/:id/bookmark",
  requireAuth,
  requireCsrf,
  asyncHandler(removeBookmarkHandler),
);

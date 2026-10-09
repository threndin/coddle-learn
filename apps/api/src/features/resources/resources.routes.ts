import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  deleteResourceHandler,
  listResourcesHandler,
  removeBookmarkHandler,
  saveBookmarkHandler,
  submitResourceHandler,
} from "./resources.controller.js";

export const resourcesRouter: Router = Router();

resourcesRouter.get("/", requireAuth, asyncHandler(listResourcesHandler));
resourcesRouter.post("/", requireAuth, requireCsrf, asyncHandler(submitResourceHandler));
resourcesRouter.delete("/:id", requireAuth, requireCsrf, asyncHandler(deleteResourceHandler));
resourcesRouter.put(
  "/:id/bookmark",
  requireAuth,
  requireCsrf,
  asyncHandler(saveBookmarkHandler),
);
resourcesRouter.delete(
  "/:id/bookmark",
  requireAuth,
  requireCsrf,
  asyncHandler(removeBookmarkHandler),
);

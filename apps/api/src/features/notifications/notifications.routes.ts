import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  listHandler,
  readAllHandler,
  readHandler,
  unreadCountHandler,
} from "./notifications.controller.js";

export const notificationsRouter: Router = Router();

notificationsRouter.get("/", requireAuth, asyncHandler(listHandler));
notificationsRouter.get("/unread-count", requireAuth, asyncHandler(unreadCountHandler));
notificationsRouter.post("/read-all", requireAuth, requireCsrf, asyncHandler(readAllHandler));
notificationsRouter.post("/:id/read", requireAuth, requireCsrf, asyncHandler(readHandler));

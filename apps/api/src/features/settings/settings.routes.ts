import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import { updateMeHandler } from "./settings.controller.js";

export const settingsRouter: Router = Router();

settingsRouter.patch("/", requireAuth, requireCsrf, asyncHandler(updateMeHandler));

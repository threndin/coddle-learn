import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { getHandler, listHandler } from "./achievements.controller.js";

export const achievementsRouter: Router = Router();

achievementsRouter.get("/", requireAuth, asyncHandler(listHandler));
achievementsRouter.get("/:slug", requireAuth, asyncHandler(getHandler));

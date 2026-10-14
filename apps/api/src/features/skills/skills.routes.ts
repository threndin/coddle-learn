import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { getHandler, listHandler } from "./skills.controller.js";

export const skillsRouter: Router = Router();

skillsRouter.get("/", requireAuth, asyncHandler(listHandler));
skillsRouter.get("/:slug", requireAuth, asyncHandler(getHandler));

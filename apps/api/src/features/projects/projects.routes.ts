import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  getHandler,
  listHandler,
  mineHandler,
  startHandler,
  submitHandler,
} from "./projects.controller.js";

export const projectsRouter: Router = Router();

const write = [requireAuth, requireCsrf] as const;

projectsRouter.get("/", requireAuth, asyncHandler(listHandler));
projectsRouter.get("/mine", requireAuth, asyncHandler(mineHandler));
projectsRouter.get("/:slug", requireAuth, asyncHandler(getHandler));
projectsRouter.post("/:slug/start", ...write, asyncHandler(startHandler));
projectsRouter.post("/:slug/submit", ...write, asyncHandler(submitHandler));

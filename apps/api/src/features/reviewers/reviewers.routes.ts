import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf, requireReviewer } from "../auth/auth.middleware.js";
import { decideHandler, listQueueHandler } from "./reviewers.controller.js";

export const reviewersRouter: Router = Router();

const gate = [requireAuth, requireReviewer] as const;
const write = [requireAuth, requireReviewer, requireCsrf] as const;

reviewersRouter.get("/queue", ...gate, asyncHandler(listQueueHandler));
reviewersRouter.post("/:kind/:id/:action", ...write, asyncHandler(decideHandler));

import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { activityHandler } from "./points.controller.js";

export const pointsRouter: Router = Router();

pointsRouter.get("/activity", requireAuth, asyncHandler(activityHandler));

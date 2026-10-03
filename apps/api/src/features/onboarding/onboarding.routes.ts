import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import { submitOnboarding } from "./onboarding.controller.js";

export const onboardingRouter: Router = Router();

onboardingRouter.post("/", requireAuth, requireCsrf, asyncHandler(submitOnboarding));

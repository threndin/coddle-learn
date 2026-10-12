import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { finishCoddle, logout, me, refresh, startCoddle } from "./auth.controller.js";
import { optionalAuth, requireAuth, requireCsrf } from "./auth.middleware.js";

export const authRouter: Router = Router();

authRouter.get("/coddle/start", asyncHandler(startCoddle));
authRouter.post("/coddle/finish", asyncHandler(finishCoddle));
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.post("/refresh", requireCsrf, asyncHandler(refresh));
authRouter.post("/logout", optionalAuth, requireCsrf, asyncHandler(logout));

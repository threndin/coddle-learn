import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { finishCoddle, logout, me, startCoddle } from "./auth.controller.js";
import { requireAuth, requireCsrf } from "./auth.middleware.js";

export const authRouter: Router = Router();

authRouter.get("/coddle/start", asyncHandler(startCoddle));
authRouter.post("/coddle/finish", asyncHandler(finishCoddle));
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.post("/logout", requireAuth, requireCsrf, asyncHandler(logout));

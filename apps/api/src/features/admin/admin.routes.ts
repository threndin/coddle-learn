import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAdmin, requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  overviewHandler,
  restoreUserHandler,
  suspendUserHandler,
  usageHandler,
  usersHandler,
} from "./admin.controller.js";

export const adminRouter: Router = Router();

const gate = [requireAuth, requireAdmin] as const;
const write = [requireAuth, requireAdmin, requireCsrf] as const;

adminRouter.get("/overview", ...gate, asyncHandler(overviewHandler));
adminRouter.get("/users", ...gate, asyncHandler(usersHandler));
adminRouter.get("/usage", ...gate, asyncHandler(usageHandler));
adminRouter.post("/users/:id/suspend", ...write, asyncHandler(suspendUserHandler));
adminRouter.post("/users/:id/restore", ...write, asyncHandler(restoreUserHandler));

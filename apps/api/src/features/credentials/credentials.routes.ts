import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { getHandler, listHandler, verifyHandler } from "./credentials.controller.js";

export const credentialsRouter: Router = Router();
export const verifyRouter: Router = Router();

credentialsRouter.get("/", requireAuth, asyncHandler(listHandler));
credentialsRouter.get("/:id", requireAuth, asyncHandler(getHandler));

verifyRouter.get("/:code", asyncHandler(verifyHandler));

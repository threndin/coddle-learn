import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  assistantAskHandler,
  assistantConversationHandler,
  assistantConversationsHandler,
  assistantStatusHandler,
} from "./assistant.controller.js";

export const assistantRouter: Router = Router();

assistantRouter.get("/status", requireAuth, asyncHandler(assistantStatusHandler));
assistantRouter.get("/conversations", requireAuth, asyncHandler(assistantConversationsHandler));
assistantRouter.get("/conversations/:id", requireAuth, asyncHandler(assistantConversationHandler));
assistantRouter.post("/ask", requireAuth, requireCsrf, asyncHandler(assistantAskHandler));

import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { optionalAuth, requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  followHandler,
  followersHandler,
  followingHandler,
  getProfileHandler,
  unfollowHandler,
} from "./profiles.controller.js";

export const profilesRouter: Router = Router();

profilesRouter.get("/:username", optionalAuth, asyncHandler(getProfileHandler));
profilesRouter.get("/:username/followers", optionalAuth, asyncHandler(followersHandler));
profilesRouter.get("/:username/following", optionalAuth, asyncHandler(followingHandler));
profilesRouter.post(
  "/:username/follow",
  requireAuth,
  requireCsrf,
  asyncHandler(followHandler),
);
profilesRouter.delete(
  "/:username/follow",
  requireAuth,
  requireCsrf,
  asyncHandler(unfollowHandler),
);

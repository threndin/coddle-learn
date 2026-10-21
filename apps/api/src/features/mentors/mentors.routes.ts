import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  applyToProgramHandler,
  approveApplicationHandler,
  completeApplicationHandler,
  createMyProgramHandler,
  declineApplicationHandler,
  getMentorHandler,
  getMyMentorshipHandler,
  listMentorsHandler,
  updateMyProgramHandler,
  upsertMyMentorProfileHandler,
  withdrawApplicationHandler,
} from "./mentors.controller.js";

export const mentorsRouter: Router = Router();

mentorsRouter.get("/", requireAuth, asyncHandler(listMentorsHandler));
mentorsRouter.get("/me", requireAuth, asyncHandler(getMyMentorshipHandler));
mentorsRouter.put("/me", requireAuth, requireCsrf, asyncHandler(upsertMyMentorProfileHandler));
mentorsRouter.post("/me/programs", requireAuth, requireCsrf, asyncHandler(createMyProgramHandler));
mentorsRouter.patch(
  "/me/programs/:id",
  requireAuth,
  requireCsrf,
  asyncHandler(updateMyProgramHandler),
);
mentorsRouter.post(
  "/applications/:id/approve",
  requireAuth,
  requireCsrf,
  asyncHandler(approveApplicationHandler),
);
mentorsRouter.post(
  "/applications/:id/decline",
  requireAuth,
  requireCsrf,
  asyncHandler(declineApplicationHandler),
);
mentorsRouter.post(
  "/applications/:id/complete",
  requireAuth,
  requireCsrf,
  asyncHandler(completeApplicationHandler),
);
mentorsRouter.post(
  "/applications/:id/withdraw",
  requireAuth,
  requireCsrf,
  asyncHandler(withdrawApplicationHandler),
);
mentorsRouter.post(
  "/:username/programs/:slug/apply",
  requireAuth,
  requireCsrf,
  asyncHandler(applyToProgramHandler),
);
mentorsRouter.get("/:username", requireAuth, asyncHandler(getMentorHandler));
